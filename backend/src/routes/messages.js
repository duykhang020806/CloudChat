import express from 'express'
import { pool, broadcastNotification } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// 1. Tải lịch sử tin nhắn (Chat 1-1 hoặc Chat Nhóm)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id
    const { receiverId, groupId, limit = 50, before } = req.query

    let query = ''
    let params = []

    if (groupId) {
      // 1. Chat nhóm: Kiểm tra quyền thành viên
      const memberCheck = await pool.query(
        'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
        [groupId, currentUserId]
      )
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Bạn không phải thành viên nhóm này' })
      }

      query = `
        SELECT m.id, m.sender_id, m.receiver_id, m.group_id, m.content, m.is_read, m.reply_to_id, m.created_at,
               u.username as sender_username, u.display_name as sender_name, u.avatar_url as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.group_id = $1
      `
      params = [groupId]
    } else if (receiverId) {
      // 2. Chat 1-1: Giữa currentUserId và receiverId
      query = `
        SELECT m.id, m.sender_id, m.receiver_id, m.group_id, m.content, m.is_read, m.reply_to_id, m.created_at,
               u.username as sender_username, u.display_name as sender_name, u.avatar_url as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE (m.sender_id = $1 AND m.receiver_id = $2)
           OR (m.sender_id = $2 AND m.receiver_id = $1)
      `
      params = [currentUserId, receiverId]
    } else {
      return res.status(400).json({ error: 'Cần cung cấp receiverId hoặc groupId' })
    }

    if (before) {
      params.push(before)
      query += ` AND m.created_at < $${params.length}`
    }

    params.push(Number(limit))
    query += ` ORDER BY m.created_at DESC LIMIT $${params.length}`

    const result = await pool.query(query, params)

    // Đảo ngược lại để theo thứ tự từ cũ tới mới (ASC) cho giao diện chat
    const messages = result.rows.reverse()

    res.json({ messages })
  } catch (err) {
    console.error('Get messages error:', err)
    res.status(500).json({ error: 'Lỗi tải tin nhắn' })
  }
})

// 2. Gửi tin nhắn mới
router.post('/', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id
    const { receiverId, groupId, content, replyToId } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống' })
    }

    if (!receiverId && !groupId) {
      return res.status(400).json({ error: 'Cần chỉ định người nhận hoặc nhóm nhận' })
    }

    // Nếu gửi 1-1, kiểm tra người nhận có tồn tại không và có phải bạn bè không
    if (receiverId) {
      if (receiverId === currentUserId) {
        return res.status(400).json({ error: 'Không thể tự gửi tin nhắn cho chính mình' })
      }

      const recCheck = await pool.query('SELECT id, username FROM users WHERE id = $1', [receiverId])
      if (recCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Người nhận không tồn tại' })
      }

      const receiver = recCheck.rows[0]

      // Kiểm tra chặn 2 chiều (Chặn không cho phép gửi tin nhắn)
      const blockCheck = await pool.query(
        `SELECT blocker_id FROM user_blocks 
         WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
        [currentUserId, receiverId]
      )
      if (blockCheck.rows.length > 0) {
        return res.status(403).json({ error: 'Không thể gửi tin nhắn cho người dùng này do tài khoản đã bị chặn' })
      }

      // Nếu không phải gửi cho bot thông báo hệ thống, bắt buộc phải là bạn bè
      if (receiver.username !== 'cloudchat') {
        const friendCheck = await pool.query(
          `SELECT status FROM friendships 
           WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)) 
             AND status = 'accepted'`,
          [currentUserId, receiverId]
        )
        if (friendCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Để nhắn tin, bạn cần gửi lời mời kết bạn và được đối phương chấp nhận' })
        }
      }
    }

    // Nếu gửi vào nhóm, kiểm tra xem có phải thành viên không
    if (groupId) {
      const memberCheck = await pool.query(
        'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
        [groupId, currentUserId]
      )
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Bạn không phải thành viên của nhóm này' })
      }
    }

    // Chèn tin nhắn vào CSDL
    const insertResult = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, group_id, content, reply_to_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [currentUserId, receiverId || null, groupId || null, content.trim(), replyToId || null]
    )

    const rawMsg = insertResult.rows[0]

    // Lấy kèm thông tin người gửi
    const userQuery = await pool.query(
      'SELECT username, display_name, avatar_url FROM users WHERE id = $1',
      [currentUserId]
    )
    const sender = userQuery.rows[0]

    const fullMessage = {
      ...rawMsg,
      sender_username: sender?.username,
      sender_name: sender?.display_name,
      sender_avatar: sender?.avatar_url,
    }

    // Phát tín hiệu thông báo tin nhắn mới cho tất cả các máy chủ Backend khác qua Postgres NOTIFY
    broadcastNotification('new_message', fullMessage)

    // Cập nhật người gửi đang online và thời gian hoạt động mới nhất
    pool.query(
      'UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [currentUserId]
    ).catch(() => {})
    broadcastNotification('user_status', { userId: currentUserId, isOnline: true, lastSeen: new Date().toISOString() })

    res.status(201).json({ message: fullMessage })
  } catch (err) {
    console.error('Send message error:', err)
    res.status(500).json({ error: 'Lỗi gửi tin nhắn' })
  }
})

// 3. Thu hồi / Xóa tin nhắn
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id
    const currentUserId = req.user.id

    // Kiểm tra tin nhắn có phải do người này gửi không
    const msgQuery = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId])
    if (msgQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tin nhắn' })
    }

    const msg = msgQuery.rows[0]
    if (msg.sender_id !== currentUserId) {
      return res.status(403).json({ error: 'Bạn chỉ có thể thu hồi tin nhắn của chính mình' })
    }

    // Đánh dấu thu hồi
    const updateResult = await pool.query(
      `UPDATE messages SET content = '__REVOKED__' WHERE id = $1 RETURNING *`,
      [messageId]
    )

    const revokedMsg = updateResult.rows[0]
    broadcastNotification('message_revoked', {
      id: revokedMsg.id,
      receiver_id: revokedMsg.receiver_id,
      group_id: revokedMsg.group_id,
      content: '__REVOKED__',
    })

    res.json({ message: 'Đã thu hồi tin nhắn', messageData: revokedMsg })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi thu hồi tin nhắn' })
  }
})

// 4. Đánh dấu đã đọc
router.put('/read', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id
    const { messageIds, senderId } = req.body

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      await pool.query(
        'UPDATE messages SET is_read = true WHERE id = ANY($1) AND receiver_id = $2',
        [messageIds, currentUserId]
      )
    } else if (senderId) {
      await pool.query(
        'UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false',
        [senderId, currentUserId]
      )
    }

    res.json({ message: 'Đã đánh dấu đã đọc' })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật trạng thái đọc' })
  }
})

export default router

