import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Đảm bảo thư mục uploads tồn tại
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Cấu hình lưu trữ tệp tin trên ổ cứng máy chủ
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname) || ''
    cb(null, `${uniqueSuffix}${ext}`)
  },
})

// Giới hạn dung lượng upload: tối đa 50MB
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
})

// API Upload file đơn hoặc ảnh / voice note / tài liệu
router.post('/', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Chưa chọn tệp tin tải lên' })
    }

    const host = req.get('host')
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http'
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`

    res.json({
      url: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      message: 'Tải lên tệp thành công',
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Lỗi tải lên tệp: ' + err.message })
  }
})

export default router

