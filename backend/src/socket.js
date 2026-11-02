import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { createListenerClient } from './db.js'

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
      (err, decoded) => {
        if (err) return next(new Error('Authentication error: Invalid token'))
        socket.user = decoded
        next()
      }
    )
  })

  io.on('connection', (socket) => {
    const userId = socket.user.id
    // Cho socket tham gia phòng riêng của chính mình (để nhận tin nhắn 1-1 cá nhân)
    socket.join(`user_${userId}`)
    console.log(`[Socket Connected] User ${socket.user.username} (ID: ${userId}) on Socket ID: ${socket.id}`)

    // Tham gia phòng chat nhóm
    socket.on('join_group', (groupId) => {
      socket.join(`group_${groupId}`)
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

