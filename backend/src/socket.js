import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { pool, createListenerClient, broadcastNotification } from './db.js'

export const setupSocketServer = (httpServer, corsOrigin) => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  })

  // Middleware xác thực JWT token khi người dùng kết nối WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token

    if (!token) {
      return next(new Error('Authentication error: Missing token'))
    }

    jwt.verify(
      token,
      process.env.JWT_SECRET || 'cloudchat_super_secure_jwt_token_secret_key_2026',
      { algorithms: ['HS256'] },
      async (err, decoded) => {
        if (err || !decoded?.id) return next(new Error('Authentication error: Invalid token'))
        try {
          const userCheck = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [decoded.id])
          if (userCheck.rows.length === 0) return next(new Error('Authentication error: User not found'))
          socket.user = userCheck.rows[0]
          next()
        } catch {
          next(new Error('Authentication error: Database error'))
        }
      }
    )
  })

  io.on('connection', (socket) => {
    const userId = socket.user.id
    // Cho socket tham gia phòng riêng của chính mình (để nhận tin nhắn 1-1 cá nhân)
    socket.join(`user_${userId}`)
    console.log(`[Socket Connected] User ${socket.user.username} (ID: ${userId}) on Socket ID: ${socket.id}`)

    // Cập nhật người dùng trực tuyến (online)
    pool.query(
      'UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    ).catch(() => {})
    broadcastNotification('user_status', { userId, isOnline: true, lastSeen: new Date().toISOString() })

    // Tham gia phòng chat nhóm (Xác minh nghiêm ngặt quyền thành viên tránh nghe lén)
    socket.on('join_group', async (groupId) => {
      try {
        if (!groupId) return
        const check = await pool.query(
          'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
          [groupId, userId]
        )
        if (check.rows.length > 0) {
          socket.join(`group_${groupId}`)
        }
      } catch (err) {
        console.warn(`[Socket] Unauthorized or error joining group ${groupId}:`, err.message)
      }
    })

    // Rời phòng chat nhóm
    socket.on('leave_group', (groupId) => {
      socket.leave(`group_${groupId}`)
    })

    // Trạng thái đang gõ phím
    socket.on('typing', ({ receiverId, groupId }) => {
      if (groupId) {
        socket.to(`group_${groupId}`).emit('user_typing', { userId, groupId })
      } else if (receiverId) {
        io.to(`user_${receiverId}`).emit('user_typing', { userId, senderId: userId })
      }
    })

    socket.on('stop_typing', ({ receiverId, groupId }) => {
      if (groupId) {
        socket.to(`group_${groupId}`).emit('user_stop_typing', { userId, groupId })
      } else if (receiverId) {
        io.to(`user_${receiverId}`).emit('user_stop_typing', { userId, senderId: userId })
      }
    })

    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] User ${socket.user.username} (ID: ${userId})`)
      // Chờ 15 giây để tránh chuyển offline khi F5 / chuyển tab hoặc mạng lag giữa các instance
      setTimeout(async () => {
        const userRoom = io.sockets.adapter.rooms.get(`user_${userId}`)
        if (!userRoom || userRoom.size === 0) {
          try {
            // Chỉ đánh dấu offline nếu trong 20s qua không có heartbeat mới từ instance khác
            const updateRes = await pool.query(
              `UPDATE users 
               SET is_online = false, last_seen = CURRENT_TIMESTAMP 
               WHERE id = $1 AND (last_seen <= CURRENT_TIMESTAMP - INTERVAL '20 seconds' OR is_online = true)
               RETURNING last_seen`,
              [userId]
            )
            if (updateRes.rows.length > 0) {
              const lastSeen = updateRes.rows[0].last_seen || new Date().toISOString()
              broadcastNotification('user_status', { userId, isOnline: false, lastSeen })
            }
          } catch (err) {
            console.error('Error updating offline status:', err)
          }
        }
      }, 15000)
    })
  })

  // =========================================================================
  // ĐỒNG BỘ TIN NHẮN GIỮA NHIỀU MÁY CHỦ BACKEND QUA POSTGRESQL LISTEN / NOTIFY
  // =========================================================================
  createListenerClient('new_message', (message) => {
    if (message.group_id) {
      // Bắn tin nhắn vào phòng nhóm
      io.to(`group_${message.group_id}`).emit('new_message', message)
    } else if (message.receiver_id) {
      // Bắn tin nhắn cho người nhận và người gửi
      io.to(`user_${message.receiver_id}`).emit('new_message', message)
      io.to(`user_${message.sender_id}`).emit('new_message', message)
    }
  })

  createListenerClient('message_revoked', (data) => {
    if (data.group_id) {
      io.to(`group_${data.group_id}`).emit('message_revoked', data)
    } else if (data.receiver_id) {
      io.to(`user_${data.receiver_id}`).emit('message_revoked', data)
    }
  })

  createListenerClient('user_status', (data) => {
    io.emit('user_status_changed', data)
  })

  createListenerClient('friend_request', (data) => {
    io.to(`user_${data.toUserId}`).emit('incoming_friend_request', data)
  })

  createListenerClient('friend_accepted', (data) => {
    io.to(`user_${data.userA}`).emit('friendship_updated', data)
    io.to(`user_${data.userB}`).emit('friendship_updated', data)
  })

  return io
}

