import jwt from 'jsonwebtoken'
import { pool } from '../db.js'

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Chưa đăng nhập hoặc thiếu token xác thực' })
  }

  const secret = process.env.JWT_SECRET || 'cloudchat_super_secure_jwt_token_secret_key_2026'

  jwt.verify(token, secret, async (err, decoded) => {
    if (err || !decoded?.id) {
      return res.status(403).json({ error: 'Token đã hết hạn hoặc không hợp lệ' })
    }

    try {
      // Xác thực nghiêm ngặt: UUID trong JWT bắt buộc phải tồn tại trong CSDL
      const userCheck = await pool.query(
        'SELECT id, username, email, display_name FROM users WHERE id = $1',
        [decoded.id]
      )

      if (userCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Tài khoản không tồn tại hoặc đã bị khóa' })
      }

      req.user = userCheck.rows[0]
      next()
    } catch (dbErr) {
      console.error('Auth verification DB error:', dbErr)
      return res.status(500).json({ error: 'Lỗi kiểm tra quyền truy cập' })
    }
  })
}

