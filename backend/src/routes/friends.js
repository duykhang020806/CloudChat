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
        u.is_online, u.last_seen, u.is_verified, f.created_at as friendship_date
       FROM friendships f
       JOIN users u ON (
         CASE 
           WHEN f.user_id = $1 THEN f.friend_id = u.id
           ELSE f.user_id = u.id
         END
       )
       WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
       ORDER BY u.display_name ASC`,
      [currentUserId]
    )

    const friends = friendsQuery.rows

    // Lấy tin nhắn cuối cùng với từng người bạn
    const friendsWithLastMsg = await Promise.all(
      friends.map(async (friend) => {
        const lastMsgQuery = await pool.query(
          `SELECT id, sender_id, content, is_read, created_at
           FROM messages
           WHERE (sender_id = $1 AND receiver_id = $2)
              OR (sender_id = $2 AND receiver_id = $1)
           ORDER BY created_at DESC
           LIMIT 1`,
          [currentUserId, friend.id]
        )

        const lastMsg = lastMsgQuery.rows[0]
        return {
          ...friend,
          last_message: lastMsg ? lastMsg.content : null,
          last_message_time: lastMsg ? lastMsg.created_at : null,
          last_message_sender_id: lastMsg ? lastMsg.sender_id : null,
        }
      })
    )

    res.json({ friends: friendsWithLastMsg })
  } catch (err) {
    console.error('Get friends error:', err)
    res.status(500).json({ error: 'Lỗi tải danh sách bạn bè: ' + err.message })
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
       ORDER BY f.created_at DESC`,
      [req.user.id]
    )

    res.json({ requests: result.rows })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải lời mời kết bạn' })
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

    // Kiểm tra xem đã kết bạn hoặc đã gửi lời mời chưa
    const existing = await pool.query(
      `SELECT * FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [currentUserId, targetUserId]
    )

    if (existing.rows.length > 0) {
      const rel = existing.rows[0]
      if (rel.status === 'accepted') {
        return res.status(400).json({ error: 'Hai người đã là bạn bè của nhau' })
      }
      return res.status(400).json({ error: 'Lời mời kết bạn đã tồn tại hoặc đang chờ xử lý' })
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
    res.status(500).json({ error: 'Lỗi gửi lời mời kết bạn: ' + err.message })
  }
})

// 4. Chấp nhận lời mời kết bạn
router.put('/accept/:id', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id
    const currentUserId = req.user.id

    const result = await pool.query(
      `UPDATE friendships
       SET status = 'accepted'
       WHERE id = $1 AND friend_id = $2
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
    res.status(500).json({ error: 'Lỗi chấp nhận kết bạn: ' + err.message })
  }
})

// 5. Từ chối lời mời kết bạn
router.put('/reject/:id', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id
    const currentUserId = req.user.id

    const result = await pool.query(
      `DELETE FROM friendships WHERE id = $1 AND friend_id = $2 RETURNING *`,
      [requestId, currentUserId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy lời mời kết bạn' })
    }

    res.json({ message: 'Đã từ chối lời mời kết bạn' })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi từ chối kết bạn: ' + err.message })
  }
})

export default router

