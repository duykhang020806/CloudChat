import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool, broadcastNotification } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Hàm sinh JWT token (thời hạn 30 ngày)
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET || 'cloudchat_super_secure_jwt_token_secret_key_2026',
    { expiresIn: '30d' }
  )
}

// 1. Đăng ký tài khoản
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, display_name } = req.body

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp email, username và mật khẩu' })
    }

    // Kiểm tra username hoặc email đã tồn tại chưa
    const existing = await pool.query(
      'SELECT id, email, username FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase().trim(), username.toLowerCase().trim()]
    )

    if (existing.rows.length > 0) {
      const match = existing.rows[0]
      if (match.email === email.toLowerCase().trim()) {
        return res.status(400).json({ error: 'Email này đã được sử dụng' })
      }
      return res.status(400).json({ error: 'Username này đã tồn tại, vui lòng chọn tên khác' })
    }

    // Hash mật khẩu
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const finalDisplayName = display_name?.trim() || username.trim()

    // Chèn người dùng vào CSDL
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, display_name, is_online, last_seen)
       VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
       RETURNING id, email, username, display_name, avatar_url, bio, gender, dob, is_online, last_seen, is_verified, created_at`,
      [email.toLowerCase().trim(), username.toLowerCase().trim(), passwordHash, finalDisplayName]
    )

    const newUser = result.rows[0]
    const token = generateToken(newUser)

    res.status(201).json({
      user: newUser,
      token,
      message: 'Đăng ký tài khoản thành công',
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng ký tài khoản: ' + err.message })
  }
})

// 2. Đăng nhập tài khoản
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body // login có thể là email hoặc username

    if (!login || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tài khoản (email/username) và mật khẩu' })
    }

    const cleanLogin = login.toLowerCase().trim()

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 OR username = $1`,
      [cleanLogin]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Tài khoản không tồn tại' })
    }

    const user = result.rows[0]
    const isMatch = await bcrypt.compare(password, user.password_hash)

    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu không chính xác' })
    }

    // Cập nhật trạng thái online
    await pool.query(
      'UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    )
    user.is_online = true
    user.last_seen = new Date().toISOString()

    // Xóa password_hash trước khi trả về
    delete user.password_hash

    const token = generateToken(user)

    // Phát tín hiệu User Online cho các backend server khác
    broadcastNotification('user_status', { userId: user.id, isOnline: true })

    res.json({
      user,
      token,
      message: 'Đăng nhập thành công',
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập: ' + err.message })
  }
})

// 3. Lấy thông tin tài khoản hiện tại (Session check)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, username, display_name, avatar_url, bio, gender, dob, is_online, last_seen, is_verified, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin tài khoản' })
    }

    res.json({ user: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi kiểm tra phiên đăng nhập' })
  }
})

// 4. Cập nhật hồ sơ cá nhân
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { display_name, bio, avatar_url, gender, dob } = req.body

    const result = await pool.query(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url),
           gender = COALESCE($4, gender),
           dob = COALESCE($5, dob)
       WHERE id = $6
       RETURNING id, email, username, display_name, avatar_url, bio, gender, dob, is_online, last_seen, is_verified, created_at`,
      [display_name, bio, avatar_url, gender, dob, req.user.id]
    )

    res.json({ user: result.rows[0], message: 'Cập nhật hồ sơ thành công' })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật hồ sơ: ' + err.message })
  }
})

// 5. Đăng xuất
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET is_online = false, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [req.user.id]
    )
    broadcastNotification('user_status', { userId: req.user.id, isOnline: false })
    res.json({ message: 'Đăng xuất thành công' })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi đăng xuất' })
  }
})

// 6. Tìm kiếm người dùng
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.json({ users: [] })

    const result = await pool.query(
      `SELECT id, username, display_name, avatar_url, bio, is_online, last_seen, is_verified
       FROM users
       WHERE (username ILIKE $1 OR display_name ILIKE $1) AND id != $2
       LIMIT 20`,
      [`%${q}%`, req.user.id]
    )

    res.json({ users: result.rows })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tìm kiếm người dùng' })
  }
})

export default router

