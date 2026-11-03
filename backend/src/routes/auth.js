import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool, broadcastNotification } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Hàm sinh JWT token (thời hạn 30 ngày, thuật toán HS256 chuẩn)
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET || 'cloudchat_super_secure_jwt_token_secret_key_2026',
    { algorithm: 'HS256', expiresIn: '30d' }
  )
}

// 1. Đăng ký tài khoản
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, display_name } = req.body

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ email, username và mật khẩu' })
    }

    const cleanEmail = email.toLowerCase().trim()
    const cleanUsername = username.toLowerCase().trim()

    // 1. Kiểm tra định dạng Email theo chuẩn RFC
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Địa chỉ email không đúng định dạng hợp lệ' })
    }

    // 2. Kiểm tra định dạng Username (3-30 ký tự an toàn)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({ error: 'Tên người dùng phải từ 3 đến 30 ký tự, chỉ gồm chữ cái, số và dấu gạch dưới' })
    }

    // 3. Kiểm tra độ dài mật khẩu (tối thiểu 6 ký tự)
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có độ dài tối thiểu từ 6 ký tự trở lên' })
    }

    // Kiểm tra username hoặc email đã tồn tại chưa
    const existing = await pool.query(
      'SELECT id, email, username FROM users WHERE email = $1 OR username = $2',
      [cleanEmail, cleanUsername]
    )

    if (existing.rows.length > 0) {
      const match = existing.rows[0]
      if (match.email === cleanEmail) {
        return res.status(400).json({ error: 'Email này đã được sử dụng' })
      }
      return res.status(400).json({ error: 'Username này đã tồn tại, vui lòng chọn tên khác' })
    }

    // Hash mật khẩu
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const finalDisplayName = display_name?.trim() || cleanUsername

    // Chèn người dùng vào CSDL
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, display_name, is_online, last_seen)
       VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
       RETURNING id, email, username, display_name, avatar_url, bio, gender, dob, is_online, last_seen, is_verified, created_at`,
      [cleanEmail, cleanUsername, passwordHash, finalDisplayName]
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
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng ký tài khoản' })
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

    // Thông báo lỗi chung thống nhất để chống tấn công dò quét tài khoản (Username Enumeration)
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' })
    }

    const user = result.rows[0]
    const isMatch = await bcrypt.compare(password, user.password_hash)

    if (!isMatch) {
      return res.status(400).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' })
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
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập' })
  }
})

// 2b. Đăng nhập / Đăng ký nhanh bằng Google OAuth
router.post('/google', async (req, res) => {
  try {
    const { credential, access_token } = req.body

    if (!credential && !access_token) {
      return res.status(400).json({ error: 'Thiếu Google credential hoặc access_token' })
    }

    let email = null
    let name = null
    let picture = null

    // 1. Xác thực ID Token (Google Identity Services)
    const expectedClientId = process.env.GOOGLE_CLIENT_ID || '535880022872-nbm39vgt0kfoj920m3i48uh8mgh5hbrk.apps.googleusercontent.com'
    if (credential) {
      try {
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
        if (googleRes.ok) {
          const gData = await googleRes.json()
          // Xác thực audience để chống giả mạo token từ ứng dụng khác
          if (gData.aud === expectedClientId) {
            email = gData.email?.toLowerCase().trim()
            name = gData.name || gData.given_name || email.split('@')[0]
            picture = gData.picture || null
          } else {
            console.warn(`[OAuth Warning] Mismatched Google Client ID: received ${gData.aud}`)
          }
        }
      } catch (e) {
        console.warn('Google id_token validation error:', e)
      }
    }

    // 2. Fallback xác thực Access Token (Google OAuth 2.0 Popup)
    if (!email && access_token) {
      try {
        const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        })
        if (googleRes.ok) {
          const gData = await googleRes.json()
          email = gData.email?.toLowerCase().trim()
          name = gData.name || gData.given_name || email.split('@')[0]
          picture = gData.picture || null
        }
      } catch (e) {
        console.warn('Google access_token validation error:', e)
      }
    }

    if (!email) {
      return res.status(401).json({ error: 'Token Google không hợp lệ hoặc đã hết hạn' })
    }

    // 2. Kiểm tra xem người dùng đã tồn tại trong CSDL chưa
    let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    let user = null

    if (userResult.rows.length === 0) {
      // Người dùng mới: Tự tạo username duy nhất
      let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
      if (baseUsername.length < 3) baseUsername = 'user_' + Math.floor(Math.random() * 10000)

      let finalUsername = baseUsername
      const checkUname = await pool.query('SELECT id FROM users WHERE username = $1', [finalUsername])
      if (checkUname.rows.length > 0) {
        finalUsername = `${baseUsername}_${Math.floor(Math.random() * 1000)}`
      }

      // Tạo password ngẫu nhiên được mã hóa cho tài khoản OAuth
      const salt = await bcrypt.genSalt(10)
      const randomPassword = Math.random().toString(36).slice(-10) + Date.now()
      const passwordHash = await bcrypt.hash(randomPassword, salt)

      const insertRes = await pool.query(
        `INSERT INTO users (email, username, password_hash, display_name, avatar_url, is_online, last_seen, is_verified)
         VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, false)
         RETURNING id, email, username, display_name, avatar_url, bio, gender, dob, is_online, last_seen, is_verified, created_at`,
        [email, finalUsername, passwordHash, name, picture]
      )
      user = insertRes.rows[0]
    } else {
      user = userResult.rows[0]
      // Cập nhật trạng thái online và avatar nếu chưa có
      await pool.query(
        `UPDATE users
         SET is_online = true,
             last_seen = CURRENT_TIMESTAMP,
             avatar_url = COALESCE(avatar_url, $1)
         WHERE id = $2`,
        [picture, user.id]
      )
      user.is_online = true
      user.avatar_url = user.avatar_url || picture
      delete user.password_hash
    }

    // 3. Sinh token JWT của CloudChat
    user.provider = 'google'
    user.is_oauth = true
    const token = generateToken(user)
    broadcastNotification('user_status', { userId: user.id, isOnline: true })

    res.json({
      user,
      token,
      message: 'Đăng nhập Google thành công',
    })
  } catch (err) {
    console.error('Google Auth error:', err)
    res.status(500).json({ error: 'Lỗi xác thực Google' })
  }
})

// 3. Lấy thông tin tài khoản hiện tại (Session check)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [req.user.id]
    ).catch(() => {})

    const result = await pool.query(
      `SELECT id, email, username, display_name, avatar_url, bio, gender, dob, is_online, last_seen, is_verified, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin tài khoản' })
    }

    const u = result.rows[0]
    const isGoogle = Boolean(
      (u.email && u.email.toLowerCase().endsWith('@gmail.com') && u.avatar_url && (u.avatar_url.includes('googleusercontent.com') || u.avatar_url.includes('lh3.google')))
    )
    u.provider = isGoogle ? 'google' : 'email'
    u.is_oauth = isGoogle

    res.json({ user: u })
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
    console.error('Update profile error:', err)
    res.status(500).json({ error: 'Lỗi cập nhật hồ sơ' })
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

// 6. Tìm kiếm người dùng (Hỗ trợ tìm theo username, display_name hoặc email)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.json({ users: [] })

    const result = await pool.query(
      `SELECT id, username, display_name, avatar_url, bio,
        (is_online IS TRUE AND last_seen IS NOT NULL AND (last_seen >= CURRENT_TIMESTAMP - INTERVAL '150 seconds')) as is_online,
        last_seen, is_verified
       FROM users
       WHERE (username ILIKE $1 OR display_name ILIKE $1 OR email ILIKE $1) AND id != $2
       LIMIT 20`,
      [`%${q}%`, req.user.id]
    )

    res.json({ users: result.rows })
  } catch (err) {
    console.error('Search users error:', err)
    res.status(500).json({ error: 'Lỗi tìm kiếm người dùng' })
  }
})

// 7. Lấy danh sách profiles theo danh sách ID
router.post('/by-ids', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ users: [] })
    const result = await pool.query(
      `SELECT id, email, username, display_name, avatar_url, bio,
        (is_online IS TRUE AND last_seen IS NOT NULL AND (last_seen >= CURRENT_TIMESTAMP - INTERVAL '150 seconds')) as is_online,
        last_seen, is_verified
       FROM users
       WHERE id = ANY($1::uuid[])`,
      [ids]
    )
    res.json({ users: result.rows })
  } catch (err) {
    console.error('Get profiles error:', err)
    res.status(500).json({ error: 'Lỗi truy vấn thông tin người dùng' })
  }
})

// 8. Heartbeat định kỳ giữ trạng thái Online (Đang hoạt động) và cập nhật last_seen
router.post('/heartbeat', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id
    const now = new Date().toISOString()
    await pool.query(
      'UPDATE users SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [currentUserId]
    )
    broadcastNotification('user_status', { userId: currentUserId, isOnline: true, lastSeen: now })
    res.json({ ok: true, is_online: true, last_seen: now })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật heartbeat' })
  }
})

export default router

