import express from 'express'
import http from 'http'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import os from 'os'

import { pool } from './db.js'
import { setupSocketServer } from './socket.js'

import authRoutes from './routes/auth.js'
import friendsRoutes from './routes/friends.js'
import groupsRoutes from './routes/groups.js'
import messagesRoutes from './routes/messages.js'
import uploadRoutes from './routes/upload.js'

dotenv.config()

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 5000
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'

// Middlewares cơ bản (Hỗ trợ CORS động cho mọi client web/mobile/Cloudflare)
app.use(
  cors({
    origin: (origin, callback) => {
      // Phản hồi chính xác Origin của client thay vì wildcard * để tương thích chuẩn bảo mật của trình duyệt
      callback(null, true)
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

// Phục vụ tệp tĩnh (ảnh, tài liệu, âm thanh) trong thư mục uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// ===========================================================================
// HEALTH CHECK ENDPOINT (DÀNH CHO AWS APPLICATION LOAD BALANCER)
// ===========================================================================
app.get('/health', async (req, res) => {
  try {
    // Kiểm tra kết nối tới Database Server
    await pool.query('SELECT 1')
    res.status(200).json({
      status: 'UP',
      hostname: os.hostname(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'CONNECTED',
    })
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      hostname: os.hostname(),
      database: 'DISCONNECTED',
      error: err.message,
    })
  }
})

// Định tuyến API
app.use('/api/auth', authRoutes)
app.use('/api/friends', friendsRoutes)
app.use('/api/groups', groupsRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/upload', uploadRoutes)

// Trang gốc kiểm tra
app.get('/', (req, res) => {
  res.json({
    name: 'CloudChat Distributed Backend API',
    version: '1.0.0',
    serverNode: os.hostname(),
    status: 'Running',
  })
})

// Khởi tạo WebSocket Realtime Server
setupSocketServer(server, CORS_ORIGIN)

// Khởi chạy máy chủ
server.listen(PORT, '0.0.0.0', async () => {
  // Đặt lại trạng thái offline cho các user chưa kịp ngắt kết nối trước đó
  // và bỏ tích xanh cho tài khoản thường (chỉ giữ cho bot hệ thống cloudchat)
  try {
    await pool.query('UPDATE users SET is_online = false WHERE is_online = true')
    await pool.query("UPDATE users SET is_verified = false WHERE username != 'cloudchat'")
  } catch (e) {
    console.warn('Reset offline status / verified error:', e.message)
  }

  console.log(`=======================================================`)
  console.log(` CloudChat Backend is running on port: ${PORT}`)
  console.log(` Machine Hostname: ${os.hostname()}`)
  console.log(` Health Check: http://localhost:${PORT}/health`)
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`=======================================================`)
})

