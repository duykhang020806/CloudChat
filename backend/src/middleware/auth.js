import jwt from 'jsonwebtoken'

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Chưa đăng nhập hoặc thiếu token xác thực' })
  }

  jwt.verify(token, process.env.JWT_SECRET || 'cloudchat_super_secure_jwt_token_secret_key_2026', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token đã hết hạn hoặc không hợp lệ' })
    }
    req.user = user
    next()
  })
}

