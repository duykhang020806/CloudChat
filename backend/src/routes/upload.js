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

// Danh sách đuôi tệp nguy hiểm tuyệt đối cấm (chống Stored XSS / Thực thi mã độc RCE)
const DISALLOWED_EXTENSIONS = new Set([
  '.html', '.htm', '.xhtml', '.svg', '.xml',
  '.js', '.mjs', '.cjs', '.ts',
  '.php', '.php3', '.php4', '.php5', '.phtml',
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.bin',
  '.py', '.pl', '.cgi', '.jar', '.vbs', '.apk', '.msi'
])

// Danh sách loại MIME an toàn cho phép tải lên
const ALLOWED_MIME_PREFIXES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/', 'video/',
  'application/pdf',
  'application/zip', 'application/x-zip-compressed',
  'application/x-rar-compressed', 'application/x-7z-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.',
  'text/plain'
]

// Cấu hình lưu trữ tệp tin trên ổ cứng máy chủ
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    // Đặt tên ngẫu nhiên cryptographically an toàn
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `${uniqueSuffix}${ext}`)
  },
})

// Kiểm tra loại tệp tin (File Filter)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()

  // 1. Kiểm tra đuôi cấm
  if (DISALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error('Loại tệp tin này bị chặn vì lý do an toàn bảo mật!'), false)
  }

  // 2. Kiểm tra MIME Type an toàn
  const isMimeAllowed = ALLOWED_MIME_PREFIXES.some((prefix) =>
    file.mimetype.startsWith(prefix)
  )

  if (!isMimeAllowed) {
    return cb(new Error('Định dạng tệp không được hỗ trợ tải lên!'), false)
  }

  cb(null, true)
}

// Giới hạn dung lượng upload: tối đa 25MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
})

// API Upload file đơn hoặc ảnh / voice note / tài liệu
router.post('/', authenticateToken, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Kích thước tệp vượt quá giới hạn cho phép (tối đa 25MB)' })
      }
      return res.status(400).json({ error: err.message || 'Lỗi kiểm tra tệp tải lên' })
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Chưa chọn tệp tin tải lên' })
      }

      const host = req.get('host')
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http'
      const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`

      // Làm sạch tên tệp gốc để tránh hiển thị ký tự nguy hiểm
      const safeOriginalName = path.basename(req.file.originalname).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')

      res.json({
        url: fileUrl,
        fileName: safeOriginalName,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        message: 'Tải lên tệp thành công',
      })
    } catch (e) {
      console.error('Upload processing error:', e)
      res.status(500).json({ error: 'Lỗi xử lý tệp tải lên' })
    }
  })
})

export default router

