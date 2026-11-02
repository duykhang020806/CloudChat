import express from 'express'
import { pool, broadcastNotification } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// 1. Lấy danh sách bạn bè đã chấp nhận kèm tin nhắn cuối
router.get('/', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id

    // Lấy danh sách bạn bè từ bảng friendships (2 chiều)
    const friendsQuery = await pool.query(
      `SELECT 
        u.id, u.username, u.display_name, u.avatar_url, u.bio, u.gender, u.dob,
        (u.is_online IS TRUE AND u.last_seen IS NOT NULL AND u.last_seen >= CURRENT_TIMESTAMP - INTERVAL '70 seconds') as is_online,
        u.last_seen, u.is_verified, f.created_at as friendship_date
       FROM friendships f
       JOIN users u ON (
         (f.user_id = $1 AND f.friend_id = u.id) OR
         (f.friend_id = $1 AND f.user_id = u.id)
       )
       WHERE f.status = 'accepted'
       ORDER BY u.display_name ASC`,
      [currentUserId]
    )

    const friends = friendsQuery.rows

    if (friends.length === 0) {
      return res.json({ friends: [] })
    }

    // Tối ưu hóa triệt để: Lấy toàn bộ tin nhắn cuối cùng chỉ bằng 1 câu truy vấn SQL (Chống N+1 DoS Query)
    const lastMsgsQuery = await pool.query(
      `SELECT DISTINCT ON (partner_id)
         id, sender_id, content, is_read, created_at,
         CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as partner_id
       FROM messages
       WHERE (sender_id = $1 OR receiver_id = $1) AND group_id IS NULL
       ORDER BY partner_id, created_at DESC`,
      [currentUserId]
    )

    const lastMsgMap = new Map()
    for (const msg of lastMsgsQuery.rows) {
      lastMsgMap.set(String(msg.partner_id), msg)
    }

    const friendsWithLastMsg = friends.map((friend) => {
      const lastMsg = lastMsgMap.get(String(friend.id))
      return {
        ...friend,
        last_message: lastMsg ? lastMsg.content : null,
        last_message_time: lastMsg ? lastMsg.created_at : null,
        last_message_sender_id: lastMsg ? lastMsg.sender_id : null,
      }
    })

    res.json({ friends: friendsWithLastMsg })
  } catch (err) {
    console.error('Get friends error:', err)
    res.status(500).json({ error: 'Lỗi tải danh sách bạn bè' })
  }
})

// 2. Lấy danh sách lời mời kết bạn đang chờ (Incoming requests)
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.id, f.created_at, u.id as user_id, u.username, u.display_name, u.avatar_url, u.bio
       FROM friendships f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = $1 AND f.status = 'pending'
         AND NOT EXISTS (
           SELECT 1 FROM user_blocks b 
           WHERE (b.blocker_id = $1 AND b.blocked_id = f.user_id)
              OR (b.blocker_id = f.user_id AND b.blocked_id = $1)
         )
       ORDER BY f.created_at DESC`,
      [req.user.id]
    )

    res.json({ requests: result.rows })
  } catch (err) {
    console.error('Get requests error:', err)
    res.status(500).json({ error: 'Lỗi tải lời mời kết bạn' })
  }
})

// 2b. Lấy danh sách lời mời kết bạn đã gửi đang chờ (Outgoing / Sent requests)
router.get('/sent-requests', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.id, f.created_at, f.user_id, f.friend_id, u.username, u.display_name, u.avatar_url, u.bio
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1 AND f.status = 'pending'
         AND NOT EXISTS (
           SELECT 1 FROM user_blocks b 
           WHERE (b.blocker_id = $1 AND b.blocked_id = f.friend_id)
              OR (b.blocker_id = f.friend_id AND b.blocked_id = $1)
         )
       ORDER BY f.created_at DESC`,
      [req.user.id]
    )

    res.json({ requests: result.rows })
  } catch (err) {
    console.error('Get sent requests error:', err)
    res.status(500).json({ error: 'Lỗi tải lời mời kết bạn đã gửi' })
  }
})

// 3. Gửi lời mời kết bạn
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { targetUserId } = req.body
    const currentUserId = req.user.id

    if (!targetUserId || targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Người dùng không hợp lệ' })
    }

    // Kiểm tra targetUserId có tồn tại trong hệ thống không
    const targetCheck = await pool.query('SELECT id FROM users WHERE id = $1', [targetUserId])
    if (targetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Người dùng được yêu cầu kết bạn không tồn tại' })
    }

    // Kiểm tra xem có bị chặn 2 chiều không
    const blockCheck = await pool.query(
      `SELECT blocker_id, blocked_id FROM user_blocks 
       WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
      [currentUserId, targetUserId]
    )
    if (blockCheck.rows.length > 0) {
      const isBlocker = String(blockCheck.rows[0].blocker_id) === String(currentUserId)
      if (isBlocker) {
        return res.status(400).json({ error: 'Bạn đang chặn người dùng này. Vui lòng mở chặn trước khi kết bạn.' })
      } else {
        return res.status(403).json({ error: 'Bạn không thể gửi lời mời kết bạn tới người dùng này.' })
      }
    }

    // Kiểm tra xem đã kết bạn hoặc đã gửi lời mời chưa
    const existing = await pool.query(
      `SELECT * FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [currentUserId, targetUserId]
    )

    if (existing.rows.length > 0) {
      const rel = existing.rows[0]
      if (rel.status === 'accepted') {
        return res.status(400).json({ error: 'Hai bạn đã là bạn bè của nhau rồi' })
      }

      // Trường hợp 1: Đối phương đã gửi lời mời cho mình trước đó -> Tự động chấp nhận luôn!
      if (String(rel.user_id) === String(targetUserId) && String(rel.friend_id) === String(currentUserId)) {
        const acceptRes = await pool.query(
          "UPDATE friendships SET status = 'accepted' WHERE id = $1 RETURNING *",
          [rel.id]
        )
        broadcastNotification('friend_accepted', {
          userA: rel.user_id,
          userB: rel.friend_id,
        })
        return res.json({ message: 'Đã chấp nhận kết bạn thành công', request: acceptRes.rows[0], status: 'accepted' })
      }

      // Trường hợp 2: Lời mời cũ đang chờ hoặc bị huỷ -> Làm mới lại lời mời thành pending
      const renewRes = await pool.query(
        "UPDATE friendships SET user_id = $1, friend_id = $2, status = 'pending', created_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
        [currentUserId, targetUserId, rel.id]
      )
      broadcastNotification('friend_request', {
        fromUserId: currentUserId,
        toUserId: targetUserId,
        requestId: rel.id,
      })
      return res.json({ message: 'Đã gửi lời mời kết bạn thành công', request: renewRes.rows[0], status: 'pending' })
    }

    const insertResult = await pool.query(
      `INSERT INTO friendships (user_id, friend_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [currentUserId, targetUserId]
    )

    // Phát tín hiệu Realtime cho các backend khác
    broadcastNotification('friend_request', {
      fromUserId: currentUserId,
      toUserId: targetUserId,
      requestId: insertResult.rows[0].id,
    })

    res.status(201).json({ message: 'Đã gửi lời mời kết bạn', request: insertResult.rows[0] })
  } catch (err) {
    console.error('Send friend request error:', err)
    res.status(500).json({ error: 'Lỗi gửi lời mời kết bạn' })
  }
})

// 4. Chấp nhận lời mời kết bạn (Hỗ trợ cả friendshipId lẫn sender user_id)
router.put('/accept/:id', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id
    const currentUserId = req.user.id

    const result = await pool.query(
      `UPDATE friendships
       SET status = 'accepted'
       WHERE (id = $1 OR user_id = $1) AND friend_id = $2
       RETURNING *`,
      [requestId, currentUserId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy lời mời kết bạn' })
    }

    const rel = result.rows[0]
    broadcastNotification('friend_accepted', {
      userA: rel.user_id,
      userB: rel.friend_id,
    })

    res.json({ message: 'Đã chấp nhận kết bạn', friendship: rel })
  } catch (err) {
    console.error('Accept friend error:', err)
    res.status(500).json({ error: 'Lỗi chấp nhận kết bạn' })
  }
})

// 5. Từ chối lời mời hoặc thu hồi lời mời kết bạn đã gửi (Hỗ trợ cả PUT lẫn DELETE)
const handleRejectOrCancel = async (req, res) => {
  try {
    const requestId = req.params.id
    const currentUserId = req.user.id

    const result = await pool.query(
      `DELETE FROM friendships 
       WHERE (id = $1 OR user_id = $1 OR friend_id = $1) 
         AND (friend_id = $2 OR user_id = $2) 
       RETURNING *`,
      [requestId, currentUserId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy lời mời kết bạn' })
    }

    res.json({ message: 'Đã xử lý hủy / từ chối lời mời kết bạn' })
  } catch (err) {
    console.error('Reject friend error:', err)
    res.status(500).json({ error: 'Lỗi xử lý kết bạn' })
  }
}

router.put('/reject/:id', authenticateToken, handleRejectOrCancel)
router.delete('/reject/:id', authenticateToken, handleRejectOrCancel)
router.delete('/request/:id', authenticateToken, handleRejectOrCancel)
router.delete('/:id', authenticateToken, handleRejectOrCancel)

const ensureBlocksTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        id SERIAL PRIMARY KEY,
        blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(blocker_id, blocked_id)
      )
    `)
  } catch (err) {
    console.warn('Ensure user_blocks table warning:', err.message)
  }
}

// 6. Chặn người dùng (Lưu vào database & huỷ bỏ toàn bộ quan hệ bạn bè/lời mời)
router.post('/block', authenticateToken, async (req, res) => {
  try {
    await ensureBlocksTable()
    const currentUserId = req.user.id
    const { targetUserId } = req.body

    if (!targetUserId || targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Người dùng không hợp lệ' })
    }

    // Lưu vào bảng user_blocks
    await pool.query(
      `INSERT INTO user_blocks (blocker_id, blocked_id) 
       VALUES ($1, $2) 
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [currentUserId, targetUserId]
    )

    // Xoá mọi quan hệ bạn bè hoặc lời mời đang chờ giữa 2 người
    await pool.query(
      `DELETE FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [currentUserId, targetUserId]
    )

    // Phát tín hiệu Realtime qua PostgreSQL LISTEN/NOTIFY
    broadcastNotification('user_blocked', {
      blockerId: currentUserId,
      blockedId: targetUserId,
    })

    res.json({ ok: true, message: 'Đã chặn người dùng thành công' })
  } catch (err) {
    console.error('Block user error:', err)
    res.status(500).json({ error: 'Lỗi khi chặn người dùng' })
  }
})

// 7. Bỏ chặn người dùng
router.post('/unblock', authenticateToken, async (req, res) => {
  try {
    await ensureBlocksTable()
    const currentUserId = req.user.id
    const { targetUserId } = req.body

    if (!targetUserId) {
      return res.status(400).json({ error: 'Thiếu thông tin người dùng' })
    }

    await pool.query(
      `DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [currentUserId, targetUserId]
    )

    broadcastNotification('user_unblocked', {
      blockerId: currentUserId,
      blockedId: targetUserId,
    })

    res.json({ ok: true, message: 'Đã bỏ chặn người dùng' })
  } catch (err) {
    console.error('Unblock user error:', err)
    res.status(500).json({ error: 'Lỗi khi bỏ chặn người dùng' })
  }
})

// 8. Lấy danh sách chặn: Người tôi chặn và người đang chặn tôi
router.get('/blocks', authenticateToken, async (req, res) => {
  try {
    await ensureBlocksTable()
    const currentUserId = req.user.id

    // Người tôi đang chặn
    const blockedQuery = await pool.query(
      `SELECT b.blocked_id as id, u.username, u.display_name, u.avatar_url 
       FROM user_blocks b
       JOIN users u ON b.blocked_id = u.id
       WHERE b.blocker_id = $1`,
      [currentUserId]
    )

    // Người đang chặn tôi
    const blockedByQuery = await pool.query(
      `SELECT blocker_id FROM user_blocks WHERE blocked_id = $1`,
      [currentUserId]
    )

    res.json({
      blockedUsers: blockedQuery.rows,
      blockedUserIds: blockedQuery.rows.map((r) => String(r.id)),
      blockedByUserIds: blockedByQuery.rows.map((r) => String(r.blocker_id)),
    })
  } catch (err) {
    console.warn('Get blocks fallback:', err.message)
    res.json({ blockedUsers: [], blockedUserIds: [], blockedByUserIds: [] })
  }
})

export default router

