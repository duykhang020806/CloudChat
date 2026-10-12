import { useEffect, useRef, useState, useMemo } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import './App.css'

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8787'
    : '')

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Luna',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Leo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Milo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Chloe',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Jack',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Bella',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Max',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Sophie',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Charlie',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Ruby',
]

const QR_TTL_PRESETS = [
  { label: '1 phút', seconds: 60 },
  { label: '5 phút (Chuẩn)', seconds: 300 },
  { label: '15 phút', seconds: 900 },
  { label: '30 phút', seconds: 1800 },
  { label: '1 giờ', seconds: 3600 },
  { label: '24 giờ', seconds: 86400 },
]

// Hệ thống Bảng màu & Gradient nền trò chuyện sắc nét, thanh lịch (Chuẩn Telegram / Dark Mode)
const CHAT_COLOR_PRESETS = [
  {
    id: 'tg_dark',
    name: 'Telegram Dark Cổ Điển',
    num: '01',
    type: 'color',
    value: '#0e1621',
    category: 'solid',
    desc: 'Tone xanh đen đặc trưng của Telegram, tối giản và êm dịu',
  },
  {
    id: 'oled_black',
    name: 'Midnight OLED Black',
    num: '02',
    type: 'color',
    value: '#080a0f',
    category: 'solid',
    desc: 'Đen tuyền sâu thẳm, độ tương phản tuyệt đối và nét căng',
  },
  {
    id: 'deep_navy',
    name: 'Navy Blue Đại Dương',
    num: '03',
    type: 'color',
    value: '#0a192f',
    category: 'solid',
    desc: 'Xanh hải quân đậm, thanh lịch và chuyên nghiệp',
  },
  {
    id: 'slate_charcoal',
    name: 'Than Chì Tinh Tế',
    num: '04',
    type: 'color',
    value: '#181b22',
    category: 'solid',
    desc: 'Tone xám than chì trung tính, hiện đại và dịu mắt',
  },
  {
    id: 'dark_emerald',
    name: 'Ngọc Lục Bảo Trầm',
    num: '05',
    type: 'color',
    value: '#062d22',
    category: 'solid',
    desc: 'Xanh lục bảo đậm quý phái, thư giãn thị giác',
  },
  {
    id: 'deep_violet',
    name: 'Tím Đêm Huyền Bí',
    num: '06',
    type: 'color',
    value: '#1a0d2e',
    category: 'solid',
    desc: 'Tone tím đậm sang trọng, phong cách Discord',
  },
  {
    id: 'dark_crimson',
    name: 'Rượu Vang Đỏ Thẫm',
    num: '07',
    type: 'color',
    value: '#280c12',
    category: 'solid',
    desc: 'Đỏ thẫm Bordeaux ấm cúng và cá tính',
  },
  {
    id: 'coffee_mocha',
    name: 'Cà Phê Mocha Nâu',
    num: '08',
    type: 'color',
    value: '#1f1511',
    category: 'solid',
    desc: 'Tone nâu cà phê rang mộc cổ điển',
  },
  {
    id: 'grad_cosmic',
    name: 'Dải Ngân Hà Gradient',
    num: '09',
    type: 'gradient',
    value: 'linear-gradient(145deg, #1d0933 0%, #0c0f18 100%)',
    category: 'gradient',
    desc: 'Chuyển sắc tím than sang đen mượt mà',
  },
  {
    id: 'grad_marine',
    name: 'Biển Đêm Gradient',
    num: '10',
    type: 'gradient',
    value: 'linear-gradient(145deg, #092042 0%, #060b13 100%)',
    category: 'gradient',
    desc: 'Chuyển sắc xanh coban sâu thẳm sang đen',
  },
  {
    id: 'grad_emerald',
    name: 'Rừng Đêm Gradient',
    num: '11',
    type: 'gradient',
    value: 'linear-gradient(145deg, #073325 0%, #05130e 100%)',
    category: 'gradient',
    desc: 'Chuyển sắc xanh ngọc lục bảo sang bóng đêm',
  },
  {
    id: 'grad_sunset',
    name: 'Hoàng Hôn Gradient',
    num: '12',
    type: 'gradient',
    value: 'linear-gradient(145deg, #33150d 0%, #100816 100%)',
    category: 'gradient',
    desc: 'Chuyển sắc hổ phách hoàng hôn sang tím đêm',
  },
  {
    id: 'grad_cyberpunk',
    name: 'Cyberpunk Neon Gradient',
    num: '13',
    type: 'gradient',
    value: 'linear-gradient(135deg, #1b0730 0%, #08152b 100%)',
    category: 'gradient',
    desc: 'Sắc tím neon kết hợp xanh điện tử hiện đại',
  },
  {
    id: 'grad_tokyo',
    name: 'Tokyo Night Gradient',
    num: '14',
    type: 'gradient',
    value: 'linear-gradient(145deg, #1a1b26 0%, #13141c 100%)',
    category: 'gradient',
    desc: 'Chuẩn màu Tokyo Night được lập trình viên yêu thích',
  },
]

// Bảng màu đơn sắc chọn nhanh (Solid Color Swatches)
const QUICK_COLOR_SWATCHES = [
  { name: 'OLED Black', hex: '#000000' },
  { name: 'Telegram Dark', hex: '#0e1621' },
  { name: 'Deep Navy', hex: '#0a192f' },
  { name: 'Slate Gray', hex: '#1e293b' },
  { name: 'Charcoal', hex: '#181b22' },
  { name: 'Emerald', hex: '#064e3b' },
  { name: 'Royal Purple', hex: '#2e1065' },
  { name: 'Crimson', hex: '#450a0a' },
  { name: 'Warm Mocha', hex: '#271a16' },
  { name: 'Teal Forest', hex: '#042f2e' },
  { name: 'Indigo Night', hex: '#1e1b4b' },
  { name: 'Dark Zinc', hex: '#18181b' },
  { name: 'Midnight Blue', hex: '#111e38' },
  { name: 'Deep Burgundy', hex: '#31101e' },
  { name: 'Soft Dark', hex: '#22252a' },
  { name: 'Pure Dark', hex: '#0f121a' },
]

// Hỗ trợ tương thích ngược
const WALLPAPER_PRESETS = CHAT_COLOR_PRESETS
const WALLPAPER_GRADIENTS = CHAT_COLOR_PRESETS.filter((p) => p.type === 'gradient')

// Kiểm tra và chuẩn hóa mã màu CSS không giới hạn (HEX, RGB, HSL, Named Color, Gradient)
function parseAndValidateColor(input) {
  if (!input || typeof input !== 'string') return null
  let s = input.trim()
  if (!s) return null

  // 1. Dải màu Gradient
  if (/^(linear|radial|conic)-gradient\(/i.test(s)) {
    return {
      type: 'gradient',
      value: s,
      formatted: s,
    }
  }

  // 2. Tự động thêm dấu # nếu người dùng nhập 3, 6 hoặc 8 ký tự hex thiếu #
  if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(s)) {
    s = '#' + s
  }

  // 3. Kiểm tra tính hợp lệ bằng CSS native
  try {
    const opt = new Option()
    opt.style.color = ''
    opt.style.color = s
    if (opt.style.color !== '') {
      return {
        type: 'color',
        value: s,
        formatted: s,
      }
    }
  } catch {}

  return null
}

function formatCountdown(sec) {
  if (!sec || sec <= 0) return '00:00'
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = sec % 60

  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) {
    const hh = String(hours).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}

function parseUtcDate(value) {
  if (!value) return null
  let str = String(value)
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(str) && !str.endsWith('Z') && !str.includes('+')) {
    str = str.replace(' ', 'T') + 'Z'
  }
  const date = new Date(str)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatTime(value) {
  const date = parseUtcDate(value)
  if (!date) return ''
  return date.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDate(value) {
  const date = parseUtcDate(value)
  if (!date) return ''
  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatFullDateTime(value) {
  const date = parseUtcDate(value)
  if (!date) return ''
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatChatListTime(value) {
  const date = parseUtcDate(value)
  if (!date) return ''

  const now = new Date()
  const vnNowStr = now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
  const vnDateStr = date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

  if (vnNowStr === vnDateStr) {
    return date.toLocaleTimeString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const vnYesterdayStr = yesterday.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
  if (vnDateStr === vnYesterdayStr) {
    return 'Hôm qua'
  }

  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
  })
}

function formatUserStatus(user) {
  if (!user) return ''
  if (user.is_online) return 'Đang hoạt động'
  if (!user.last_seen) return 'Ngoại tuyến'

  const date = parseUtcDate(user.last_seen)
  if (!date) return 'Ngoại tuyến'

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return 'Vừa mới truy cập'
  if (diffMin < 60) return `Lần cuối ${diffMin} phút trước`
  if (diffHours < 24) return `Lần cuối ${diffHours} giờ trước`
  if (diffDays === 1) return 'Lần cuối hôm qua'
  if (diffDays < 7) return `Lần cuối ${diffDays} ngày trước`
  return `Lần cuối ${date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' })}`
}

function formatLastMessagePreview(friend, currentUser) {
  if (!friend.last_message) {
    return 'Chưa có tin nhắn nào'
  }
  const isMine = friend.last_message_sender_id === currentUser?.id
  const prefix = isMine ? 'Bạn: ' : ''
  const content = friend.last_message.trim()

  const att = parseAttachment(content)
  if (att) {
    return `${prefix}📎 ${att.fileName || 'Tệp đính kèm'}`
  }

  if (content.startsWith('data:image/') || /^https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s]*)?$/i.test(content)) {
    return `${prefix}📷 Hình ảnh`
  }

  if (content.startsWith('data:video/') || /^https?:\/\/[^\s]+?\.(?:mp4|webm|mov|ogg)(?:\?[^\s]*)?$/i.test(content)) {
    return `${prefix}🎥 Video`
  }

  return `${prefix}${content}`
}

function getFriendInitials(name) {
  if (!name || !name.trim()) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.trim().charAt(0).toUpperCase()
}

function getFirstCharGroup(name) {
  if (!name || !name.trim()) return '#'
  const first = name.trim().charAt(0).toUpperCase()
  if (first === 'Đ') return 'Đ'
  const base = first.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/^[A-Z]$/.test(base)) return base
  return '#'
}

function getAvatarGradient(seed) {
  const gradients = [
    'linear-gradient(135deg, #f97316, #fb923c)', // Warm orange (matching BT in user image)
    'linear-gradient(135deg, #6366f1, #3b82f6)', // Indigo blue
    'linear-gradient(135deg, #8b5cf6, #ec4899)', // Purple pink
    'linear-gradient(135deg, #10b981, #06b6d4)', // Emerald cyan
    'linear-gradient(135deg, #ef4444, #f59e0b)', // Amber red
    'linear-gradient(135deg, #0ea5e9, #6366f1)', // Sky indigo
  ]
  let hash = 0
  const str = String(seed || '')
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

function renderHighlightedSnippet(content, query) {
  if (!content) return null
  let text = content
  const att = parseAttachment(content)
  if (att) {
    text = `📎 ${att.fileName || 'Tệp đính kèm'}`
  } else if (content.startsWith('data:image/') || /^https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg)/i.test(content)) {
    text = '📷 Hình ảnh'
  } else if (content.startsWith('data:video/') || /^https?:\/\/[^\s]+?\.(?:mp4|webm|mov|ogg)/i.test(content)) {
    text = '🎥 Video'
  }

  const q = (query || '').trim()
  if (!q) return text

  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) {
    return text.length > 70 ? text.slice(0, 70) + '...' : text
  }

  const start = Math.max(0, idx - 25)
  const end = Math.min(text.length, idx + q.length + 35)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''
  const snippet = text.slice(start, end)

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = snippet.split(new RegExp(`(${escaped})`, 'gi'))

  return (
    <span>
      {prefix}
      {parts.map((part, pIdx) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={pIdx} className="tg-search-pill">
            {part}
          </mark>
        ) : (
          part
        )
      )}
      {suffix}
    </span>
  )
}

function isImageMessage(content) {
  if (!content) return false
  const trimmed = content.trim()
  return (
    trimmed.startsWith('data:image/') ||
    /^https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s]*)?$/i.test(trimmed)
  )
}

function formatFileSize(bytes) {
  if (!bytes || Number.isNaN(Number(bytes))) return 'Tệp đính kèm'
  const b = Number(bytes)
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function getFileBadgeType(name, type) {
  const n = (name || '').toLowerCase()
  const t = (type || '').toLowerCase()
  if (n.endsWith('.docx') || n.endsWith('.doc') || t.includes('word') || t.includes('officedocument.wordprocessingml')) return 'docx'
  if (n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv') || t.includes('sheet') || t.includes('excel')) return 'xlsx'
  if (n.endsWith('.pdf') || t.includes('pdf')) return 'pdf'
  if (n.endsWith('.zip') || n.endsWith('.rar') || n.endsWith('.7z') || t.includes('zip') || t.includes('compressed')) return 'zip'
  return 'generic'
}

function getFileIconSvg(name, type) {
  const badge = getFileBadgeType(name, type)
  if (badge === 'docx') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    )
  }
  if (badge === 'xlsx') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="8" y1="13" x2="16" y2="17"></line>
        <line x1="16" y1="13" x2="8" y2="17"></line>
      </svg>
    )
  }
  if (badge === 'pdf') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <path d="M10 12h1a2 2 0 1 0 0-4h-1v8"></path>
      </svg>
    )
  }
  if (badge === 'zip') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    )
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
      <polyline points="13 2 13 9 20 9"></polyline>
    </svg>
  )
}

function parseAttachment(content) {
  if (!content) return null
  const trimmed = content.trim()

  // 1. JSON attachment format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const p = JSON.parse(trimmed)
      if (p && (p.isAttachment || p.fileName)) {
        return {
          fileName: p.fileName || 'Tài liệu đính kèm',
          fileSize: p.fileSize,
          fileType: p.fileType || '',
          url: p.data || '',
        }
      }
    } catch { }
  }

  // 2. Data URL document (non-image, non-video)
  if (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/') && !trimmed.startsWith('data:video/')) {
    let fileName = 'Tài liệu.docx'
    let fileType = 'application/octet-stream'
    const mimeMatch = trimmed.match(/^data:([^;,]+)/)
    if (mimeMatch) fileType = mimeMatch[1]

    if (fileType.includes('pdf')) fileName = 'Tài liệu.pdf'
    else if (fileType.includes('sheet') || fileType.includes('excel')) fileName = 'Bảng tính.xlsx'
    else if (fileType.includes('word') || fileType.includes('officedocument')) fileName = 'Tài liệu Word.docx'
    else if (fileType.includes('presentation') || fileType.includes('powerpoint')) fileName = 'Bài thuyết trình.pptx'
    else if (fileType.includes('zip') || fileType.includes('rar')) fileName = 'Tệp nén.zip'

    return {
      fileName,
      fileSize: Math.round((trimmed.length * 3) / 4),
      fileType,
      url: trimmed,
    }
  }

  // 3. Raw base64 of Word docx or ZIP
  if (
    trimmed.includes('word/') ||
    trimmed.includes('docProps/') ||
    trimmed.startsWith('AIAAOcH') ||
    trimmed.startsWith('UEsDB')
  ) {
    const dataUrl = trimmed.startsWith('data:')
      ? trimmed
      : `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${trimmed}`
    return {
      fileName: 'Tài liệu Word.docx',
      fileSize: Math.round((trimmed.length * 3) / 4),
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      url: dataUrl,
    }
  }

  return null
}

// Xử lý tệp hình ảnh tải lên từ máy: tự động nén & tối ưu kích thước avatar (tối đa 512x512, JPEG 0.88 hoặc giữ nguyên SVG/GIF)
function processAvatarFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Chưa chọn tệp ảnh'))
    if (!file.type || !file.type.startsWith('image/')) {
      return reject(new Error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, GIF, WebP, SVG)'))
    }

    // Giữ nguyên vector SVG
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = () => resolve({
        dataUrl: reader.result,
        name: file.name,
        sizeText: formatFileSize(file.size)
      })
      reader.onerror = () => reject(new Error('Không thể đọc file SVG'))
      reader.readAsDataURL(file)
      return
    }

    // Giữ nguyên ảnh động GIF (dung lượng <= 2.5MB)
    if (file.type === 'image/gif' && file.size < 2.5 * 1024 * 1024) {
      const reader = new FileReader()
      reader.onload = () => resolve({
        dataUrl: reader.result,
        name: file.name,
        sizeText: formatFileSize(file.size)
      })
      reader.onerror = () => reject(new Error('Không thể đọc file GIF'))
      reader.readAsDataURL(file)
      return
    }

    // Nén và resize ảnh thông thường bằng HTML5 Canvas để avatar nhẹ, nét và tải tức thì
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          const maxDim = 512
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)

          const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
          const approxBytes = Math.round((dataUrl.length * 3) / 4)

          resolve({
            dataUrl,
            name: file.name,
            sizeText: formatFileSize(approxBytes)
          })
        } catch {
          resolve({
            dataUrl: e.target.result,
            name: file.name,
            sizeText: formatFileSize(file.size)
          })
        }
      }
      img.onerror = () => reject(new Error('Hình ảnh bị hỏng hoặc không mở được'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Lỗi khi đọc file từ máy tính'))
    reader.readAsDataURL(file)
  })
}

// Chuyển đổi link ảnh ngoài thành Base64 (data URL) để lưu trữ vĩnh viễn
function convertImageUrlToBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const maxDim = 512
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
        resolve(dataUrl)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Không thể chuyển đổi URL này qua CORS'))
    img.src = url
  })
}

// Xử lý và nén ảnh hình nền chat tải lên từ máy (tối đa 1920x1080 JPEG 0.85 để vừa sắc nét vừa nhẹ bộ nhớ)
function processWallpaperFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Chưa chọn tệp ảnh'))
    if (!file.type || !file.type.startsWith('image/')) {
      return reject(new Error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, GIF, WebP, SVG)'))
    }

    if (file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = () => resolve({
        dataUrl: reader.result,
        name: file.name,
        sizeText: formatFileSize(file.size)
      })
      reader.onerror = () => reject(new Error('Không thể đọc file SVG'))
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          const maxDim = 1920
          let width = img.width
          let height = img.height

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          const approxBytes = Math.round((dataUrl.length * 3) / 4)

          resolve({
            dataUrl,
            name: file.name,
            sizeText: formatFileSize(approxBytes)
          })
        } catch {
          resolve({
            dataUrl: e.target.result,
            name: file.name,
            sizeText: formatFileSize(file.size)
          })
        }
      }
      img.onerror = () => reject(new Error('Hình ảnh bị hỏng hoặc không mở được'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Lỗi khi đọc file'))
    reader.readAsDataURL(file)
  })
}

// Tạo mã QR Code có lồng Avatar người dùng ở trung tâm với độ phân giải cao
async function createQrCodeWithAvatar(text, avatarUrl, username) {
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, text, {
    width: 320,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })

  const ctx = canvas.getContext('2d')
  const size = canvas.width
  const centerSize = Math.round(size * 0.24)
  const cx = Math.round((size - centerSize) / 2)
  const cy = Math.round((size - centerSize) / 2)

  // Nền trắng bo góc bảo vệ avatar ở giữa
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
  ctx.shadowBlur = 8
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(cx - 4, cy - 4, centerSize + 8, centerSize + 8, 10)
  } else {
    ctx.rect(cx - 4, cy - 4, centerSize + 8, centerSize + 8)
  }
  ctx.fill()
  ctx.restore()

  if (avatarUrl) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = avatarUrl
      })

      ctx.save()
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(cx, cy, centerSize, centerSize, 8)
      } else {
        ctx.rect(cx, cy, centerSize, centerSize)
      }
      ctx.clip()
      ctx.drawImage(img, cx, cy, centerSize, centerSize)
      ctx.restore()
      return canvas.toDataURL('image/png')
    } catch {
      // Fallback nếu ảnh không load được
    }
  }

  // Chữ cái đại diện nếu không có avatar
  ctx.save()
  ctx.fillStyle = '#4f46e5'
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(cx, cy, centerSize, centerSize, 8)
  } else {
    ctx.rect(cx, cy, centerSize, centerSize)
  }
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(centerSize * 0.52)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const letter = (username || 'U').charAt(0).toUpperCase()
  ctx.fillText(letter, cx + centerSize / 2, cy + centerSize / 2)
  ctx.restore()

  return canvas.toDataURL('image/png')
}

// Xuất thẻ Card QR Poster hoàn chỉnh để tải về máy chia sẻ
async function downloadQrCardImage(qrDataUrl, user, remainingText) {
  const cardCanvas = document.createElement('canvas')
  cardCanvas.width = 460
  cardCanvas.height = 660
  const ctx = cardCanvas.getContext('2d')

  // Nền Gradient Dark Mode Telegram
  const grad = ctx.createLinearGradient(0, 0, 0, 660)
  grad.addColorStop(0, '#0f172a')
  grad.addColorStop(1, '#1e1b4b')
  ctx.fillStyle = grad
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(0, 0, 460, 660, 24)
  } else {
    ctx.rect(0, 0, 460, 660)
  }
  ctx.fill()

  // Header Title
  ctx.fillStyle = '#818cf8'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('☁️ CLOUDCHAT • MÃ QR KẾT BẠN', 230, 48)

  // Tên người dùng & Username
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 22px sans-serif'
  const name = user?.display_name || user?.username || 'CloudChat User'
  ctx.fillText(name.length > 24 ? name.slice(0, 24) + '...' : name, 230, 90)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '14px sans-serif'
  ctx.fillText(`@${user?.username || 'user'}`, 230, 115)

  // Khung trắng chứa QR Code
  ctx.fillStyle = '#ffffff'
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(70, 145, 320, 320, 18)
  } else {
    ctx.rect(70, 145, 320, 320)
  }
  ctx.fill()

  // Vẽ hình QR Code
  const qrImg = new Image()
  await new Promise((res) => {
    qrImg.onload = res
    qrImg.src = qrDataUrl
  })
  ctx.drawImage(qrImg, 80, 155, 300, 300)

  // Thời gian & lưu ý tự hủy
  ctx.fillStyle = '#f8fafc'
  ctx.font = 'bold 15px sans-serif'
  ctx.fillText(`⏳ ${remainingText}`, 230, 505)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '12px sans-serif'
  ctx.fillText('Quét bằng ứng dụng CloudChat hoặc Camera điện thoại', 230, 535)
  ctx.fillText('Mã bảo mật • Tự động hủy sau thời gian quy định', 230, 558)

  const link = document.createElement('a')
  link.download = `cloudchat-qr-${user?.username || 'friend'}.png`
  link.href = cardCanvas.toDataURL('image/png')
  link.click()
}

function App() {
  const [page, setPage] = useState('loading')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [registerDisplayName, setRegisterDisplayName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const [friends, setFriends] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])

  const [search, setSearch] = useState('')
  const [globalSearchResults, setGlobalSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Auto-hide scrollbars after 3 seconds of inactivity (show only when scrolling/mouse wheel)
  useEffect(() => {
    let scrollTimeout = null
    const handleScrollActivity = () => {
      document.body.classList.add('is-scrolling')
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      scrollTimeout = setTimeout(() => {
        document.body.classList.remove('is-scrolling')
      }, 3000)
    }

    window.addEventListener('scroll', handleScrollActivity, { capture: true, passive: true })
    window.addEventListener('wheel', handleScrollActivity, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScrollActivity, { capture: true })
      window.removeEventListener('wheel', handleScrollActivity)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [])

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileTab, setProfileTab] = useState('info') // 'info' | 'password'
  const [profileDisplayName, setProfileDisplayName] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  // External Avatar Source State
  const [avatarMethodTab, setAvatarMethodTab] = useState('upload') // 'upload' | 'url' | 'preset'
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const [avatarCheckingUrl, setAvatarCheckingUrl] = useState(false)
  const [avatarUrlStatus, setAvatarUrlStatus] = useState(null) // null | 'valid' | 'invalid'
  const [avatarConvertingBase64, setAvatarConvertingBase64] = useState(false)
  const [avatarDragOver, setAvatarDragOver] = useState(false)
  const [avatarFileMeta, setAvatarFileMeta] = useState(null)
  const avatarFileInputRef = useRef(null)

  // Telegram Hamburger Menu State (Image 2)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  // Telegram Folders Tab State (Image 1)
  const [folderTab, setFolderTab] = useState('all') // 'all' | 'friends' | 'requests'

  // Contacts Modal State
  const [showContactsModal, setShowContactsModal] = useState(false)
  const [friendRequests, setFriendRequests] = useState([])
  const [sentFriendRequests, setSentFriendRequests] = useState([])

  // Friend Requests Modal State (Quản lý lời mời đã nhận & đã gửi)
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false)
  const [friendRequestsModalTab, setFriendRequestsModalTab] = useState('received') // 'received' | 'sent'

  // Automatically switch back to 'all' if friendRequests becomes empty while on 'requests' tab
  useEffect(() => {
    if (folderTab === 'requests' && friendRequests.length === 0) {
      setFolderTab('all')
    }
  }, [folderTab, friendRequests.length])

  // Add Friend Modal State
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [searchFriendInput, setSearchFriendInput] = useState('')
  const [searchFriendResult, setSearchFriendResult] = useState(null)
  const [searchFriendError, setSearchFriendError] = useState('')
  const [searchFriendSuccess, setSearchFriendSuccess] = useState('')
  const [searchFriendLoading, setSearchFriendLoading] = useState(false)

  // Add Friend Tab State ('search' | 'qr_scan')
  const [addFriendTab, setAddFriendTab] = useState('search') // 'search' | 'qr_scan'
  const [qrScanInput, setQrScanInput] = useState('')
  const [qrScanning, setQrScanning] = useState(false)
  const [qrScanError, setQrScanError] = useState('')
  const [qrScanSuccess, setQrScanSuccess] = useState('')
  const [qrScanResult, setQrScanResult] = useState(null)
  const [qrCameraActive, setQrCameraActive] = useState(false)
  const [qrActionLoading, setQrActionLoading] = useState(false)
  const qrVideoRef = useRef(null)
  const qrStreamRef = useRef(null)
  const qrScanAnimFrameRef = useRef(null)
  const qrFileInputRef = useRef(null)

  // My QR Code Modal State (Mã QR kết bạn tự động spawn & set thời gian hủy)
  const [showMyQrModal, setShowMyQrModal] = useState(false)
  const [myQrData, setMyQrData] = useState(null)
  const [myQrLoading, setMyQrLoading] = useState(false)
  const [myQrTtl, setMyQrTtl] = useState(300) // 5 minutes default
  const [myQrRemainingSeconds, setMyQrRemainingSeconds] = useState(0)
  const [myQrImageUrl, setMyQrImageUrl] = useState('')
  const [myQrError, setMyQrError] = useState('')
  const [myQrSuccess, setMyQrSuccess] = useState('')
  const [myQrRevoking, setMyQrRevoking] = useState(false)
  const myQrCountdownRef = useRef(null)

  // Chat Wallpaper / Background Color State (Bảng màu sắc nét & Tự chọn mã màu)
  const [globalWallpaper, setGlobalWallpaper] = useState({
    type: 'default',
    value: '#0e1621',
  })
  const [chatWallpapers, setChatWallpapers] = useState({})
  const [showWallpaperModal, setShowWallpaperModal] = useState(false)
  const [wallpaperModalTab, setWallpaperModalTab] = useState('colors') // 'colors' | 'custom_picker' | 'upload'
  const [wallpaperScope, setWallpaperScope] = useState('chat') // 'chat' | 'global'
  const [tempWallpaper, setTempWallpaper] = useState({
    type: 'color',
    value: '#0e1621',
    name: 'Telegram Dark Cổ Điển',
  })
  const [customColorHex, setCustomColorHex] = useState('#0e1621')
  const [customColorInput, setCustomColorInput] = useState('#0e1621')
  const [colorInputStatus, setColorInputStatus] = useState('valid') // 'valid' | 'invalid' | 'empty'
  const [wallpaperUrlInput, setWallpaperUrlInput] = useState('')
  const [wallpaperUrlStatus, setWallpaperUrlStatus] = useState(null)
  const [wallpaperDragOver, setWallpaperDragOver] = useState(false)
  const [wallpaperFileMeta, setWallpaperFileMeta] = useState(null)
  const wallpaperFileInputRef = useRef(null)
  const [doubleClickAction, setDoubleClickAction] = useState(() => {
    try {
      return localStorage.getItem('cloudchat_dblclick_action') || 'next'
    } catch {
      return 'next'
    }
  })

  // Custom Nicknames State (Chỉ 1 mình mình thấy tên)
  const [nicknames, setNicknames] = useState({})
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')

  // In-Chat Search State (Nút tìm kiếm trong đoạn chat)
  const [showChatSearch, setShowChatSearch] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchIndex, setChatSearchIndex] = useState(0)

  // Conversation Info Panel State ("Thông tin hội thoại" - Nút i)
  const [showChatInfo, setShowChatInfo] = useState(false)
  const [accordionOpen, setAccordionOpen] = useState({
    media: true,
    files: true,
    links: true,
    wallpapers: true,
  })
  const [previewMediaUrl, setPreviewMediaUrl] = useState(null)
  const fileInputRef = useRef(null)

  // Reply & Share State
  const [replyingMessage, setReplyingMessage] = useState(null)
  const [sharingMessage, setSharingMessage] = useState(null)
  const [forwardSearchQuery, setForwardSearchQuery] = useState('')
  const [forwardSuccessMessage, setForwardSuccessMessage] = useState('')
  const [forwardSending, setForwardSending] = useState({})
  const [forwardSent, setForwardSent] = useState({})
  const [copyToast, setCopyToast] = useState('')
  const toastTimerRef = useRef(null)

  const showFloatingToast = (msg, duration = 2200) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setCopyToast(msg)
    toastTimerRef.current = setTimeout(() => {
      setCopyToast('')
    }, duration)
  }
  const msgInputRef = useRef(null)

  // Sync nicknames per user account
  useEffect(() => {
    if (!currentUser?.id) return
    try {
      const key = `cloudchat_nicknames_${currentUser.id}`
      const saved = localStorage.getItem(key)
      if (saved) {
        setNicknames(JSON.parse(saved))
      } else {
        setNicknames({})
      }
    } catch {
      setNicknames({})
    }
  }, [currentUser?.id])

  // Sync wallpapers per user account
  useEffect(() => {
    if (!currentUser?.id) return
    try {
      const globalKey = `cloudchat_global_wallpaper_${currentUser.id}`
      const savedGlobal = localStorage.getItem(globalKey)
      if (savedGlobal) {
        setGlobalWallpaper(JSON.parse(savedGlobal))
      } else {
        setGlobalWallpaper({ type: 'default', value: '', dim: 0.2, blur: 0 })
      }

      const chatsKey = `cloudchat_chat_wallpapers_${currentUser.id}`
      const savedChats = localStorage.getItem(chatsKey)
      if (savedChats) {
        setChatWallpapers(JSON.parse(savedChats))
      } else {
        setChatWallpapers({})
      }
    } catch {
      setGlobalWallpaper({ type: 'default', value: '', dim: 0.2, blur: 0 })
      setChatWallpapers({})
    }
  }, [currentUser?.id])

  // Resolve active wallpaper for activeChat or global fallback
  const currentChatWallpaper = useMemo(() => {
    if (activeChat && chatWallpapers[activeChat.id]) {
      return chatWallpapers[activeChat.id]
    }
    return globalWallpaper || { type: 'default', value: '', dim: 0.2, blur: 0 }
  }, [activeChat, chatWallpapers, globalWallpaper])

  const getFriendName = (friend) => {
    if (!friend) return ''
    if (nicknames[friend.id]) return nicknames[friend.id]
    return friend.display_name || friend.username
  }

  const handleSaveNickname = (friendId, newNickname) => {
    const trimmed = newNickname.trim()
    const updated = { ...nicknames }
    if (trimmed) {
      updated[friendId] = trimmed
    } else {
      delete updated[friendId]
    }
    setNicknames(updated)
    if (currentUser?.id) {
      localStorage.setItem(
        `cloudchat_nicknames_${currentUser.id}`,
        JSON.stringify(updated)
      )
    }
    setEditingNickname(false)
  }

  // Group and sort friends alphabetically for "Bạn bè" tab (Images A, B headers)
  const alphabeticalFriends = useMemo(() => {
    const sorted = [...friends].sort((a, b) => {
      const nameA = getFriendName(a).trim()
      const nameB = getFriendName(b).trim()
      return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' })
    })

    const groups = {}
    sorted.forEach((friend) => {
      const key = getFirstCharGroup(getFriendName(friend))
      if (!groups[key]) groups[key] = []
      groups[key].push(friend)
    })

    const keys = Object.keys(groups).sort((a, b) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b, 'vi')
    })

    return keys.map((key) => ({
      letter: key,
      items: groups[key],
    }))
  }, [friends, nicknames])

  // Reset in-chat search & info panel when activeChat changes
  useEffect(() => {
    setShowChatSearch(false)
    setChatSearchQuery('')
    setChatSearchIndex(0)
    setEditingNickname(false)
    setReplyingMessage(null)
  }, [activeChat?.id])

  // Global message search across all chats
  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setGlobalSearchResults([])
      setSearchLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      const token = localStorage.getItem('cloudchat_token')
      if (!token) return
      setSearchLoading(true)
      try {
        const response = await fetch(
          `${API_BASE}/api/protected/messages/search?q=${encodeURIComponent(q)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        const data = await response.json()
        if (data.success && data.results) {
          setGlobalSearchResults(data.results)
        }
      } catch (err) {
        console.error('Search messages error:', err)
      } finally {
        setSearchLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [search])

  const handleSelectSearchResult = (res) => {
    const friendObj = friends.find((f) => f.id === res.friend_id) || {
      id: res.friend_id,
      username: res.username,
      display_name: res.display_name,
      avatar_url: res.avatar_url,
    }
    setActiveChat(friendObj)
    setTimeout(() => {
      const el = document.getElementById(`msg-${res.id}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('search-active-bubble')
        setTimeout(() => el.classList.remove('search-active-bubble'), 2500)
      }
    }, 350)
  }

  // Calculate matching messages for in-chat search
  const matchingMessageIds = useMemo(() => {
    const q = chatSearchQuery.trim().toLowerCase()
    if (!q) return []
    return messages
      .filter((m) => m.content && m.content.toLowerCase().includes(q))
      .map((m) => m.id)
  }, [chatSearchQuery, messages])

  useEffect(() => {
    setChatSearchIndex(0)
  }, [chatSearchQuery])

  useEffect(() => {
    if (matchingMessageIds.length > 0) {
      const targetId = matchingMessageIds[chatSearchIndex]
      const el = document.getElementById(`msg-${targetId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [chatSearchIndex, matchingMessageIds])

  const handleNextSearchMatch = () => {
    if (matchingMessageIds.length === 0) return
    setChatSearchIndex((prev) => (prev + 1) % matchingMessageIds.length)
  }

  const handlePrevSearchMatch = () => {
    if (matchingMessageIds.length === 0) return
    setChatSearchIndex(
      (prev) => (prev - 1 + matchingMessageIds.length) % matchingMessageIds.length
    )
  }

  // Extract media, files and links exclusively from conversation messages
  const { chatMediaItems, chatFileItems, chatLinkItems } = useMemo(() => {
    const foundMedia = []
    const foundFiles = []
    const foundLinks = []

    messages.forEach((m) => {
      if (!m.content) return
      const text = m.content

      // Check media (images)
      const imgMatches = text.match(
        /(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s]*)?)|(data:image\/[a-z0-9+]+;base64,[^\s]+)/gi
      )
      if (imgMatches) {
        imgMatches.forEach((url) => {
          foundMedia.unshift({ id: m.id, type: 'image', url })
        })
      }

      // Check video
      const vidMatches = text.match(
        /(https?:\/\/[^\s]+?\.(?:mp4|webm|mov|ogg)(?:\?[^\s]*)?)|(data:video\/[a-z0-9+]+;base64,[^\s]+)/gi
      )
      if (vidMatches) {
        vidMatches.forEach((url) => {
          foundMedia.unshift({ id: m.id, type: 'video', url })
        })
      }

      // Check files
      const att = parseAttachment(text)
      if (att) {
        foundFiles.unshift({
          id: m.id,
          name: att.fileName,
          size: formatFileSize(att.fileSize),
          url: att.url,
          fileType: att.fileType,
          date: formatTime(m.created_at) || 'Hôm nay',
        })
      } else {
        const fileMatches = text.match(
          /https?:\/\/[^\s]+?\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|txt|csv)(?:\?[^\s]*)?/gi
        )
        if (fileMatches || m.type === 'file') {
          const fileName =
            text.split('/').pop()?.split('?')[0] || 'Tài liệu chia sẻ'
          foundFiles.unshift({
            id: m.id,
            name: fileName,
            size: 'Tệp đính kèm',
            url: text,
            date: formatTime(m.created_at) || 'Hôm nay',
          })
        }
      }

      // Check general links (only if not an attachment and not data URL)
      if (!att && !text.startsWith('data:')) {
        const linkMatches = text.match(/https?:\/\/[^\s]+/gi)
        if (linkMatches) {
          linkMatches.forEach((url) => {
            let domain = 'web'
            let iconType = 'generic'
            let title = url
            try {
              const u = new URL(url)
              domain = u.hostname
              if (domain.includes('github.com')) {
                iconType = 'github'
                title = u.pathname.slice(1) ? `GitHub - ${u.pathname.slice(1)}` : 'GitHub'
              } else if (domain.includes('meet.google.com')) {
                iconType = 'meet'
                title = 'Google Meet'
              } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
                iconType = 'meet'
                title = 'YouTube'
              } else {
                title = url
              }
            } catch { }

            foundLinks.unshift({
              id: m.id,
              url,
              title,
              domain,
              iconType,
              date: formatTime(m.created_at) || 'Hôm nay',
            })
          })
        }
      }
    })

    // ONLY return what was actually exchanged between the two users!
    return {
      chatMediaItems: foundMedia,
      chatFileItems: foundFiles,
      chatLinkItems: foundLinks,
    }
  }, [messages])

  // Snippet & Reply Helpers
  const getMessageSnippet = (rawContent) => {
    if (!rawContent) return 'Tin nhắn'
    const trimmed = rawContent.trim()
    const attachment = parseAttachment(trimmed)
    if (attachment) {
      return `📎 ${attachment.fileName}`
    }
    if (
      trimmed.startsWith('data:image/') ||
      /^https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s]*)?$/i.test(trimmed)
    ) {
      return '📷 Hình ảnh'
    }
    if (
      trimmed.startsWith('data:video/') ||
      /^https?:\/\/[^\s]+?\.(?:mp4|webm|mov|ogg)(?:\?[^\s]*)?$/i.test(trimmed)
    ) {
      return '🎥 Video'
    }
    if (trimmed.length > 75) {
      return trimmed.slice(0, 75) + '...'
    }
    return trimmed
  }

  const getReplyAuthorName = (item) => {
    if (item.reply_sender_id != null) {
      if (String(item.reply_sender_id) === String(currentUser?.id)) {
        return 'Bạn'
      }
      return (
        nicknames[item.reply_sender_id] ||
        item.reply_sender_name ||
        item.reply_sender_username ||
        getFriendName(activeChat)
      )
    }
    const found = messages.find((m) => m.id === item.reply_to_id)
    if (found) {
      if (String(found.sender_id) === String(currentUser?.id)) {
        return 'Bạn'
      }
      return (
        nicknames[found.sender_id] ||
        getFriendName(activeChat)
      )
    }
    return getFriendName(activeChat)
  }

  const getReplyContent = (item) => {
    if (item.reply_content) return item.reply_content
    const found = messages.find((m) => m.id === item.reply_to_id)
    return found?.content || ''
  }

  const scrollToMessage = (msgId) => {
    if (!msgId) return
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('pulse-highlight')
      setTimeout(() => {
        el.classList.remove('pulse-highlight')
      }, 1500)
    }
  }

  const handleStartReply = (msg) => {
    setReplyingMessage(msg)
    msgInputRef.current?.focus()
  }

  const handleStartShare = (msg) => {
    setSharingMessage(msg)
    setForwardSearchQuery('')
    setForwardSuccessMessage('')
    setForwardSending({})
    setForwardSent({})
  }

  const handleCopyMessage = (rawContent) => {
    if (!rawContent) return
    const attachment = parseAttachment(rawContent)
    const textToCopy = attachment ? attachment.fileName : rawContent
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopyToast('Đã sao chép tin nhắn!')
        setTimeout(() => setCopyToast(''), 2000)
      })
      .catch(() => {})
  }

  const handleForwardMessage = async (targetFriendId, msg) => {
    const token = localStorage.getItem('cloudchat_token')
    if (!token || !msg) return

    setForwardSending((prev) => ({ ...prev, [targetFriendId]: true }))
    try {
      const response = await fetch(
        `${API_BASE}/api/protected/messages/${targetFriendId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: msg.content,
          }),
        }
      )
      const data = await response.json()
      if (data.success) {
        setForwardSent((prev) => ({ ...prev, [targetFriendId]: true }))
        setForwardSuccessMessage('Đã chuyển tiếp tin nhắn thành công!')
        if (activeChat && activeChat.id === targetFriendId && data.message) {
          setMessages((prev) => [...prev, data.message])
        }
        loadFriends()
      }
    } catch (err) {
      console.error('Forward failed:', err)
    } finally {
      setForwardSending((prev) => ({ ...prev, [targetFriendId]: false }))
    }
  }

  // Handle attachment selection & sending
  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!activeChat) return
    const token = localStorage.getItem('cloudchat_token')
    if (!token) return

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước tệp tin tối đa là 5MB.')
      e.target.value = ''
      return
    }

    const replyId = replyingMessage?.id || null
    const reader = new FileReader()
    reader.onload = async () => {
      let content = reader.result
      // If it's a document/file (not image and not video), package as structured JSON attachment
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        content = JSON.stringify({
          isAttachment: true,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
          data: reader.result,
        })
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/protected/messages/${activeChat.id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              content,
              reply_to_id: replyId,
            }),
          }
        )

        const data = await response.json()
        if (data.success && data.message) {
          setMessages((current) => [...current, data.message])
          loadFriends()
          setReplyingMessage(null)
        }
      } catch (err) {
        console.error('Send attachment error:', err)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Handle clipboard paste (Ctrl + V to paste and send image)
  const handleInputPaste = async (e) => {
    const clipboardData = e.clipboardData
    if (!clipboardData) return

    const items = clipboardData.items
    let imageFile = null

    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith('image/')) {
        imageFile = items[i].getAsFile()
        break
      }
    }

    if (imageFile) {
      e.preventDefault()
      if (!activeChat) return
      const token = localStorage.getItem('cloudchat_token')
      if (!token) return

      const replyId = replyingMessage?.id || null
      const reader = new FileReader()
      reader.onload = async () => {
        const content = reader.result
        try {
          const response = await fetch(
            `${API_BASE}/api/protected/messages/${activeChat.id}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                content,
                reply_to_id: replyId,
              }),
            }
          )
          const data = await response.json()
          if (data.success && data.message) {
            setMessages((current) => [...current, data.message])
            loadFriends()
            setReplyingMessage(null)
          }
        } catch (err) {
          console.error('Paste send image error:', err)
        }
      }
      reader.readAsDataURL(imageFile)
    }
  }

  // Render message content with highlights, clickable links and file cards
  const renderMessageContent = (content, highlightQuery) => {
    if (!content) return null

    const trimmed = content.trim()

    // 1. Check if attachment (file, document, word, etc.)
    const attachment = parseAttachment(trimmed)
    if (attachment) {
      const badgeType = getFileBadgeType(attachment.fileName, attachment.fileType)
      return (
        <div className="tg-file-bubble">
          <div className={`tg-file-bubble-icon ${badgeType}`}>
            {getFileIconSvg(attachment.fileName, attachment.fileType)}
          </div>
          <div className="tg-file-bubble-info">
            <div className="tg-file-bubble-name" title={attachment.fileName}>
              {attachment.fileName}
            </div>
            <div className="tg-file-bubble-size">
              {formatFileSize(attachment.fileSize)}
            </div>
          </div>
          <a
            href={attachment.url || '#'}
            download={attachment.fileName}
            className="tg-file-download-btn"
            title={`Tải xuống ${attachment.fileName}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </a>
        </div>
      )
    }

    // 2. Check if whole message is directly an image
    const isStandaloneImageUrl =
      trimmed.startsWith('data:image/') ||
      /^https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s]*)?$/i.test(trimmed)

    if (isStandaloneImageUrl) {
      return (
        <img
          src={trimmed}
          alt="attachment"
          style={{
            maxWidth: '100%',
            maxHeight: 340,
            borderRadius: 14,
            display: 'block',
            cursor: 'pointer',
          }}
          onClick={() => setPreviewMediaUrl(trimmed)}
        />
      )
    }

    // 3. Check if whole message is directly a video
    const isStandaloneVideoUrl =
      trimmed.startsWith('data:video/') ||
      /^https?:\/\/[^\s]+?\.(?:mp4|webm|mov|ogg)(?:\?[^\s]*)?$/i.test(trimmed)

    if (isStandaloneVideoUrl) {
      return (
        <video
          controls
          src={trimmed}
          style={{ maxWidth: '100%', borderRadius: 12, display: 'block' }}
        />
      )
    }

    // 4. Tokenize content by URLs
    const urlPattern = /(https?:\/\/[^\s]+)/g
    const segments = content.split(urlPattern)
    const q = (highlightQuery || '').trim()

    return (
      <span>
        {segments.map((seg, segIdx) => {
          if (/^https?:\/\/[^\s]+$/i.test(seg)) {
            return (
              <a
                key={segIdx}
                href={seg}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#93c5fd',
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                }}
              >
                {seg}
              </a>
            )
          }

          if (q) {
            const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const qPattern = new RegExp(`(${escaped})`, 'gi')
            const parts = seg.split(qPattern)
            return parts.map((part, pIdx) =>
              part.toLowerCase() === q.toLowerCase() ? (
                <mark key={`${segIdx}-${pIdx}`} className="search-highlight">
                  {part}
                </mark>
              ) : (
                part
              )
            )
          }

          return seg
        })}
      </span>
    )
  }

  // Close hamburger menu on click outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [showMenu])

  const loadFriends = async () => {
    const token = localStorage.getItem('cloudchat_token')

    if (!token) return

    try {
      const response = await fetch(
        `${API_BASE}/api/protected/friends`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('Load friends failed:', data)
        return
      }

      const nextFriends = data.friends || []
      setFriends(nextFriends)

      if (nextFriends.length === 0) {
        setActiveChat(null)
        setMessages([])
        return
      }

      setActiveChat((current) => {
        if (current) {
          const updated = nextFriends.find((friend) => friend.id === current.id)
          if (updated) {
            return { ...current, ...updated }
          }
        }
        return null
      })
    } catch (error) {
      console.error('Load friends error:', error)
    }
  }

  const loadMessages = async (friendId, silent = false) => {
    const token = localStorage.getItem('cloudchat_token')

    if (!token || !friendId) return

    if (!silent) {
      setChatLoading(true)
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/protected/messages/${friendId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        if (!silent) {
          console.error('Load messages failed:', data)
          setMessages([])
        }
        return
      }

      const incoming = data.messages || []
      setMessages((prev) => {
        const hasChange =
          prev.length !== incoming.length ||
          prev.some((m, idx) => m.is_read !== incoming[idx]?.is_read)
        if (!hasChange) {
          return prev
        }
        loadFriends()
        return incoming
      })
    } catch (error) {
      if (!silent) {
        console.error('Load messages error:', error)
        setMessages([])
      }
    } finally {
      if (!silent) {
        setChatLoading(false)
      }
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('cloudchat_token')

    if (!token) {
      setPage('login')
      return
    }

    fetch(`${API_BASE}/api/protected/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Token không hợp lệ')
        }

        return response.json()
      })
      .then((data) => {
        setCurrentUser(data.user)
        setPage('chat')
      })
      .catch(() => {
        localStorage.removeItem('cloudchat_token')
        setCurrentUser(null)
        setPage('login')
      })
  }, [])

  useEffect(() => {
    if (!currentUser) return

    loadFriends()
    loadFriendRequests()
    loadSentFriendRequests()

    const interval = setInterval(() => {
      loadFriends()
      loadFriendRequests()
      loadSentFriendRequests()
    }, 10000)

    return () => clearInterval(interval)
  }, [currentUser])

  useEffect(() => {
    if (!activeChat?.id) {
      setMessages([])
      return
    }

    loadMessages(activeChat.id, false)

    const interval = setInterval(() => {
      loadMessages(activeChat.id, true)
    }, 2000)

    const handleFocus = () => {
      loadMessages(activeChat.id, true)
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [activeChat?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = message.trim()

    if (!text || !activeChat) return

    const token = localStorage.getItem('cloudchat_token')

    if (!token) return

    const replyId = replyingMessage?.id || null

    try {
      const response = await fetch(
        `${API_BASE}/api/protected/messages/${activeChat.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: text,
            reply_to_id: replyId,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('Send message failed:', data)
        return
      }

      if (data.message) {
        setMessages((current) => {
          if (current.some((m) => m.id === data.message.id)) {
            return current
          }
          return [...current, data.message]
        })
        loadFriends()
      }

      setMessage('')
      setReplyingMessage(null)
    } catch (error) {
      console.error('Send message error:', error)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()

    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập username và mật khẩu')
      return
    }

    setLoading(true)
    setError('')
    setAuthSuccess('')

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || 'Đăng nhập thất bại')
        return
      }

      localStorage.setItem('cloudchat_token', data.token)
      setCurrentUser(data.user)
      setPage('chat')
    } catch {
      setError('Không thể kết nối đến CloudChat Backend')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()

    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập username và mật khẩu')
      return
    }

    if (username.length < 3 || username.length > 30) {
      setError('Username phải từ 3 đến 30 ký tự')
      return
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setLoading(true)
    setError('')
    setAuthSuccess('')

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
          display_name: registerDisplayName.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || 'Đăng ký thất bại')
        return
      }

      setUsername('')
      setPassword('')
      setConfirmPassword('')
      setRegisterDisplayName('')
      setPage('login')
      setError('')
      setAuthSuccess('Đăng ký tài khoản thành công! Vui lòng đăng nhập.')
    } catch {
      setError('Không thể kết nối đến CloudChat Backend')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenProfileModal = () => {
    setProfileDisplayName(currentUser?.display_name || '')
    setProfileBio(currentUser?.bio || '')
    const curAvatar = currentUser?.avatar_url || ''
    setProfileAvatarUrl(curAvatar)
    setAvatarUrlInput(curAvatar.startsWith('http') ? curAvatar : '')
    setAvatarUrlStatus(curAvatar.startsWith('http') ? 'valid' : null)
    setAvatarFileMeta(curAvatar.startsWith('data:image/') ? { name: 'Ảnh tải lên từ thiết bị', size: '', status: 'ready' } : null)
    setAvatarMethodTab(curAvatar.startsWith('http') ? 'url' : 'upload')
    setAvatarDragOver(false)
    setProfileTab('info')
    setProfileError('')
    setProfileSuccess('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setShowProfileModal(true)
  }

  const handleProcessAvatarFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setProfileError('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, GIF, WebP, SVG)')
      return
    }
    setProfileError('')
    setProfileSuccess('')
    setAvatarFileMeta({ name: file.name, status: 'loading' })
    try {
      const result = await processAvatarFile(file)
      setProfileAvatarUrl(result.dataUrl)
      setAvatarFileMeta({ name: result.name, size: result.sizeText, status: 'ready' })
      setProfileSuccess(`Đã tải ảnh lên thành công: ${result.name} (${result.sizeText}). Nhấn "Lưu thay đổi" để áp dụng!`)
    } catch (err) {
      setProfileError(err.message || 'Lỗi khi xử lý hình ảnh')
      setAvatarFileMeta(null)
    }
  }

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleProcessAvatarFile(file)
    e.target.value = ''
  }

  const handleAvatarDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setAvatarDragOver(true)
  }

  const handleAvatarDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setAvatarDragOver(false)
  }

  const handleAvatarDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setAvatarDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setAvatarMethodTab('upload')
      await handleProcessAvatarFile(file)
    }
  }

  const handleProfilePaste = async (e) => {
    if (profileTab !== 'info') return
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          setAvatarMethodTab('upload')
          await handleProcessAvatarFile(file)
          break
        }
      }
    }
  }

  const handleApplyAvatarUrl = () => {
    const raw = (avatarUrlInput || '').trim()
    if (!raw) {
      setProfileError('Vui lòng nhập đường dẫn (URL) ảnh')
      return
    }
    if (!/^https?:\/\//i.test(raw) && !raw.startsWith('data:image/')) {
      setProfileError('Đường dẫn ảnh phải bắt đầu bằng https:// hoặc http://')
      return
    }

    setProfileError('')
    setProfileSuccess('')
    setAvatarCheckingUrl(true)
    setAvatarUrlStatus(null)

    const img = new Image()
    img.onload = () => {
      setAvatarCheckingUrl(false)
      setAvatarUrlStatus('valid')
      setProfileAvatarUrl(raw)
      setAvatarFileMeta(null)
      setProfileSuccess('Link ảnh hoạt động tốt! Nhấn "Lưu thay đổi" để áp dụng.')
    }
    img.onerror = () => {
      setAvatarCheckingUrl(false)
      setAvatarUrlStatus('invalid')
      setProfileError('Không thể tải ảnh từ URL này (trang web nguồn có thể chặn hoặc link không tồn tại). Bạn có thể tải ảnh về máy rồi dùng nút "Tải ảnh từ máy" nhé!')
    }
    img.src = raw
  }

  const handleSaveUrlAsBase64 = async () => {
    if (!profileAvatarUrl || profileAvatarUrl.startsWith('data:image/')) return
    setAvatarConvertingBase64(true)
    setProfileError('')
    try {
      const base64 = await convertImageUrlToBase64(profileAvatarUrl)
      setProfileAvatarUrl(base64)
      setProfileSuccess('Đã chuyển ảnh thành dữ liệu an toàn vĩnh viễn (không lo link bị chết)! Nhấn "Lưu thay đổi" để áp dụng.')
    } catch {
      setProfileError('Trang web gốc chặn tải dữ liệu trực tiếp (CORS). Link ảnh vẫn sẽ được lưu và hiển thị bình thường.')
    } finally {
      setAvatarConvertingBase64(false)
    }
  }

  const handleRemoveAvatar = () => {
    setProfileAvatarUrl('')
    setAvatarUrlInput('')
    setAvatarFileMeta(null)
    setAvatarUrlStatus(null)
    setProfileSuccess('Đã gỡ ảnh đại diện (quay về chữ cái mặc định). Nhấn "Lưu thay đổi" để áp dụng.')
  }

  const handleSelectPreset = (url) => {
    setProfileAvatarUrl(url)
    setAvatarUrlInput(url)
    setAvatarFileMeta(null)
    setAvatarUrlStatus('valid')
    setProfileSuccess('Đã chọn ảnh mẫu! Nhấn "Lưu thay đổi" để áp dụng.')
  }

  const handleUpdateProfile = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem('cloudchat_token')
    if (!token) return

    setProfileLoading(true)
    setProfileError('')
    setProfileSuccess('')

    try {
      const response = await fetch(`${API_BASE}/api/protected/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: profileDisplayName.trim(),
          bio: profileBio.trim(),
          avatar_url: profileAvatarUrl.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setProfileError(data.message || 'Cập nhật thất bại')
        return
      }

      setCurrentUser(data.user)
      setProfileSuccess('Cập nhật thông tin cá nhân thành công!')
    } catch {
      setProfileError('Không thể kết nối đến CloudChat Backend')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem('cloudchat_token')
    if (!token) return

    if (!currentPassword || !newPassword) {
      setProfileError('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới')
      return
    }

    if (newPassword.length < 6) {
      setProfileError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setProfileError('Mật khẩu mới xác nhận không khớp')
      return
    }

    setProfileLoading(true)
    setProfileError('')
    setProfileSuccess('')

    try {
      const response = await fetch(
        `${API_BASE}/api/protected/profile/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        setProfileError(data.message || 'Đổi mật khẩu thất bại')
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setProfileSuccess('Đổi mật khẩu thành công!')
    } catch {
      setProfileError('Không thể kết nối đến CloudChat Backend')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('cloudchat_token')
    setCurrentUser(null)
    setFriends([])
    setActiveChat(null)
    setMessages([])
    setMessage('')
    setPage('login')
    setUsername('')
    setPassword('')
    setError('')
    setAuthSuccess('')
    setShowPassword(false)
    setFriendRequests([])
    setSentFriendRequests([])
  }

  const loadFriendRequests = async () => {
    const token = localStorage.getItem('cloudchat_token')
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/api/protected/friends/requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setFriendRequests(data.requests || [])
      }
    } catch (e) {
      console.error('Load friend requests failed', e)
    }
  }

  const loadSentFriendRequests = async () => {
    const token = localStorage.getItem('cloudchat_token')
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/api/protected/friends/requests/sent`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setSentFriendRequests(data.requests || [])
      }
    } catch (e) {
      console.error('Load sent friend requests failed', e)
    }
  }

  const handleAcceptFriendRequest = async (friendshipId) => {
    const token = localStorage.getItem('cloudchat_token')
    if (!token) return
    try {
      const response = await fetch(
        `${API_BASE}/api/protected/friends/${friendshipId}/accept`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await response.json()
      if (data.success) {
        await loadFriends()
        await loadFriendRequests()
      } else {
        alert(data.message || 'Không thể chấp nhận lời mời')
      }
    } catch {
      alert('Không thể kết nối đến CloudChat Backend')
    }
  }

  const handleRejectFriendRequest = async (friendshipId) => {
    const token = localStorage.getItem('cloudchat_token')
    if (!token) return
    try {
      const response = await fetch(
        `${API_BASE}/api/protected/friends/${friendshipId}/reject`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await response.json()
      if (data.success) {
        await loadFriendRequests()
      } else {
        alert(data.message || 'Không thể từ chối lời mời')
      }
    } catch {
      alert('Không thể kết nối đến CloudChat Backend')
    }
  }

  const handleCancelFriendRequest = async (friendshipId) => {
    const token = localStorage.getItem('cloudchat_token')
    if (!token) return
    try {
      const response = await fetch(
        `${API_BASE}/api/protected/friends/${friendshipId}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await response.json()
      if (data.success) {
        await loadSentFriendRequests()
      } else {
        alert(data.message || 'Không thể thu hồi lời mời')
      }
    } catch {
      alert('Không thể kết nối đến CloudChat Backend')
    }
  }

  const handleSearchFriend = async (e) => {
    e.preventDefault()
    if (!searchFriendInput.trim()) return
    setSearchFriendLoading(true)
    setSearchFriendError('')
    setSearchFriendSuccess('')
    setSearchFriendResult(null)
    const token = localStorage.getItem('cloudchat_token')
    try {
      const response = await fetch(
        `${API_BASE}/api/protected/users/search?username=${encodeURIComponent(
          searchFriendInput.trim()
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        setSearchFriendError(data.message || 'Không tìm thấy người dùng')
      } else {
        setSearchFriendResult(data.user)
      }
    } catch {
      setSearchFriendError('Không thể kết nối đến CloudChat Backend')
    } finally {
      setSearchFriendLoading(false)
    }
  }

  const handleSendFriendRequest = async (targetId) => {
    const token = localStorage.getItem('cloudchat_token')
    if (!token) return
    setSearchFriendLoading(true)
    setSearchFriendError('')
    setSearchFriendSuccess('')
    try {
      const response = await fetch(
        `${API_BASE}/api/protected/friends/request/${targetId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        setSearchFriendError(data.message || 'Không thể gửi lời mời')
      } else {
        setSearchFriendSuccess('Đã gửi lời mời kết bạn thành công!')
        loadFriendRequests()
        loadSentFriendRequests()
      }
    } catch {
      setSearchFriendError('Không thể kết nối đến CloudChat Backend')
    } finally {
      setSearchFriendLoading(false)
    }
  }

  const handleCloseAddFriendModal = () => {
    handleStopQrCamera()
    setShowAddFriendModal(false)
    setSearchFriendResult(null)
    setSearchFriendError('')
    setSearchFriendSuccess('')
    setQrScanError('')
    setQrScanSuccess('')
    setQrScanResult(null)
  }

  const handleCloseMyQrModal = () => {
    setShowMyQrModal(false)
    if (myQrCountdownRef.current) {
      clearInterval(myQrCountdownRef.current)
      myQrCountdownRef.current = null
    }
  }

  // --- QR CODE METHODS ---
  const handleOpenMyQrModal = async () => {
    setShowMyQrModal(true)
    setMyQrError('')
    setMyQrSuccess('')

    const token = localStorage.getItem('cloudchat_token')
    if (!token) return

    setMyQrLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/protected/qr/active`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.qr) {
        setMyQrData(data.qr)
        setMyQrRemainingSeconds(data.qr.remaining_seconds)
        startMyQrCountdown(data.qr.expires_at)
        const qrUrl = await createQrCodeWithAvatar(
          `cloudchat:friend:${data.qr.code}`,
          currentUser?.avatar_url,
          currentUser?.username
        )
        setMyQrImageUrl(qrUrl)
      } else {
        // Tự động spawn mã QR mới ngay lập tức
        await handleGenerateMyQr(myQrTtl)
      }
    } catch {
      setMyQrError('Không thể tải mã QR')
    } finally {
      setMyQrLoading(false)
    }
  }

  const startMyQrCountdown = (expiresAt) => {
    if (myQrCountdownRef.current) {
      clearInterval(myQrCountdownRef.current)
    }
    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setMyQrRemainingSeconds(diff)
      if (diff <= 0) {
        if (myQrCountdownRef.current) {
          clearInterval(myQrCountdownRef.current)
          myQrCountdownRef.current = null
        }
      }
    }
    updateCountdown()
    myQrCountdownRef.current = setInterval(updateCountdown, 1000)
  }

  const handleGenerateMyQr = async (ttl) => {
    const ttlToUse = ttl || myQrTtl || 300
    setMyQrLoading(true)
    setMyQrError('')
    setMyQrSuccess('')
    const token = localStorage.getItem('cloudchat_token')
    if (!token) return

    try {
      const res = await fetch(`${API_BASE}/api/protected/qr/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ttl_seconds: ttlToUse }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setMyQrError(data.message || 'Không thể tạo mã QR')
        return
      }

      setMyQrData(data.qr)
      setMyQrTtl(data.qr.ttl_seconds)
      setMyQrRemainingSeconds(data.qr.ttl_seconds)
      startMyQrCountdown(data.qr.expires_at)

      const qrUrl = await createQrCodeWithAvatar(
        `cloudchat:friend:${data.qr.code}`,
        currentUser?.avatar_url,
        currentUser?.username
      )
      setMyQrImageUrl(qrUrl)
      setMyQrSuccess(`Đã tạo mã QR mới! Tự hủy sau ${formatCountdown(data.qr.ttl_seconds)}.`)
    } catch {
      setMyQrError('Không thể kết nối đến máy chủ CloudChat')
    } finally {
      setMyQrLoading(false)
    }
  }

  const handleRevokeMyQr = async () => {
    const token = localStorage.getItem('cloudchat_token')
    if (!token) return
    setMyQrRevoking(true)
    try {
      await fetch(`${API_BASE}/api/protected/qr/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (myQrCountdownRef.current) {
        clearInterval(myQrCountdownRef.current)
        myQrCountdownRef.current = null
      }
      setMyQrRemainingSeconds(0)
      setMyQrSuccess('Mã QR đã được hủy thành công!')
    } catch {
      setMyQrError('Không thể hủy mã QR')
    } finally {
      setMyQrRevoking(false)
    }
  }

  const handleDownloadQrCard = async () => {
    if (!myQrImageUrl) return
    const remainingText =
      myQrRemainingSeconds > 0
        ? `Còn hạn: ${formatCountdown(myQrRemainingSeconds)}`
        : 'Mã đã hết hạn'
    await downloadQrCardImage(myQrImageUrl, currentUser, remainingText)
  }

  const handleCopyQrCode = () => {
    if (!myQrData?.code) return
    const inviteLink = `${window.location.origin}/#friend_qr=${myQrData.code}`
    navigator.clipboard.writeText(inviteLink)
    setMyQrSuccess('Đã sao chép liên kết kết bạn vào bộ nhớ tạm!')
  }

  // --- QR SCANNER METHODS ---
  const handleStartQrCamera = async () => {
    setQrScanError('')
    setQrScanSuccess('')
    setQrScanResult(null)
    setQrCameraActive(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
      })
      qrStreamRef.current = stream
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream
        qrVideoRef.current.play()
        qrScanAnimFrameRef.current = requestAnimationFrame(tickQrScanVideo)
      }
    } catch {
      setQrCameraActive(false)
      setQrScanError('Không thể mở Camera / Webcam (chưa cấp quyền hoặc thiết bị không có camera). Bạn có thể tải ảnh mã QR lên để quét!')
    }
  }

  const handleStopQrCamera = () => {
    if (qrScanAnimFrameRef.current) {
      cancelAnimationFrame(qrScanAnimFrameRef.current)
      qrScanAnimFrameRef.current = null
    }
    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach((track) => track.stop())
      qrStreamRef.current = null
    }
    setQrCameraActive(false)
  }

  const tickQrScanVideo = () => {
    if (!qrVideoRef.current || qrVideoRef.current.readyState !== qrVideoRef.current.HAVE_ENOUGH_DATA) {
      qrScanAnimFrameRef.current = requestAnimationFrame(tickQrScanVideo)
      return
    }

    const video = qrVideoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code && code.data) {
      handleStopQrCamera()
      handleResolveQrCode(code.data)
      return
    }

    qrScanAnimFrameRef.current = requestAnimationFrame(tickQrScanVideo)
  }

  const handleScanQrFromFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setQrScanError('Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP...)')
      return
    }
    setQrScanError('')
    setQrScanSuccess('')
    setQrScanResult(null)
    setQrScanning(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, img.width, img.height)
          let code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })
          if (!code) {
            code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            })
          }

          setQrScanning(false)
          if (code && code.data) {
            handleResolveQrCode(code.data)
          } else {
            setQrScanError('Không tìm thấy mã QR trong ảnh này. Vui lòng kiểm tra lại ảnh hoặc thử ảnh khác!')
          }
        } catch {
          setQrScanning(false)
          setQrScanError('Lỗi khi phân tích hình ảnh mã QR')
        }
      }
      img.onerror = () => {
        setQrScanning(false)
        setQrScanError('Không thể mở tệp hình ảnh này')
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleResolveQrCode = async (rawString) => {
    if (!rawString) return
    let cleanCode = String(rawString).trim()
    if (cleanCode.includes('cloudchat:friend:')) {
      cleanCode = cleanCode.replace('cloudchat:friend:', '')
    } else if (cleanCode.includes('code=')) {
      const match = cleanCode.match(/code=([a-zA-Z0-9_-]+)/)
      if (match) cleanCode = match[1]
    } else if (cleanCode.includes('/add/')) {
      cleanCode = cleanCode.split('/add/').pop().split('?')[0]
    } else if (cleanCode.includes('#friend_qr=')) {
      cleanCode = cleanCode.split('#friend_qr=').pop().split('&')[0]
    }

    setQrScanning(true)
    setQrScanError('')
    setQrScanSuccess('')
    setQrScanResult(null)

    const token = localStorage.getItem('cloudchat_token')
    if (!token) return

    try {
      const res = await fetch(`${API_BASE}/api/protected/qr/resolve/${encodeURIComponent(cleanCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setQrScanError(data.message || 'Mã QR không hợp lệ hoặc đã hết hạn')
        return
      }

      setQrScanResult({
        ...data,
        resolvedCode: cleanCode,
      })
      setQrScanSuccess(`Đã tìm thấy tài khoản: ${data.user?.display_name || data.user?.username}`)
    } catch {
      setQrScanError('Không thể kết nối đến máy chủ CloudChat để kiểm tra mã')
    } finally {
      setQrScanning(false)
    }
  }

  const handleAddFriendViaQr = async (code) => {
    const token = localStorage.getItem('cloudchat_token')
    if (!token || !code) return

    setQrActionLoading(true)
    setQrScanError('')
    try {
      const res = await fetch(`${API_BASE}/api/protected/qr/add-friend/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setQrScanError(data.message || 'Kết bạn thất bại')
        return
      }

      setQrScanSuccess(data.message || 'Kết bạn thành công!')
      await loadFriends()
      if (qrScanResult?.user) {
        setActiveChat({
          id: qrScanResult.user.id,
          username: qrScanResult.user.username,
          display_name: qrScanResult.user.display_name,
          avatar_url: qrScanResult.user.avatar_url,
          bio: qrScanResult.user.bio,
        })
        setShowAddFriendModal(false)
      }
    } catch {
      setQrScanError('Không thể kết nối đến máy chủ CloudChat')
    } finally {
      setQrActionLoading(false)
    }
  }

  // --- CHAT WALLPAPER METHODS ---
  const handleOpenWallpaperModal = (scope = null) => {
    const targetScope = scope || (activeChat ? 'chat' : 'global')
    setWallpaperScope(targetScope)

    // Seed tempWallpaper from current chat or global
    let currentConfig = null
    if (targetScope === 'chat' && activeChat && chatWallpapers[activeChat.id]) {
      currentConfig = chatWallpapers[activeChat.id]
    } else {
      currentConfig = globalWallpaper
    }

    if (currentConfig && currentConfig.type !== 'default' && currentConfig.value) {
      setTempWallpaper({ ...currentConfig })
      setCustomColorInput(currentConfig.value)
      setColorInputStatus('valid')
      if (currentConfig.type === 'color' && currentConfig.value.startsWith('#') && currentConfig.value.length === 7) {
        setCustomColorHex(currentConfig.value)
      }
      if (currentConfig.type === 'custom') {
        setWallpaperModalTab('upload')
      } else {
        setWallpaperModalTab('colors')
      }
    } else {
      setTempWallpaper({
        type: 'color',
        value: '#0e1621',
        name: 'Telegram Dark Cổ Điển',
      })
      setCustomColorHex('#0e1621')
      setCustomColorInput('#0e1621')
      setColorInputStatus('valid')
      setWallpaperModalTab('colors')
    }

    setWallpaperFileMeta(null)
    setWallpaperUrlStatus(null)
    setShowWallpaperModal(true)
  }

  // Tự động nhận diện và đổi màu tức thì khi người dùng gõ mã màu (không giới hạn màu)
  const handleColorInputChange = (rawVal) => {
    setCustomColorInput(rawVal)
    const parsed = parseAndValidateColor(rawVal)
    if (parsed) {
      setTempWallpaper({
        type: parsed.type,
        value: parsed.value,
        name: `Mã màu: ${parsed.formatted}`,
      })
      if (parsed.type === 'color' && parsed.value.startsWith('#') && parsed.value.length === 7) {
        setCustomColorHex(parsed.value)
      }
      setColorInputStatus('valid')
    } else {
      setColorInputStatus(rawVal.trim() ? 'invalid' : 'empty')
    }
  }

  const handleSaveWallpaper = () => {
    if (!currentUser?.id) return

    if (wallpaperScope === 'global') {
      setGlobalWallpaper(tempWallpaper)
      try {
        localStorage.setItem(
          `cloudchat_global_wallpaper_${currentUser.id}`,
          JSON.stringify(tempWallpaper)
        )
      } catch (e) {
        console.error('Failed to save global wallpaper', e)
      }
    } else if (activeChat) {
      const updated = {
        ...chatWallpapers,
        [activeChat.id]: tempWallpaper,
      }
      setChatWallpapers(updated)
      try {
        localStorage.setItem(
          `cloudchat_chat_wallpapers_${currentUser.id}`,
          JSON.stringify(updated)
        )
      } catch (e) {
        console.error('Failed to save chat wallpaper', e)
      }
    }

    setShowWallpaperModal(false)
    showFloatingToast('🎨 Đã áp dụng hình nền thành công!')
  }

  const handleResetWallpaper = () => {
    if (!currentUser?.id) return

    if (wallpaperScope === 'global') {
      const resetConfig = { type: 'default', value: '', dim: 0.2, blur: 0 }
      setGlobalWallpaper(resetConfig)
      try {
        localStorage.removeItem(`cloudchat_global_wallpaper_${currentUser.id}`)
      } catch {}
      setTempWallpaper(resetConfig)
    } else if (activeChat) {
      const updated = { ...chatWallpapers }
      delete updated[activeChat.id]
      setChatWallpapers(updated)
      try {
        localStorage.setItem(
          `cloudchat_chat_wallpapers_${currentUser.id}`,
          JSON.stringify(updated)
        )
      } catch {}
      setTempWallpaper(globalWallpaper || { type: 'default', value: '', dim: 0.2, blur: 0 })
    }

    setShowWallpaperModal(false)
    showFloatingToast('↺ Đã đặt lại hình nền mặc định!')
  }

  const handleWallpaperFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await processWallpaperFile(file)
      setTempWallpaper((prev) => ({
        ...prev,
        type: 'custom',
        value: res.dataUrl,
      }))
      setWallpaperFileMeta({ name: res.name, size: res.sizeText })
    } catch (err) {
      alert(err.message || 'Lỗi khi tải ảnh')
    }
    e.target.value = ''
  }

  const handleWallpaperDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setWallpaperDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    try {
      const res = await processWallpaperFile(file)
      setTempWallpaper((prev) => ({
        ...prev,
        type: 'custom',
        value: res.dataUrl,
      }))
      setWallpaperFileMeta({ name: res.name, size: res.sizeText })
    } catch (err) {
      alert(err.message || 'Lỗi khi tải ảnh')
    }
  }

  const handleWallpaperPaste = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) {
          e.preventDefault()
          try {
            const res = await processWallpaperFile(file)
            setTempWallpaper((prev) => ({
              ...prev,
              type: 'custom',
              value: res.dataUrl,
            }))
            setWallpaperFileMeta({ name: 'Ảnh đã dán (Clipboard)', size: res.sizeText })
          } catch (err) {
            alert(err.message || 'Lỗi khi dán ảnh')
          }
          break
        }
      }
    }
  }

  const handleApplyWallpaperUrl = () => {
    const url = wallpaperUrlInput.trim()
    if (!url) return
    const img = new Image()
    img.onload = () => {
      setWallpaperUrlStatus('valid')
      setTempWallpaper((prev) => ({
        ...prev,
        type: 'url',
        value: url,
      }))
    }
    img.onerror = () => {
      setWallpaperUrlStatus('invalid')
    }
    img.src = url
  }

  // Chuyển đổi cử chỉ nhấp đúp nền chat (Đổi theme tức thì hoặc mở bảng cài đặt)
  const handleSetDoubleClickAction = (mode) => {
    setDoubleClickAction(mode)
    try {
      localStorage.setItem('cloudchat_dblclick_action', mode)
    } catch {}
    showFloatingToast(
      mode === 'next'
        ? `⚡ Nhấp đúp: Tự động đổi màu nền kế tiếp (${CHAT_COLOR_PRESETS.length} màu)`
        : '⚙️ Nhấp đúp: Mở bảng chọn màu nền'
    )
  }

  // Tự động xoay vòng sang màu/gradient tiếp theo trong danh sách bảng màu
  const handleCycleNextWallpaper = () => {
    if (CHAT_COLOR_PRESETS.length === 0) return

    const currentVal = currentChatWallpaper?.value || ''
    const currentIndex = CHAT_COLOR_PRESETS.findIndex((p) => p.value === currentVal)
    const nextIndex = (currentIndex + 1) % CHAT_COLOR_PRESETS.length
    const nextTheme = CHAT_COLOR_PRESETS[nextIndex]

    const nextConfig = {
      type: nextTheme.type,
      value: nextTheme.value,
      name: nextTheme.name,
    }

    if (activeChat) {
      const updated = {
        ...chatWallpapers,
        [activeChat.id]: nextConfig,
      }
      setChatWallpapers(updated)
      if (currentUser?.id) {
        try {
          localStorage.setItem(
            `cloudchat_chat_wallpapers_${currentUser.id}`,
            JSON.stringify(updated)
          )
        } catch {}
      }
    } else {
      setGlobalWallpaper(nextConfig)
      if (currentUser?.id) {
        try {
          localStorage.setItem(
            `cloudchat_global_wallpaper_${currentUser.id}`,
            JSON.stringify(nextConfig)
          )
        } catch {}
      }
    }

    showFloatingToast(`🎨 Đã đổi màu nền: ${nextTheme.name} (${nextTheme.num}/${CHAT_COLOR_PRESETS.length})`)
  }

  // Bắt sự kiện nhấp đúp (Double-Click) vào khoảng trống hình nền chat
  const handleChatBackgroundDoubleClick = (e) => {
    // Bỏ qua nếu người dùng click trúng bong bóng tin nhắn, nút thao tác, avatar, input, link, media
    const interactiveTarget = e.target.closest(
      '.tg-msg-bubble, .tg-msg-row, .tg-msg-actions, .tg-msg-act-btn, ' +
      '.tg-avatar, .tg-inchat-search-bar, .tg-chat-input-area, .tg-header, ' +
      '.tg-info-panel, button, input, textarea, a, img, video, [role="button"]'
    )
    if (interactiveTarget) return

    // Xóa bôi đen văn bản tự nhiên khi click 2 lần trên nền trống
    if (window.getSelection) {
      window.getSelection().removeAllRanges()
    }

    e.preventDefault()
    e.stopPropagation()

    if (doubleClickAction === 'modal') {
      handleOpenWallpaperModal('chat')
    } else {
      handleCycleNextWallpaper()
    }
  }

  const filteredFriends = friends.filter((friend) => {
    const query = search.toLowerCase()
    const nameMatch = getFriendName(friend).toLowerCase().includes(query)
    const usernameMatch = friend.username.toLowerCase().includes(query)
    return nameMatch || usernameMatch
  })

  if (page === 'loading') {
    return (
      <div className="auth-page">
        <div className="auth-card loading-card">
          <div className="auth-brand-badge pulse-logo">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
            </svg>
          </div>
          <h1 className="auth-title">CloudChat</h1>
          <p className="auth-subtitle">Đang khởi tạo kết nối bảo mật...</p>
          <div className="tg-spinner" style={{ marginTop: 24 }}></div>
        </div>
      </div>
    )
  }

  if (page === 'login') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-brand-badge">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
              </svg>
            </div>
            <h1 className="auth-title">CloudChat</h1>
            <p className="auth-subtitle">Nền tảng nhắn tin bảo mật & kết nối đám mây</p>
          </div>

          {/* Pill Tabs Switcher */}
          <div className="auth-tabs">
            <button
              type="button"
              className="auth-tab active"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className="auth-tab"
              onClick={() => {
                setError('')
                setAuthSuccess('')
                setPassword('')
                setConfirmPassword('')
                setPage('register')
              }}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-label">Tài khoản (Username)</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Nhập username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Mật khẩu</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-input-toggle-btn"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {authSuccess && (
              <div className="auth-alert-box success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{authSuccess}</span>
              </div>
            )}

            {error && (
              <div className="auth-alert-box error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="tg-spinner sm"></span>
                  <span>Đang đăng nhập...</span>
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <span>Chưa có tài khoản?</span>
            <button
              type="button"
              onClick={() => {
                setError('')
                setAuthSuccess('')
                setPassword('')
                setConfirmPassword('')
                setPage('register')
              }}
            >
              Đăng ký ngay
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (page === 'register') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-brand-badge">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
              </svg>
            </div>
            <h1 className="auth-title">Tạo tài khoản mới</h1>
            <p className="auth-subtitle">Trở thành thành viên của cộng đồng CloudChat</p>
          </div>

          {/* Pill Tabs Switcher */}
          <div className="auth-tabs">
            <button
              type="button"
              className="auth-tab"
              onClick={() => {
                setError('')
                setAuthSuccess('')
                setPassword('')
                setConfirmPassword('')
                setPage('login')
              }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className="auth-tab active"
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-label">Tên hiển thị (Tùy chọn)</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Ví dụ: Duy Khang"
                  value={registerDisplayName}
                  onChange={(event) => setRegisterDisplayName(event.target.value)}
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Username</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Nhập username (3-30 ký tự)"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Mật khẩu</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ít nhất 6 ký tự"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-input-toggle-btn"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Xác nhận mật khẩu</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="auth-alert-box error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="tg-spinner sm"></span>
                  <span>Đang tạo tài khoản...</span>
                </span>
              ) : (
                'Tạo tài khoản'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <span>Đã có tài khoản?</span>
            <button
              type="button"
              onClick={() => {
                setError('')
                setAuthSuccess('')
                setPassword('')
                setConfirmPassword('')
                setRegisterDisplayName('')
                setPage('login')
              }}
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`telegram-app ${activeChat ? 'has-active-chat' : ''}`}>
      {/* Telegram Floating Left Sidebar */}
      <aside className="tg-sidebar">
        {/* Top Header: Hamburger Button + Search Bar */}
        <div className="tg-sidebar-header">
          <div className="tg-menu-wrapper" ref={menuRef}>
            <button
              className={`tg-menu-btn ${showMenu ? 'active' : ''}`}
              onClick={() => setShowMenu((prev) => !prev)}
              title="Menu"
              aria-label="Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              {friendRequests.length > 0 && <span className="tg-menu-badge-dot" />}
            </button>

            {/* Telegram Hamburger Dropdown Menu (Image 2) */}
            {showMenu && (
              <div className="tg-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                {/* User Info Header */}
                <div
                  className="tg-menu-user"
                  onClick={() => {
                    setShowMenu(false)
                    handleOpenProfileModal()
                  }}
                  title="Xem hồ sơ & Đổi ảnh đại diện"
                >
                  <div className="tg-avatar sm tg-menu-avatar-wrap">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt=""
                        className="avatar-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      (currentUser?.display_name || currentUser?.username || 'U').charAt(0).toUpperCase()
                    )}
                    <span className="tg-menu-avatar-badge" title="Đổi ảnh đại diện">📷</span>
                  </div>
                  <div className="tg-menu-user-info">
                    <strong>{currentUser?.display_name || currentUser?.username || 'DuyKhang'}</strong>
                    <span>@{currentUser?.username || 'user'}</span>
                  </div>
                </div>

                <div className="tg-menu-divider" />

                {/* ➕ Thêm bạn bè */}
                <button
                  className="tg-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    setShowAddFriendModal(true)
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                  </span>
                  <span>Thêm bạn bè</span>
                </button>

                {/* 📷 Mã QR của tôi */}
                <button
                  className="tg-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    handleOpenMyQrModal()
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </span>
                  <span>Mã QR của tôi</span>
                  <span className="tg-menu-badge" style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#818cf8', fontSize: 10 }}>Mới</span>
                </button>

                {/* 🎨 Hình nền trò chuyện */}
                <button
                  className="tg-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    handleOpenWallpaperModal(activeChat ? 'chat' : 'global')
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.21-.64-1.67-.4-.45-.64-1.04-.64-1.66 0-1.38 1.12-2.5 2.5-2.5H18c3.31 0 6-2.69 6-6 0-4.96-5.37-7.67-12-7.67z"></path>
                      <circle cx="6.5" cy="11.5" r="1.5"></circle>
                      <circle cx="9.5" cy="7.5" r="1.5"></circle>
                      <circle cx="14.5" cy="7.5" r="1.5"></circle>
                      <circle cx="17.5" cy="11.5" r="1.5"></circle>
                    </svg>
                  </span>
                  <span>Hình nền trò chuyện</span>
                  <span className="tg-menu-badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontSize: 10 }}>10 Theme</span>
                </button>

                {/* 👤 My Profile */}
                <button
                  className="tg-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    handleOpenProfileModal()
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <span>Hồ sơ</span>
                </button>

                {/* 👥 Bạn bè */}
                <button
                  className="tg-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    setFolderTab('friends')
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </span>
                  <span>Bạn bè</span>
                  <span className="tg-menu-badge">{friends.length}</span>
                </button>

                {/* ✉️ Lời mời kết bạn */}
                <button
                  className="tg-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    loadFriendRequests()
                    loadSentFriendRequests()
                    setFriendRequestsModalTab(friendRequests.length > 0 ? 'received' : 'sent')
                    setShowFriendRequestsModal(true)
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <polyline points="17 11 19 13 23 9"></polyline>
                    </svg>
                  </span>
                  <span>Lời mời kết bạn</span>
                  {friendRequests.length > 0 ? (
                    <span className="tg-menu-badge tg-badge-highlight">{friendRequests.length}</span>
                  ) : sentFriendRequests.length > 0 ? (
                    <span className="tg-menu-badge">{sentFriendRequests.length}</span>
                  ) : (
                    <span className="tg-menu-badge">0</span>
                  )}
                </button>

                {/* ⚙ Settings */}
                <button
                  className="tg-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    handleOpenProfileModal()
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </span>
                  <span>Cài đặt</span>
                </button>

                <div className="tg-menu-divider" />

                {/* Log Out */}
                <button
                  className="tg-menu-item danger"
                  onClick={() => {
                    setShowMenu(false)
                    handleLogout()
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                  </span>
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>

          {/* Telegram Search Bar */}
          <div className="tg-search-bar">
            <svg className="tg-search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="tg-search-clear"
                onClick={() => setSearch('')}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Global Search Results OR Telegram Folders & Chat List */}
        {search.trim() ? (
          <>
            <div className="tg-search-category-bar">
              <div className="tg-search-pill-category active">
                Tin nhắn <span>({globalSearchResults.length})</span>
              </div>
            </div>

            <div className="tg-chat-list">
              {searchLoading ? (
                <div className="tg-empty-list">
                  <div className="tg-spinner" style={{ margin: '20px auto' }} />
                  <p>Đang tìm kiếm tin nhắn...</p>
                </div>
              ) : globalSearchResults.length > 0 ? (
                globalSearchResults.map((res) => {
                  const friendObj = friends.find((f) => f.id === res.friend_id) || {
                    id: res.friend_id,
                    username: res.username,
                    display_name: res.display_name,
                    avatar_url: res.avatar_url,
                  }
                  const displayName = getFriendName(friendObj)
                  const isSelected = activeChat?.id === res.friend_id

                  return (
                    <button
                      className={`tg-chat-item tg-search-result-item ${isSelected ? 'active' : ''}`}
                      key={`search-msg-${res.id}`}
                      onClick={() => handleSelectSearchResult(res)}
                    >
                      <div className="tg-avatar">
                        {res.avatar_url ? (
                          <img
                            src={res.avatar_url}
                            alt={res.username}
                            className="avatar-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          displayName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="tg-chat-info">
                        <div className="tg-chat-top">
                          <span className="tg-chat-name" title={displayName}>
                            {displayName}
                          </span>
                          <span className="tg-chat-time">
                            {formatChatListTime(res.created_at)}
                          </span>
                        </div>
                        <div className="tg-chat-bottom">
                          <div className="tg-chat-preview tg-search-snippet">
                            {renderHighlightedSnippet(res.content, search)}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="tg-empty-list">
                  <p>Không tìm thấy tin nhắn nào chứa "{search}"</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Folders / Tabs Bar (Pill style matching user screenshot) */}
            <div className="tg-folders-bar">
              <button
                className={`tg-folder-tab ${folderTab === 'all' ? 'active' : ''}`}
                onClick={() => setFolderTab('all')}
              >
                <span>Tất cả</span>
              </button>
              <button
                className={`tg-folder-tab ${folderTab === 'friends' ? 'active' : ''}`}
                onClick={() => setFolderTab('friends')}
              >
                <span>Bạn bè</span>
              </button>
              {friendRequests.length > 0 && (
                <button
                  className={`tg-folder-tab ${folderTab === 'requests' ? 'active' : ''}`}
                  onClick={() => setFolderTab('requests')}
                >
                  <span>Lời mời</span>
                  <span className="tg-tab-badge">{friendRequests.length}</span>
                </button>
              )}
            </div>

            {/* Chat / Friends / Requests List */}
            <div className="tg-chat-list">
              {folderTab === 'requests' ? (
                friendRequests.length > 0 ? (
                  <div className="tg-friend-requests-list">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 6px 6px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#8b96a7', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                        Lời mời đã nhận ({friendRequests.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          loadSentFriendRequests()
                          setFriendRequestsModalTab('sent')
                          setShowFriendRequestsModal(true)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#8774e1',
                          fontSize: 12,
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: '2px 4px',
                        }}
                        title="Xem và thu hồi lời mời bạn đã gửi"
                      >
                        Đã gửi ({sentFriendRequests.length}) ↗
                      </button>
                    </div>
                    {friendRequests.map((req) => {
                      const reqName = req.display_name || req.username
                      return (
                        <div className="tg-friend-req-card" key={req.id}>
                          <div className="tg-friend-req-user">
                            <div
                              className="tg-avatar sm"
                              style={{
                                background: !req.avatar_url
                                  ? getAvatarGradient(req.user_id || req.username)
                                  : undefined,
                              }}
                            >
                              {req.avatar_url ? (
                                <img
                                  src={req.avatar_url}
                                  alt=""
                                  className="avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                getFriendInitials(reqName)
                              )}
                            </div>
                            <div className="tg-friend-req-info">
                              <div className="tg-friend-req-top">
                                <span className="tg-friend-req-name" title={reqName}>
                                  {reqName}
                                </span>
                                <span className="tg-friend-req-time">
                                  {formatChatListTime(req.created_at)}
                                </span>
                              </div>
                              <span className="tg-friend-req-uname">@{req.username}</span>
                              {req.bio && <p className="tg-friend-req-bio">{req.bio}</p>}
                            </div>
                          </div>

                          <div className="tg-friend-req-actions">
                            <button
                              className="tg-req-accept-btn"
                              onClick={() => handleAcceptFriendRequest(req.id)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              Đồng ý
                            </button>
                            <button
                              className="tg-req-reject-btn"
                              onClick={() => handleRejectFriendRequest(req.id)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                              Từ chối
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="tg-empty-list">
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
                    <p>Không có lời mời kết bạn nào</p>
                    <span style={{ fontSize: 12, color: '#727e90', display: 'block', maxWidth: 220, margin: '4px auto 0' }}>
                      Khi có người gửi lời mời, bạn có thể đồng ý hoặc từ chối tại đây.
                    </span>
                    <button
                      className="secondary-button"
                      style={{ marginTop: 14, fontSize: 12, padding: '7px 14px' }}
                      onClick={() => setShowAddFriendModal(true)}
                    >
                      + Thêm bạn bè mới
                    </button>
                  </div>
                )
              ) : friends.length > 0 ? (
                folderTab === 'all' ? (
                  friends.map((friend) => (
                    <button
                      className={`tg-chat-item ${activeChat?.id === friend.id ? 'active' : ''}`}
                      key={friend.id}
                      onClick={() => setActiveChat(friend)}
                    >
                      <div
                        className="tg-avatar"
                        style={{
                          background: !friend.avatar_url
                            ? getAvatarGradient(friend.id || friend.username)
                            : undefined,
                        }}
                      >
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt={friend.username}
                            className="avatar-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          getFriendInitials(getFriendName(friend))
                        )}
                        <div className={`tg-online-dot ${friend.is_online ? 'online' : 'offline'}`} />
                      </div>

                      <div className="tg-chat-info">
                        <div className="tg-chat-top">
                          <span className="tg-chat-name">
                            {getFriendName(friend)}
                          </span>
                          <span className="tg-chat-time">
                            {formatChatListTime(friend.last_message_time)}
                          </span>
                        </div>
                        <div className="tg-chat-bottom">
                          <span className="tg-chat-preview">
                            {formatLastMessagePreview(friend, currentUser)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  alphabeticalFriends.map((group) => (
                    <div key={group.letter} className="tg-friend-group">
                      <div className="tg-friend-group-header">{group.letter}</div>
                      {group.items.map((friend) => (
                        <button
                          className={`tg-chat-item tg-friend-item ${activeChat?.id === friend.id ? 'active' : ''}`}
                          key={friend.id}
                          onClick={() => setActiveChat(friend)}
                        >
                          <div
                            className="tg-avatar"
                            style={{
                              background: !friend.avatar_url
                                ? getAvatarGradient(friend.id || friend.username)
                                : undefined,
                            }}
                          >
                            {friend.avatar_url ? (
                              <img
                                src={friend.avatar_url}
                                alt=""
                                className="avatar-img"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              getFriendInitials(getFriendName(friend))
                            )}
                            <div className={`tg-online-dot ${friend.is_online ? 'online' : 'offline'}`} />
                          </div>

                          <div className="tg-chat-info">
                            <div className="tg-chat-top">
                              <span className="tg-chat-name">
                                {getFriendName(friend)}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))
                )
              ) : (
                <div className="tg-empty-list">
                  <p>Chưa có bạn bè nào.</p>
                  <button
                    className="secondary-button"
                    style={{ marginTop: 10, fontSize: 12, padding: '7px 14px' }}
                    onClick={() => setShowAddFriendModal(true)}
                  >
                    + Thêm bạn bè để bắt đầu
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Telegram Right Main Area: When no chat is clicked, shows wallpaper with centered pill */}
      <main className="tg-main-area">
        {/* Dynamic Chat Color / Background Layer (Màu nền thuần túy sắc nét 100%, không mờ) */}
        {currentChatWallpaper && currentChatWallpaper.value && (
          <div
            className="tg-wallpaper-layer"
            style={{
              background:
                currentChatWallpaper.type === 'custom' || currentChatWallpaper.type === 'url'
                  ? `url("${currentChatWallpaper.value}") center/cover no-repeat`
                  : currentChatWallpaper.value,
            }}
          />
        )}

        {activeChat ? (
          <div className="tg-chat-window">
            {/* Chat Header */}
            <header className="tg-chat-header">
              <div
                className="tg-chat-header-left"
                style={{ cursor: 'pointer' }}
                onClick={() => setShowChatInfo((prev) => !prev)}
                title="Bấm để xem thông tin hội thoại"
              >
                <button
                  className="tg-icon-btn tg-back-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveChat(null)
                  }}
                  title="Quay lại danh sách chat"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
                <div className="tg-avatar sm">
                  {activeChat.avatar_url ? (
                    <img
                      src={activeChat.avatar_url}
                      alt={activeChat.username}
                      className="avatar-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    getFriendName(activeChat).charAt(0).toUpperCase()
                  )}
                  <div className={`tg-online-dot ${activeChat.is_online ? 'online' : 'offline'}`} />
                </div>
                <div className="tg-header-details">
                  <strong>{getFriendName(activeChat)}</strong>
                  <span className={`tg-header-status ${activeChat.is_online ? 'online' : 'offline'}`}>
                    {formatUserStatus(activeChat)}
                  </span>
                </div>
              </div>

              <div className="tg-header-actions">
                {/* Nút Đổi hình nền cuộc trò chuyện */}
                <button
                  className="tg-icon-btn"
                  title="Đổi hình nền cuộc trò chuyện (10 Theme 3D hoặc tải ảnh từ máy)"
                  onClick={() => handleOpenWallpaperModal('chat')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.21-.64-1.67-.4-.45-.64-1.04-.64-1.66 0-1.38 1.12-2.5 2.5-2.5H18c3.31 0 6-2.69 6-6 0-4.96-5.37-7.67-12-7.67z"></path>
                    <circle cx="6.5" cy="11.5" r="1.5"></circle>
                    <circle cx="9.5" cy="7.5" r="1.5"></circle>
                    <circle cx="14.5" cy="7.5" r="1.5"></circle>
                    <circle cx="17.5" cy="11.5" r="1.5"></circle>
                  </svg>
                </button>

                {/* Nút tìm kiếm trong đoạn chat */}
                <button
                  className={`tg-icon-btn ${showChatSearch ? 'active' : ''}`}
                  title="Tìm kiếm trong đoạn chat"
                  onClick={() => setShowChatSearch((prev) => !prev)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>

                {/* Nút i để xem Thông tin hội thoại */}
                <button
                  className={`tg-icon-btn ${showChatInfo ? 'active' : ''}`}
                  title="Thông tin hội thoại"
                  onClick={() => setShowChatInfo((prev) => !prev)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </button>
              </div>
            </header>

            {/* In-chat Search Bar (Thanh tìm kiếm trong đoạn chat) */}
            {showChatSearch && (
              <div className="tg-inchat-search-bar">
                <div className="tg-inchat-search-input-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#727e90' }}>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    placeholder="Tìm kiếm tin nhắn trong đoạn chat..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {chatSearchQuery && (
                    <span className="tg-search-count-badge">
                      {matchingMessageIds.length > 0
                        ? `${chatSearchIndex + 1} / ${matchingMessageIds.length}`
                        : '0 kết quả'}
                    </span>
                  )}
                </div>

                <div className="tg-inchat-search-actions">
                  <button
                    className="tg-search-nav-btn"
                    title="Tin nhắn trước"
                    onClick={handlePrevSearchMatch}
                    disabled={matchingMessageIds.length === 0}
                  >
                    ▲
                  </button>
                  <button
                    className="tg-search-nav-btn"
                    title="Tin nhắn tiếp theo"
                    onClick={handleNextSearchMatch}
                    disabled={matchingMessageIds.length === 0}
                  >
                    ▼
                  </button>
                  <button
                    className="tg-search-nav-btn"
                    title="Đóng tìm kiếm"
                    onClick={() => {
                      setShowChatSearch(false)
                      setChatSearchQuery('')
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Telegram Messages Scroll */}
            <div
              className="tg-messages-scroll"
              onDoubleClick={handleChatBackgroundDoubleClick}
              title="Nhấp đúp chuột 2 lần vào nền để đổi giao diện"
            >
              {chatLoading ? (
                <div className="tg-messages-loading">
                  <div className="tg-spinner" />
                  <span>Đang tải tin nhắn...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="tg-empty-chat-state">
                  <div className="tg-avatar lg">
                    {activeChat.avatar_url ? (
                      <img src={activeChat.avatar_url} alt="" className="avatar-img" />
                    ) : (
                      getFriendName(activeChat).charAt(0).toUpperCase()
                    )}
                  </div>
                  <h3>{getFriendName(activeChat)}</h3>
                  <p>Chưa có tin nhắn nào ở đây. Hãy gửi lời chào đầu tiên!</p>
                </div>
              ) : (
                (() => {
                  const latestMineMsg = [...messages].reverse().find(
                    (m) => currentUser?.id != null && String(m.sender_id) === String(currentUser.id)
                  )
                  const latestMineId = latestMineMsg ? latestMineMsg.id : null

                  return messages.map((item, idx) => {
                    const isMine = Boolean(
                      currentUser?.id != null &&
                      String(item.sender_id) === String(currentUser.id)
                    )
                    const isLatestMine = isMine && item.id === latestMineId
                    const isCurrentMatch =
                      matchingMessageIds.length > 0 &&
                      matchingMessageIds[chatSearchIndex] === item.id

                    const currentDateStr = formatDate(item.created_at)
                    const prevDateStr = idx > 0 ? formatDate(messages[idx - 1].created_at) : null
                    const showDateBubble = idx === 0 || (currentDateStr && currentDateStr !== prevDateStr)

                    const prevItem = idx > 0 ? messages[idx - 1] : null
                    const isFirstInSequence =
                      idx === 0 ||
                      showDateBubble ||
                      String(prevItem?.sender_id) !== String(item.sender_id)

                    return (
                      <div key={item.id}>
                        {showDateBubble && currentDateStr && (
                          <div className="tg-bubble-date">{currentDateStr}</div>
                        )}
                        <div
                          className={`tg-msg-row ${isMine ? 'mine' : 'theirs'} ${isFirstInSequence ? 'first-in-sequence' : 'consecutive'}`}
                          id={`msg-${item.id}`}
                        >
                          {!isMine && (
                            <div className="tg-msg-avatar-col theirs">
                              {isFirstInSequence ? (
                                <div className="tg-msg-avatar theirs" title={getFriendName(activeChat)}>
                                  {activeChat.avatar_url ? (
                                    <img
                                      src={activeChat.avatar_url}
                                      alt={activeChat.username}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  ) : (
                                    getFriendName(activeChat).charAt(0).toUpperCase()
                                  )}
                                </div>
                              ) : (
                                <div className="tg-msg-avatar-placeholder" />
                              )}
                              <div
                                className="tg-msg-hover-time"
                                title={formatFullDateTime(item.created_at)}
                              >
                                {formatTime(item.created_at)}
                              </div>
                            </div>
                          )}

                          {/* If mine: action buttons sit to the left of the bubble */}
                          {isMine && (
                            <div className="tg-msg-actions">
                              <button
                                className="tg-msg-act-btn"
                                title="Trả lời (Reply)"
                                onClick={() => handleStartReply(item)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
                                </svg>
                              </button>
                              <button
                                className="tg-msg-act-btn"
                                title="Chia sẻ (Share / Forward)"
                                onClick={() => handleStartShare(item)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="15 14 20 9 15 4"></polyline>
                                  <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                                </svg>
                              </button>
                              <button
                                className="tg-msg-act-btn"
                                title="Sao chép tin nhắn"
                                onClick={() => handleCopyMessage(item.content)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="5" cy="12" r="2.2"></circle>
                                  <circle cx="12" cy="12" r="2.2"></circle>
                                  <circle cx="19" cy="12" r="2.2"></circle>
                                </svg>
                              </button>
                            </div>
                          )}

                          <div
                            className={`tg-msg-bubble ${isCurrentMatch ? 'search-active-bubble' : ''} ${isImageMessage(item.content) && !item.reply_to_id ? 'image-only-bubble' : ''}`}
                            title={formatFullDateTime(item.created_at)}
                          >
                            {/* Replied Message Quote (Images 1 & 2) */}
                            {item.reply_to_id && (
                              <div
                                className="tg-reply-quote"
                                onClick={() => scrollToMessage(item.reply_to_id)}
                                title="Bấm để chuyển tới tin nhắn gốc"
                              >
                                <div className="tg-reply-bar" />
                                <div className="tg-reply-quote-content">
                                  <span className="tg-reply-author">
                                    {getReplyAuthorName(item)}
                                  </span>
                                  <span className="tg-reply-snippet">
                                    {getMessageSnippet(getReplyContent(item))}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="tg-msg-text">
                              {renderMessageContent(item.content, chatSearchQuery)}
                            </div>
                            {isLatestMine && (
                              <div className="tg-msg-meta status-only">
                                <span className={`tg-msg-receipt ${item.is_read ? 'read' : 'sent'}`}>
                                  {item.is_read ? 'Đã xem' : 'Đã gửi'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* If theirs: action buttons sit to the right of the bubble */}
                          {!isMine && (
                            <div className="tg-msg-actions">
                              <button
                                className="tg-msg-act-btn"
                                title="Trả lời (Reply)"
                                onClick={() => handleStartReply(item)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
                                </svg>
                              </button>
                              <button
                                className="tg-msg-act-btn"
                                title="Chia sẻ (Share / Forward)"
                                onClick={() => handleStartShare(item)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="15 14 20 9 15 4"></polyline>
                                  <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                                </svg>
                              </button>
                              <button
                                className="tg-msg-act-btn"
                                title="Sao chép tin nhắn"
                                onClick={() => handleCopyMessage(item.content)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="5" cy="12" r="2.2"></circle>
                                  <circle cx="12" cy="12" r="2.2"></circle>
                                  <circle cx="19" cy="12" r="2.2"></circle>
                                </svg>
                              </button>
                            </div>
                          )}

                          {isMine && (
                            <div className="tg-msg-avatar-col mine">
                              {isFirstInSequence ? (
                                <div className="tg-msg-avatar mine" title="Bạn">
                                  {currentUser?.avatar_url ? (
                                    <img
                                      src={currentUser.avatar_url}
                                      alt={currentUser.username}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  ) : (
                                    (currentUser?.display_name || currentUser?.username || 'U').charAt(0).toUpperCase()
                                  )}
                                </div>
                              ) : (
                                <div className="tg-msg-avatar-placeholder" />
                              )}
                              <div
                                className="tg-msg-hover-time"
                                title={formatFullDateTime(item.created_at)}
                              >
                                {formatTime(item.created_at)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Hidden File Picker Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              style={{ display: 'none' }}
            />

            {/* Telegram Reply Banner above Input */}
            {replyingMessage && (
              <div className="tg-reply-bar-container">
                <div className="tg-reply-bar-accent" />
                <div className="tg-reply-bar-body">
                  <div className="tg-reply-bar-title">
                    Trả lời{' '}
                    {replyingMessage.sender_id === currentUser?.id
                      ? 'chính bạn'
                      : getFriendName(activeChat)}
                  </div>
                  <div className="tg-reply-bar-text">
                    {getMessageSnippet(replyingMessage.content)}
                  </div>
                </div>
                <button
                  className="tg-reply-bar-close"
                  onClick={() => setReplyingMessage(null)}
                  title="Hủy trả lời"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Telegram Message Input Pill */}
            <div className="tg-input-area">
              <button
                className="tg-icon-btn tg-attach-btn"
                title="Đính kèm ảnh / video / tệp tin"
                onClick={handleAttachmentClick}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>

              <input
                type="text"
                ref={msgInputRef}
                className="tg-msg-input"
                placeholder="Viết tin nhắn..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onPaste={handleInputPaste}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
                disabled={chatLoading}
              />

              <button
                className="tg-send-btn"
                onClick={handleSend}
                disabled={!message.trim() || chatLoading}
                title="Gửi"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div
            className="tg-no-chat-selected"
            onDoubleClick={handleChatBackgroundDoubleClick}
            title="Nhấp đúp chuột 2 lần vào nền để đổi giao diện"
          >
            <div className="tg-no-chat-badge tg-no-chat-dblclick-hint">
              <span>💬 Chọn một đoạn chat để bắt đầu nhắn tin</span>
              <small>🎨 Mẹo: Nhấp đúp chuột 2 lần vào nền để đổi giao diện 3D</small>
            </div>
          </div>
        )}
      </main>

      {/* Thông tin hội thoại Panel (Khớp với Ảnh 1 & Ảnh 2) */}
      {activeChat && showChatInfo && (
        <>
          <div
            className="tg-info-backdrop"
            onClick={() => setShowChatInfo(false)}
          />
          <aside className="tg-info-panel">
            {/* Header */}
            <div className="tg-info-header">
              <div className="tg-info-header-title-wrap">
                <button
                  className="tg-icon-btn tg-info-back-btn"
                  onClick={() => setShowChatInfo(false)}
                  title="Quay lại đoạn chat"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
                <h3>Thông tin hội thoại</h3>
              </div>
              <button
                className="tg-icon-btn tg-info-close-btn"
                onClick={() => setShowChatInfo(false)}
                title="Đóng thông tin hội thoại"
              >
                ✕
              </button>
            </div>

          <div className="tg-info-body">
            {/* User Card: Avatar lớn + Tên + Nút sửa biệt danh (Ảnh 1) */}
            <div className="tg-info-user-card">
              <div className="tg-info-avatar-large">
                {activeChat.avatar_url ? (
                  <img
                    src={activeChat.avatar_url}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  getFriendName(activeChat).charAt(0).toUpperCase()
                )}
              </div>

              {/* Tên và Nút Đổi Biệt Danh (Chỉ 1 mình mình thấy) */}
              <div className="tg-info-name-wrap">
                <h2>{getFriendName(activeChat)}</h2>
                <button
                  className="tg-edit-nickname-btn"
                  title="Đặt tên gợi nhớ (chỉ mình bạn nhìn thấy)"
                  onClick={() => {
                    setNicknameInput(
                      nicknames[activeChat.id] ||
                      activeChat.display_name ||
                      activeChat.username ||
                      ''
                    )
                    setEditingNickname(true)
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
              </div>

              {nicknames[activeChat.id] && (
                <p className="tg-info-original-name">
                  Tên thật: {activeChat.display_name || activeChat.username} (@{activeChat.username})
                </p>
              )}
              {!nicknames[activeChat.id] && (
                <p className="tg-info-original-name">@{activeChat.username}</p>
              )}

              <p className="tg-info-bio">
                {activeChat.bio || 'Chưa có tiểu sử'}
              </p>

              {/* Nút Đổi hình nền riêng cho hội thoại này */}
              <button
                type="button"
                className="tg-info-wallpaper-act-btn"
                onClick={() => handleOpenWallpaperModal('chat')}
                title="Tùy biến hình nền riêng cho cuộc trò chuyện này"
              >
                <span className="icon">🎨</span>
                <div className="texts">
                  <strong>Hình nền cuộc trò chuyện</strong>
                  <small>
                    {chatWallpapers[activeChat.id]
                      ? 'Đang dùng hình nền riêng'
                      : 'Đang dùng hình nền mặc định'}
                  </small>
                </div>
                <span className="arrow">›</span>
              </button>
            </div>

            {/* Phần Lịch Sử Ảnh/Video (Chỉ hiện ảnh/video thực tế của 2 người) */}
            <div className="tg-accordion-section">
              <button
                className={`tg-accordion-header ${accordionOpen.media ? 'open' : ''}`}
                onClick={() =>
                  setAccordionOpen((prev) => ({ ...prev, media: !prev.media }))
                }
              >
                <span>Ảnh/Video ({chatMediaItems.length})</span>
                <span className="chevron">▾</span>
              </button>

              {accordionOpen.media && (
                <div className="tg-accordion-content">
                  {chatMediaItems.length > 0 ? (
                    <>
                      <div className="tg-media-grid">
                        {chatMediaItems.slice(0, 8).map((media, idx) => (
                          <div
                            className="tg-media-thumb"
                            key={idx}
                            onClick={() => setPreviewMediaUrl(media.url)}
                            title="Bấm để xem ảnh phóng to"
                          >
                            {media.type === 'video' ? (
                              <video src={media.url} />
                            ) : (
                              <img
                                src={media.url}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      {chatMediaItems.length > 8 && (
                        <button
                          className="tg-view-all-btn"
                          onClick={() => {
                            setPreviewMediaUrl(chatMediaItems[0].url)
                          }}
                        >
                          Xem tất cả ({chatMediaItems.length})
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="tg-file-empty-note">
                      Chưa có ảnh hoặc video nào được gửi
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Phần Lịch Sử File (Chỉ hiện file thực tế của 2 người) */}
            <div className="tg-accordion-section">
              <button
                className={`tg-accordion-header ${accordionOpen.files ? 'open' : ''}`}
                onClick={() =>
                  setAccordionOpen((prev) => ({ ...prev, files: !prev.files }))
                }
              >
                <span>File ({chatFileItems.length})</span>
                <span className="chevron">▾</span>
              </button>

              {accordionOpen.files && (
                <div className="tg-accordion-content">
                  {chatFileItems.length > 0 ? (
                    <div className="tg-files-list">
                      {chatFileItems.map((file, idx) => (
                        <div
                          className="tg-file-row"
                          key={idx}
                        >
                          <div className={`tg-file-icon ${getFileBadgeType(file.name, file.fileType)}`}>
                            {getFileIconSvg(file.name, file.fileType)}
                          </div>
                          <div className="tg-file-info">
                            <strong title={file.name}>{file.name}</strong>
                            <span>{file.size} • {file.date}</span>
                          </div>
                          <a
                            href={file.url || '#'}
                            download={file.name}
                            className="tg-file-download-action-btn"
                            title={`Tải xuống ${file.name}`}
                          >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tg-file-empty-note">
                      Chưa có tệp tin nào được gửi
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Phần Lịch Sử Link (Chỉ hiện liên kết thực tế của 2 người) */}
            <div className="tg-accordion-section">
              <button
                className={`tg-accordion-header ${accordionOpen.links ? 'open' : ''}`}
                onClick={() =>
                  setAccordionOpen((prev) => ({ ...prev, links: !prev.links }))
                }
              >
                <span>Link ({chatLinkItems.length})</span>
                <span className="chevron">▾</span>
              </button>

              {accordionOpen.links && (
                <div className="tg-accordion-content">
                  {chatLinkItems.length > 0 ? (
                    <div className="tg-links-list">
                      {chatLinkItems.map((link, idx) => (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tg-link-row"
                          key={idx}
                        >
                          <div className={`tg-link-icon-box ${link.iconType || 'generic'}`}>
                            {link.iconType === 'github' ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                              </svg>
                            ) : link.iconType === 'meet' ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="2" y="5" width="13" height="14" rx="2" fill="#ffbb00" />
                                <polygon points="17 9 22 6 22 18 17 15" fill="#f44336" />
                              </svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                              </svg>
                            )}
                          </div>

                          <div className="tg-link-details">
                            <span className="tg-link-title">{link.title}</span>
                            <span className="tg-link-domain">{link.domain}</span>
                          </div>

                          <span className="tg-link-date">{link.date}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="tg-file-empty-note">
                      Chưa có liên kết nào được gửi
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </>
    )}

      {/* Lightbox Preview Modal cho Ảnh / Video */}
      {previewMediaUrl && (
        <div className="tg-lightbox-overlay" onClick={() => setPreviewMediaUrl(null)}>
          <div className="tg-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="tg-lightbox-actions">
              <a
                href={previewMediaUrl}
                download="photo.png"
                className="tg-lightbox-download"
                title="Tải ảnh xuống"
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </a>
              <button
                className="tg-lightbox-close"
                onClick={() => setPreviewMediaUrl(null)}
                title="Đóng xem ảnh"
              >
                ✕
              </button>
            </div>
            <img src={previewMediaUrl} alt="Preview" className="tg-lightbox-img" />
          </div>
        </div>
      )}

      {/* Modal Quản lý lời mời kết bạn (Đã nhận & Đã gửi) */}
      {showFriendRequestsModal && (
        <div className="modal-overlay" onClick={() => setShowFriendRequestsModal(false)}>
          <div className="modal-card tg-requests-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon">✉️</div>
                <div>
                  <h3>Lời mời kết bạn</h3>
                  <p>Quản lý các lời mời kết bạn đã nhận và đã gửi</p>
                </div>
              </div>
              <button
                className="modal-close-button"
                onClick={() => setShowFriendRequestsModal(false)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="modal-tabs">
              <button
                type="button"
                className={`modal-tab ${friendRequestsModalTab === 'received' ? 'active' : ''}`}
                onClick={() => setFriendRequestsModalTab('received')}
              >
                Lời mời đã nhận {friendRequests.length > 0 && `(${friendRequests.length})`}
              </button>
              <button
                type="button"
                className={`modal-tab ${friendRequestsModalTab === 'sent' ? 'active' : ''}`}
                onClick={() => setFriendRequestsModalTab('sent')}
              >
                Lời mời đã gửi {sentFriendRequests.length > 0 && `(${sentFriendRequests.length})`}
              </button>
            </div>

            <div className="tg-modal-requests-body">
              {friendRequestsModalTab === 'received' ? (
                friendRequests.length > 0 ? (
                  <div className="tg-friend-requests-list">
                    {friendRequests.map((req) => {
                      const reqName = req.display_name || req.username
                      return (
                        <div className="tg-friend-req-card" key={req.id}>
                          <div className="tg-friend-req-user">
                            <div
                              className="tg-avatar sm"
                              style={{
                                background: !req.avatar_url
                                  ? getAvatarGradient(req.user_id || req.username)
                                  : undefined,
                              }}
                            >
                              {req.avatar_url ? (
                                <img
                                  src={req.avatar_url}
                                  alt=""
                                  className="avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                getFriendInitials(reqName)
                              )}
                            </div>
                            <div className="tg-friend-req-info">
                              <div className="tg-friend-req-top">
                                <span className="tg-friend-req-name" title={reqName}>
                                  {reqName}
                                </span>
                                <span className="tg-friend-req-time">
                                  {formatChatListTime(req.created_at)}
                                </span>
                              </div>
                              <span className="tg-friend-req-uname">@{req.username}</span>
                              {req.bio && <p className="tg-friend-req-bio">{req.bio}</p>}
                            </div>
                          </div>

                          <div className="tg-friend-req-actions">
                            <button
                              className="tg-req-accept-btn"
                              onClick={() => handleAcceptFriendRequest(req.id)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              Đồng ý
                            </button>
                            <button
                              className="tg-req-reject-btn"
                              onClick={() => handleRejectFriendRequest(req.id)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                              Từ chối
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="tg-empty-list" style={{ padding: '36px 0' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
                    <p>Chưa có lời mời kết bạn nào gửi đến bạn</p>
                    <span style={{ fontSize: 12, color: '#727e90' }}>
                      Khi có người gửi lời mời, bạn có thể đồng ý hoặc từ chối tại đây.
                    </span>
                  </div>
                )
              ) : (
                sentFriendRequests.length > 0 ? (
                  <div className="tg-friend-requests-list">
                    {sentFriendRequests.map((req) => {
                      const reqName = req.display_name || req.username
                      return (
                        <div className="tg-friend-req-card" key={req.id}>
                          <div className="tg-friend-req-user">
                            <div
                              className="tg-avatar sm"
                              style={{
                                background: !req.avatar_url
                                  ? getAvatarGradient(req.friend_id || req.username)
                                  : undefined,
                              }}
                            >
                              {req.avatar_url ? (
                                <img
                                  src={req.avatar_url}
                                  alt=""
                                  className="avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                getFriendInitials(reqName)
                              )}
                            </div>
                            <div className="tg-friend-req-info">
                              <div className="tg-friend-req-top">
                                <span className="tg-friend-req-name" title={reqName}>
                                  {reqName}
                                </span>
                                <span className="tg-friend-req-time">
                                  {formatChatListTime(req.created_at)}
                                </span>
                              </div>
                              <span className="tg-friend-req-uname">@{req.username}</span>
                              <span className="tg-friend-req-status-tag">Đang chờ đối phương phản hồi...</span>
                              {req.bio && <p className="tg-friend-req-bio">{req.bio}</p>}
                            </div>
                          </div>

                          <div className="tg-friend-req-actions">
                            <button
                              className="tg-req-cancel-btn"
                              onClick={() => handleCancelFriendRequest(req.id)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                              </svg>
                              Thu hồi lời mời
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="tg-empty-list" style={{ padding: '36px 0' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
                    <p>Bạn chưa gửi lời mời kết bạn nào đang chờ</p>
                    <button
                      className="secondary-button"
                      style={{ marginTop: 14, fontSize: 12, padding: '7px 14px' }}
                      onClick={() => {
                        setShowFriendRequestsModal(false)
                        setShowAddFriendModal(true)
                      }}
                    >
                      + Tìm và kết bạn mới
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowFriendRequestsModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Modal (Danh bạ bạn bè) */}
      {showContactsModal && (
        <div className="modal-overlay" onClick={() => setShowContactsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon">👥</div>
                <div>
                  <h3>Danh bạ (Contacts)</h3>
                  <p>{friends.length} người bạn trong danh bạ</p>
                </div>
              </div>
              <button
                className="modal-close-button"
                onClick={() => setShowContactsModal(false)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {friendRequests.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ color: '#8774e1', margin: '0 0 10px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Lời mời kết bạn ({friendRequests.length})
                </h4>
                <div className="contacts-list">
                  {friendRequests.map((req) => (
                    <div className="contact-item" key={req.id}>
                      <div className="contact-user">
                        <div className="tg-avatar sm">
                          {req.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{req.username}</strong>
                          <span>Đã gửi lời mời kết bạn</span>
                        </div>
                      </div>
                      <button
                        className="primary-button"
                        style={{ height: 34, padding: '0 14px', fontSize: 12 }}
                        onClick={() => handleAcceptFriendRequest(req.id)}
                      >
                        Chấp nhận
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ color: '#8995a5', margin: 0, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Danh sách bạn bè
              </h4>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => {
                  setShowContactsModal(false)
                  setShowAddFriendModal(true)
                }}
              >
                + Thêm bạn mới
              </button>
            </div>

            <div className="contacts-list">
              {friends.length > 0 ? (
                friends.map((friend) => (
                  <div className="contact-item" key={friend.id}>
                    <div className="contact-user">
                      <div className="tg-avatar sm">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="" className="avatar-img" />
                        ) : (
                          (friend.display_name || friend.username).charAt(0).toUpperCase()
                        )}
                        <div className={`tg-online-dot ${friend.is_online ? 'online' : 'offline'}`} />
                      </div>
                      <div>
                        <strong>{getFriendName(friend)}</strong>
                        <span style={{ fontSize: 12, color: friend.is_online ? '#22c55e' : '#828e9f' }}>
                          {formatUserStatus(friend)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="primary-button"
                      style={{ height: 34, padding: '0 14px', fontSize: 12 }}
                      onClick={() => {
                        setActiveChat(friend)
                        setShowContactsModal(false)
                      }}
                    >
                      Nhắn tin
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#6a7485', fontSize: 13 }}>
                  Chưa có bạn bè nào. Nhấn "+ Thêm bạn mới" để kết nối.
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowContactsModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Friend Modal (Tìm kiếm hoặc Quét mã QR) */}
      {showAddFriendModal && (
        <div className="modal-overlay" onClick={handleCloseAddFriendModal}>
          <div className="modal-card tg-qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon">{addFriendTab === 'qr_scan' ? '📷' : '➕'}</div>
                <div>
                  <h3>Kết bạn mới</h3>
                  <p>{addFriendTab === 'qr_scan' ? 'Quét mã QR để kết bạn tức thì' : 'Tìm kiếm theo tên người dùng'}</p>
                </div>
              </div>
              <button
                className="modal-close-button"
                onClick={handleCloseAddFriendModal}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs: Tìm theo Username | Quét mã QR */}
            <div className="modal-tabs">
              <button
                type="button"
                className={`modal-tab ${addFriendTab === 'search' ? 'active' : ''}`}
                onClick={() => {
                  handleStopQrCamera()
                  setAddFriendTab('search')
                  setSearchFriendError('')
                  setSearchFriendSuccess('')
                }}
              >
                🔍 Tìm theo Username
              </button>
              <button
                type="button"
                className={`modal-tab ${addFriendTab === 'qr_scan' ? 'active' : ''}`}
                onClick={() => {
                  setAddFriendTab('qr_scan')
                  setQrScanError('')
                  setQrScanSuccess('')
                }}
              >
                📷 Quét mã QR
              </button>
            </div>

            {/* TAB 1: TÌM THEO USERNAME */}
            {addFriendTab === 'search' && (
              <>
                {searchFriendError && <div className="modal-alert error">{searchFriendError}</div>}
                {searchFriendSuccess && <div className="modal-alert success">{searchFriendSuccess}</div>}

                <form onSubmit={handleSearchFriend} className="profile-form">
                  <label>
                    Username người dùng
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        type="text"
                        placeholder="Nhập chính xác username..."
                        value={searchFriendInput}
                        onChange={(e) => setSearchFriendInput(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="primary-button"
                        style={{ minWidth: 100, height: 48, marginTop: 0 }}
                        disabled={searchFriendLoading || !searchFriendInput.trim()}
                      >
                        {searchFriendLoading ? 'Đang tìm...' : 'Tìm kiếm'}
                      </button>
                    </div>
                  </label>
                </form>

                {searchFriendResult && (
                  <div className="qr-result-card">
                    <div className="qr-result-user">
                      <div className="tg-avatar sm">
                        {searchFriendResult.avatar_url ? (
                          <img src={searchFriendResult.avatar_url} alt="" className="avatar-img" />
                        ) : (
                          (searchFriendResult.display_name || searchFriendResult.username).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <strong>{searchFriendResult.display_name || searchFriendResult.username}</strong>
                        <span>@{searchFriendResult.username}</span>
                      </div>
                    </div>

                    <button
                      className="primary-button"
                      style={{ height: 36, padding: '0 16px', fontSize: 12 }}
                      disabled={searchFriendLoading}
                      onClick={() => handleSendFriendRequest(searchFriendResult.id)}
                    >
                      Kết bạn
                    </button>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: QUÉT MÃ QR */}
            {addFriendTab === 'qr_scan' && (
              <div className="qr-scan-tab-body">
                {qrScanError && <div className="modal-alert error">{qrScanError}</div>}
                {qrScanSuccess && <div className="modal-alert success">{qrScanSuccess}</div>}

                {/* Camera Viewfinder */}
                {qrCameraActive ? (
                  <div className="qr-camera-wrap">
                    <video ref={qrVideoRef} className="qr-camera-video" playsInline autoPlay muted />
                    <div className="qr-camera-overlay">
                      <div className="qr-viewfinder">
                        <div className="viewfinder-corner tl" />
                        <div className="viewfinder-corner tr" />
                        <div className="viewfinder-corner bl" />
                        <div className="viewfinder-corner br" />
                        <div className="viewfinder-laser" />
                      </div>
                      <p className="qr-camera-tip">Đưa mã QR của bạn bè vào khung hình để quét</p>
                    </div>
                    <button
                      type="button"
                      className="qr-camera-stop-btn"
                      onClick={handleStopQrCamera}
                    >
                      ⏹ Tắt Camera
                    </button>
                  </div>
                ) : (
                  <div className="qr-scan-actions">
                    <button
                      type="button"
                      className="primary-button qr-scan-camera-btn"
                      onClick={handleStartQrCamera}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      <span>Bật Camera để quét trực tiếp</span>
                    </button>

                    <div
                      className="qr-image-dropzone"
                      onClick={() => qrFileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={qrFileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleScanQrFromFile(file)
                          e.target.value = ''
                        }}
                      />
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span>Hoặc <strong>tải ảnh mã QR</strong> từ máy tính</span>
                      <small>Kéo thả tệp ảnh vào đây hoặc bấm Ctrl+V</small>
                    </div>
                  </div>
                )}

                {/* Direct Text Input Fallback */}
                <div className="qr-manual-input-box">
                  <span className="qr-manual-label">Hoặc nhập mã / dán liên kết kết bạn:</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Dán mã QR code (ví dụ: a7b8c9d0...)"
                      value={qrScanInput}
                      onChange={(e) => setQrScanInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleResolveQrCode(qrScanInput)
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="primary-button"
                      style={{ minWidth: 90, height: 42, marginTop: 0, fontSize: 13 }}
                      disabled={qrScanning || !qrScanInput.trim()}
                      onClick={() => handleResolveQrCode(qrScanInput)}
                    >
                      {qrScanning ? 'Đang đọc...' : 'Kiểm tra'}
                    </button>
                  </div>
                </div>

                {/* QR Scan Result Card */}
                {qrScanResult && qrScanResult.user && (
                  <div className="qr-resolved-card">
                    <div className="qr-resolved-header">
                      <div className="tg-avatar md">
                        {qrScanResult.user.avatar_url ? (
                          <img src={qrScanResult.user.avatar_url} alt="" className="avatar-img" />
                        ) : (
                          (qrScanResult.user.display_name || qrScanResult.user.username).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="qr-resolved-info">
                        <strong>{qrScanResult.user.display_name || qrScanResult.user.username}</strong>
                        <span>@{qrScanResult.user.username}</span>
                        {qrScanResult.user.bio && <p className="qr-resolved-bio">{qrScanResult.user.bio}</p>}
                      </div>
                    </div>

                    <div className="qr-resolved-actions">
                      {qrScanResult.friendship_status === 'accepted' ? (
                        <div className="qr-status-badge success">
                          <span>✅ Hai bạn đã là bạn bè của nhau rồi</span>
                          <button
                            type="button"
                            className="primary-button"
                            style={{ height: 36, padding: '0 16px', fontSize: 12, marginTop: 6 }}
                            onClick={() => {
                              setActiveChat({
                                id: qrScanResult.user.id,
                                username: qrScanResult.user.username,
                                display_name: qrScanResult.user.display_name,
                                avatar_url: qrScanResult.user.avatar_url,
                                bio: qrScanResult.user.bio,
                              })
                              handleCloseAddFriendModal()
                            }}
                          >
                            Nhắn tin ngay
                          </button>
                        </div>
                      ) : qrScanResult.friendship_status === 'pending_sent' ? (
                        <div className="qr-status-badge warning">
                          <span>⏳ Đã gửi lời mời kết bạn trước đó, vui lòng chờ đối phương đồng ý.</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="primary-button qr-add-btn"
                          disabled={qrActionLoading}
                          onClick={() => handleAddFriendViaQr(qrScanResult.resolvedCode)}
                        >
                          {qrActionLoading ? 'Đang kết nối...' : '⚡ Kết bạn ngay qua mã QR'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: 12 }}
                onClick={() => {
                  handleCloseAddFriendModal()
                  handleOpenMyQrModal()
                }}
              >
                📷 Xem mã QR của tôi
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseAddFriendModal}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Mã QR của tôi" (Tự động spawn & set thời gian hủy) */}
      {showMyQrModal && (
        <div className="modal-overlay" onClick={handleCloseMyQrModal}>
          <div className="modal-card tg-my-qr-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon">📷</div>
                <div>
                  <h3>Mã QR kết bạn của tôi</h3>
                  <p>Mã tự động hủy để bảo mật quyền riêng tư</p>
                </div>
              </div>
              <button
                className="modal-close-button"
                onClick={handleCloseMyQrModal}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {myQrError && <div className="modal-alert error">{myQrError}</div>}
            {myQrSuccess && <div className="modal-alert success">{myQrSuccess}</div>}

            <div className="my-qr-body">
              {/* Card QR Poster Preview */}
              <div className="my-qr-poster">
                {/* User Header */}
                <div className="my-qr-user-header">
                  <div className="tg-avatar sm">
                    {currentUser?.avatar_url ? (
                      <img src={currentUser.avatar_url} alt="" className="avatar-img" />
                    ) : (
                      (currentUser?.display_name || currentUser?.username || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <strong className="my-qr-name">
                      {currentUser?.display_name || currentUser?.username || 'CloudChat User'}
                    </strong>
                    <span className="my-qr-handle">@{currentUser?.username || 'user'}</span>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="my-qr-canvas-box">
                  {myQrLoading ? (
                    <div className="my-qr-loading-spinner">
                      <div className="spinner-ring" />
                      <span>Đang tạo mã QR bảo mật...</span>
                    </div>
                  ) : myQrImageUrl ? (
                    <div className="my-qr-image-wrap">
                      <img
                        src={myQrImageUrl}
                        alt="My QR Code"
                        className={`my-qr-img ${myQrRemainingSeconds <= 0 ? 'expired' : ''}`}
                      />

                      {/* Overlay khi mã hết hạn */}
                      {myQrRemainingSeconds <= 0 && (
                        <div className="my-qr-expired-overlay">
                          <div className="expired-icon">⌛</div>
                          <strong>Mã QR đã hết hạn</strong>
                          <p>Mã đã tự động bị hủy để bảo mật tài khoản.</p>
                          <button
                            type="button"
                            className="primary-button"
                            style={{ height: 36, padding: '0 16px', fontSize: 12, marginTop: 8 }}
                            onClick={() => handleGenerateMyQr(myQrTtl)}
                          >
                            🔄 Tạo mã mới ngay
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="my-qr-empty">Chưa có mã QR nào</div>
                  )}
                </div>

                {/* Countdown Timer with Progress Bar */}
                <div className="my-qr-timer-section">
                  <div className="my-qr-timer-row">
                    <span className="timer-label">
                      {myQrRemainingSeconds > 0 ? '⏳ Tự động hủy sau:' : '⚠️ Trạng thái:'}
                    </span>
                    <span className={`timer-clock ${myQrRemainingSeconds <= 30 && myQrRemainingSeconds > 0 ? 'urgent' : ''} ${myQrRemainingSeconds <= 0 ? 'expired' : ''}`}>
                      {myQrRemainingSeconds > 0
                        ? formatCountdown(myQrRemainingSeconds)
                        : 'Đã hết hạn'}
                    </span>
                  </div>

                  <div className="my-qr-progress-bar">
                    <div
                      className={`my-qr-progress-fill ${myQrRemainingSeconds <= 30 ? 'urgent' : ''}`}
                      style={{
                        width: `${Math.min(100, Math.max(0, (myQrRemainingSeconds / (myQrTtl || 300)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* TTL Presets Selector (Set thời gian hủy) */}
              <div className="my-qr-ttl-panel">
                <span className="ttl-panel-title">⏱️ Chọn thời gian tự hủy mã:</span>
                <div className="ttl-presets-list">
                  {QR_TTL_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset.seconds}
                      className={`ttl-preset-btn ${myQrTtl === preset.seconds ? 'selected' : ''}`}
                      onClick={() => handleGenerateMyQr(preset.seconds)}
                      title={`Tạo mã mới với thời hạn ${preset.label}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="my-qr-actions-grid">
                <button
                  type="button"
                  className="my-qr-action-btn primary"
                  onClick={() => handleGenerateMyQr(myQrTtl)}
                  disabled={myQrLoading}
                  title="Spawn mã QR mới và hủy mã cũ"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  <span>Làm mới mã</span>
                </button>

                <button
                  type="button"
                  className="my-qr-action-btn secondary"
                  onClick={handleDownloadQrCard}
                  disabled={!myQrImageUrl}
                  title="Tải ảnh thẻ QR về máy tính"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Tải ảnh thẻ QR</span>
                </button>

                <button
                  type="button"
                  className="my-qr-action-btn secondary"
                  onClick={handleCopyQrCode}
                  disabled={!myQrData?.code}
                  title="Sao chép liên kết kết bạn"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Sao chép link</span>
                </button>

                <button
                  type="button"
                  className="my-qr-action-btn danger"
                  onClick={handleRevokeMyQr}
                  disabled={myQrRevoking || myQrRemainingSeconds <= 0}
                  title="Hủy ngay mã QR này"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  <span>Hủy mã ngay</span>
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseMyQrModal}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi hình nền trò chuyện (10 Theme 3D & tải ảnh từ máy) */}
      {showWallpaperModal && (
        <div className="modal-overlay" onClick={() => setShowWallpaperModal(false)}>
          <div
            className="modal-card tg-wallpaper-modal-card"
            onClick={(e) => e.stopPropagation()}
            onPaste={handleWallpaperPaste}
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon">🎨</div>
                <div>
                  <h3>Màu nền cuộc trò chuyện</h3>
                  <p>
                    {wallpaperScope === 'chat' && activeChat
                      ? `Áp dụng màu nền riêng cho cuộc trò chuyện với ${getFriendName(activeChat)}`
                      : 'Cài đặt màu nền mặc định cho tất cả cuộc trò chuyện'}
                  </p>
                </div>
              </div>
              <button
                className="modal-close-button"
                onClick={() => setShowWallpaperModal(false)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Scope Selector: Riêng cuộc trò chuyện này VS Tất cả cuộc trò chuyện */}
            <div className="wallpaper-scope-bar">
              <span className="scope-bar-label">Áp dụng cho:</span>
              <div className="scope-pills">
                {activeChat && (
                  <button
                    type="button"
                    className={`scope-pill-btn ${wallpaperScope === 'chat' ? 'active' : ''}`}
                    onClick={() => setWallpaperScope('chat')}
                  >
                    📌 Cuộc trò chuyện này ({getFriendName(activeChat)})
                  </button>
                )}
                <button
                  type="button"
                  className={`scope-pill-btn ${wallpaperScope === 'global' ? 'active' : ''}`}
                  onClick={() => setWallpaperScope('global')}
                >
                  🌐 Tất cả cuộc trò chuyện
                </button>
              </div>
            </div>

            {/* Live Crisp Color Preview Box (Xem trước màu sắc với bong bóng tin nhắn, nét 100%) */}
            <div className="wallpaper-live-preview-box">
              <div
                className="wallpaper-preview-bg"
                style={{
                  background:
                    tempWallpaper.type === 'custom' || tempWallpaper.type === 'url'
                      ? `url("${tempWallpaper.value}") center/cover no-repeat`
                      : tempWallpaper.value || '#0e1621',
                }}
              >
                {/* Sample chat bubbles to show contrast */}
                <div className="wallpaper-preview-chat-bubbles">
                  <div className="preview-bubble theirs">
                    <span>Chào bạn! Màu nền này nhìn thế nào bạn? ✨</span>
                    <small>10:24</small>
                  </div>
                  <div className="preview-bubble mine">
                    <span>Màu chuẩn cực kỳ rõ nét, không bị mờ và rất dịu mắt! 🔥</span>
                    <small>10:25 ✓✓</small>
                  </div>
                </div>
              </div>

              {/* Status bar displaying currently selected color info */}
              <div className="wallpaper-preview-color-info">
                <span className="color-preview-badge" style={{ background: tempWallpaper.value || '#0e1621' }}></span>
                <span className="color-preview-name">{tempWallpaper.name || 'Màu đã chọn'}</span>
                {tempWallpaper.type === 'color' && tempWallpaper.value && (
                  <code className="color-preview-code">{tempWallpaper.value}</code>
                )}
              </div>
            </div>

            {/* Thanh Nhập Mã Màu Tự Động Đổi Nền Tức Thì (Không Giới Hạn Màu) */}
            <div className="instant-color-input-panel">
              <div className="instant-color-input-header">
                <span className="instant-input-title">⚡ Nhập mã màu (Tự động đổi màu tức thì • Không giới hạn):</span>
                <span className="instant-input-badge">Mọi định dạng CSS</span>
              </div>
              <div className="instant-color-input-wrap">
                <div
                  className="instant-color-swatch-picker"
                  style={{ background: tempWallpaper.value || '#0e1621' }}
                  title="Bấm để chọn màu bằng bảng màu trực quan"
                  onClick={() => document.getElementById('native-color-picker-trigger')?.click()}
                >
                  <input
                    id="native-color-picker-trigger"
                    type="color"
                    value={customColorHex.startsWith('#') && customColorHex.length === 7 ? customColorHex : '#0e1621'}
                    onChange={(e) => {
                      const hex = e.target.value
                      setCustomColorHex(hex)
                      handleColorInputChange(hex)
                    }}
                    style={{ opacity: 0, position: 'absolute', pointerEvents: 'none', width: 0, height: 0 }}
                  />
                  <span>🎨</span>
                </div>
                <input
                  type="text"
                  className={`instant-color-text-input ${colorInputStatus === 'invalid' ? 'error' : colorInputStatus === 'valid' ? 'valid' : ''}`}
                  value={customColorInput}
                  onChange={(e) => handleColorInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (colorInputStatus === 'valid') {
                        handleSaveWallpaper()
                      }
                    }
                  }}
                  placeholder="Gõ mã màu (VD: #ff4500, 0f172a, rgb(20,30,50), navy, linear-gradient...)"
                />
                <button
                  type="button"
                  className="instant-color-apply-btn"
                  onClick={handleSaveWallpaper}
                  disabled={colorInputStatus !== 'valid'}
                  title="Lưu và áp dụng ngay màu này"
                >
                  Áp dụng ngay
                </button>
              </div>
              <div className="instant-color-status-row">
                {colorInputStatus === 'valid' && (
                  <span className="instant-status-msg valid">
                    ✅ Màu hợp lệ! Đã tự động đổi màu nền xem trước (Ấn Enter để áp dụng ngay)
                  </span>
                )}
                {colorInputStatus === 'invalid' && (
                  <span className="instant-status-msg error">
                    ⚠️ Chưa nhận diện được màu (Gợi ý: #1e293b, ff0055, rgb(15,23,42), navy, v.v...)
                  </span>
                )}
                {colorInputStatus === 'empty' && (
                  <span className="instant-status-msg hint">
                    💡 Hỗ trợ không giới hạn: Mã HEX (#ff0055 hoặc ff0055), RGB, HSL, tên màu (black, red, navy...) & Gradient
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="modal-tabs wallpaper-tabs">
              <button
                type="button"
                className={`modal-tab ${wallpaperModalTab === 'colors' ? 'active' : ''}`}
                onClick={() => setWallpaperModalTab('colors')}
              >
                🌈 Bảng màu & Gradient (14 Chủ đề)
              </button>
              <button
                type="button"
                className={`modal-tab ${wallpaperModalTab === 'custom_picker' ? 'active' : ''}`}
                onClick={() => setWallpaperModalTab('custom_picker')}
              >
                🎨 Tự chọn mã màu
              </button>
              <button
                type="button"
                className={`modal-tab ${wallpaperModalTab === 'upload' ? 'active' : ''}`}
                onClick={() => setWallpaperModalTab('upload')}
              >
                📁 Tải ảnh riêng
              </button>
            </div>

            {/* TAB 1: 14 CHỦ ĐỀ MÀU SẮC & GRADIENT */}
            {wallpaperModalTab === 'colors' && (
              <div className="chat-color-presets-grid">
                {CHAT_COLOR_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className={`chat-color-card ${tempWallpaper.value === preset.value ? 'selected' : ''}`}
                    onClick={() => {
                      setTempWallpaper({
                        type: preset.type,
                        value: preset.value,
                        name: preset.name,
                      })
                      if (preset.type === 'color' && preset.value.startsWith('#')) {
                        setCustomColorHex(preset.value)
                      }
                    }}
                  >
                    <div
                      className="color-card-swatch"
                      style={{ background: preset.value }}
                    >
                      <span className="color-card-num">{preset.num}</span>
                      {tempWallpaper.value === preset.value && (
                        <div className="color-selected-check">✓</div>
                      )}
                    </div>
                    <div className="color-card-info">
                      <strong>{preset.name}</strong>
                      <small>{preset.desc}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: TỰ CHỌN MÃ MÀU (COLOR PICKER & SWATCHES) */}
            {wallpaperModalTab === 'custom_picker' && (
              <div className="custom-color-picker-pane">
                <div className="color-picker-row">
                  <div className="color-picker-input-wrap">
                    <label className="color-picker-label">Bấm vào ô màu để chọn hoặc nhập mã HEX:</label>
                    <div className="color-picker-control">
                      <input
                        type="color"
                        value={customColorHex.startsWith('#') && customColorHex.length === 7 ? customColorHex : '#0e1621'}
                        onChange={(e) => {
                          const hex = e.target.value
                          setCustomColorHex(hex)
                          setTempWallpaper({
                            type: 'color',
                            value: hex,
                            name: `Màu tự chọn (${hex})`,
                          })
                        }}
                        className="color-input-native"
                        title="Chọn màu sắc"
                      />
                      <input
                        type="text"
                        value={customColorHex}
                        onChange={(e) => {
                          const hex = e.target.value
                          setCustomColorHex(hex)
                          if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
                            setTempWallpaper({
                              type: 'color',
                              value: hex,
                              name: `Màu tự chọn (${hex})`,
                            })
                          }
                        }}
                        placeholder="#0e1621"
                        className="color-hex-input"
                      />
                    </div>
                  </div>

                  <div className="color-swatches-section">
                    <label className="color-picker-label">Màu cơ bản đề xuất (bấm chọn nhanh):</label>
                    <div className="color-swatches-grid">
                      {QUICK_COLOR_SWATCHES.map((swatch) => (
                        <button
                          type="button"
                          key={swatch.hex}
                          className={`color-swatch-btn ${tempWallpaper.value === swatch.hex ? 'selected' : ''}`}
                          style={{ background: swatch.hex }}
                          title={`${swatch.name} (${swatch.hex})`}
                          onClick={() => {
                            setCustomColorHex(swatch.hex)
                            setTempWallpaper({
                              type: 'color',
                              value: swatch.hex,
                              name: swatch.name,
                            })
                          }}
                        >
                          {tempWallpaper.value === swatch.hex && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TẢI ẢNH RIÊNG */}
            {wallpaperModalTab === 'upload' && (
              <div className="wallpaper-upload-pane">
                <input
                  type="file"
                  ref={wallpaperFileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleWallpaperFileSelect}
                />
                <div
                  className={`avatar-dropzone ${wallpaperDragOver ? 'active' : ''}`}
                  onClick={() => wallpaperFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setWallpaperDragOver(true)
                  }}
                  onDragLeave={() => setWallpaperDragOver(false)}
                  onDrop={handleWallpaperDrop}
                >
                  <div className="dropzone-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </div>
                  <div className="dropzone-text">
                    <strong>Bấm để chọn ảnh từ máy</strong> hoặc kéo thả ảnh vào đây
                  </div>
                  <div className="dropzone-hint">
                    Hỗ trợ JPG, PNG, WebP • Tự động hiển thị sắc nét, không làm mờ
                  </div>
                  <div className="dropzone-badge-paste">
                    📋 Mẹo: Bạn có thể copy ảnh bất kỳ rồi bấm <strong>Ctrl + V</strong> để dán trực tiếp
                  </div>

                  {wallpaperFileMeta && (
                    <div className="avatar-file-status">
                      <span>✅ {wallpaperFileMeta.name}</span>
                      {wallpaperFileMeta.size && <span className="size-pill">{wallpaperFileMeta.size}</span>}
                    </div>
                  )}
                </div>

                {tempWallpaper.type === 'custom' && (
                  <div className="custom-wallpaper-preview-badge">
                    <span>Đang chọn ảnh tùy chỉnh từ thiết bị của bạn</span>
                  </div>
                )}
              </div>
            )}

            {/* Cài đặt cử chỉ nhấp đúp trên nền chat */}
            <div className="wallpaper-dblclick-setting">
              <div className="dblclick-setting-header">
                <div className="dblclick-setting-title">
                  <span>⚡ Cử chỉ nhấp đúp (Double-Click) trên nền chat</span>
                  <span className="dblclick-badge">Mới</span>
                </div>
                <p className="dblclick-setting-desc">
                  Nhấp chuột 2 lần vào khoảng trống hình nền chat để thao tác nhanh màu nền
                </p>
              </div>
              <div className="dblclick-options">
                <button
                  type="button"
                  className={`dblclick-option-btn ${doubleClickAction === 'next' ? 'active' : ''}`}
                  onClick={() => handleSetDoubleClickAction('next')}
                >
                  <span className="option-icon">🎨</span>
                  <div className="option-text">
                    <strong>Đổi ngay màu nền kế tiếp (14 chủ đề màu)</strong>
                    <small>Tự động chuyển vòng 14 màu & dải gradient sắc nét, không mờ</small>
                  </div>
                  {doubleClickAction === 'next' && <span className="option-check">✓</span>}
                </button>
                <button
                  type="button"
                  className={`dblclick-option-btn ${doubleClickAction === 'modal' ? 'active' : ''}`}
                  onClick={() => handleSetDoubleClickAction('modal')}
                >
                  <span className="option-icon">⚙️</span>
                  <div className="option-text">
                    <strong>Mở bảng chọn màu nền</strong>
                    <small>Bật cửa sổ để tự chọn mã màu HEX hoặc bảng màu yêu thích</small>
                  </div>
                  {doubleClickAction === 'modal' && <span className="option-check">✓</span>}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="secondary-button"
                style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                onClick={handleResetWallpaper}
                title="Khôi phục lại giao diện Telegram Dark gốc"
              >
                ↺ Đặt lại mặc định
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowWallpaperModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="primary-button"
                  style={{ minWidth: 130 }}
                  onClick={handleSaveWallpaper}
                >
                  Áp dụng màu nền
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} onPaste={handleProfilePaste}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon">👤</div>
                <div>
                  <h3>Thông tin tài khoản</h3>
                  <p>Quản lý thông tin cá nhân và bảo mật</p>
                </div>
              </div>
              <button
                className="modal-close-button"
                onClick={() => setShowProfileModal(false)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="modal-tabs">
              <button
                type="button"
                className={`modal-tab ${profileTab === 'info' ? 'active' : ''}`}
                onClick={() => {
                  setProfileTab('info')
                  setProfileError('')
                  setProfileSuccess('')
                }}
              >
                Thông tin cá nhân
              </button>
              <button
                type="button"
                className={`modal-tab ${profileTab === 'password' ? 'active' : ''}`}
                onClick={() => {
                  setProfileTab('password')
                  setProfileError('')
                  setProfileSuccess('')
                }}
              >
                Đổi mật khẩu
              </button>
            </div>

            {profileError && <div className="modal-alert error">{profileError}</div>}
            {profileSuccess && <div className="modal-alert success">{profileSuccess}</div>}

            {profileTab === 'info' ? (
              <form onSubmit={handleUpdateProfile} className="profile-form">
                {/* --- HERO AVATAR SECTION --- */}
                <div className="avatar-hero-card">
                  <div className="avatar-hero-main">
                    <div
                      className={`avatar-preview-box ${avatarDragOver ? 'drag-over' : ''}`}
                      onClick={() => avatarFileInputRef.current?.click()}
                      onDragOver={handleAvatarDragOver}
                      onDragLeave={handleAvatarDragLeave}
                      onDrop={handleAvatarDrop}
                      title="Bấm để chọn ảnh từ máy hoặc kéo thả ảnh vào đây"
                    >
                      {profileAvatarUrl ? (
                        <img
                          src={profileAvatarUrl}
                          alt="Avatar preview"
                          className="avatar-hero-img"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div
                          className="avatar-hero-fallback"
                          style={{
                            background: getAvatarGradient(currentUser?.id || currentUser?.username || 'user'),
                          }}
                        >
                          {(profileDisplayName || currentUser?.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="avatar-hero-overlay">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                          <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        <span>Đổi ảnh</span>
                      </div>
                    </div>

                    <div className="avatar-hero-details">
                      <div className="avatar-hero-title">Ảnh đại diện</div>
                      <div className="avatar-hero-subtitle">
                        {profileAvatarUrl
                          ? (profileAvatarUrl.startsWith('data:image/')
                              ? 'Ảnh tải lên từ thiết bị'
                              : 'Ảnh từ liên kết bên ngoài')
                          : 'Đang dùng chữ cái mặc định'}
                      </div>

                      <div className="avatar-hero-actions">
                        <button
                          type="button"
                          className="avatar-action-btn primary"
                          onClick={() => {
                            setAvatarMethodTab('upload')
                            avatarFileInputRef.current?.click()
                          }}
                          title="Tải ảnh từ máy tính hoặc thiết bị"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                          </svg>
                          <span>Tải ảnh từ máy</span>
                        </button>

                        {profileAvatarUrl && (
                          <button
                            type="button"
                            className="avatar-action-btn view"
                            onClick={() => setPreviewMediaUrl(profileAvatarUrl)}
                            title="Xem ảnh phóng to"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8"></circle>
                              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                              <line x1="11" y1="8" x2="11" y2="14"></line>
                              <line x1="8" y1="11" x2="14" y2="11"></line>
                            </svg>
                            <span>Xem to</span>
                          </button>
                        )}

                        {profileAvatarUrl && (
                          <button
                            type="button"
                            className="avatar-action-btn danger"
                            onClick={handleRemoveAvatar}
                            title="Gỡ ảnh và dùng chữ cái"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Gỡ ảnh</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hidden file input for file picker */}
                  <input
                    type="file"
                    ref={avatarFileInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                    onChange={handleAvatarFileSelect}
                    style={{ display: 'none' }}
                  />

                  {/* SUB-TABS FOR AVATAR SOURCE */}
                  <div className="avatar-source-tabs">
                    <button
                      type="button"
                      className={`avatar-source-tab ${avatarMethodTab === 'upload' ? 'active' : ''}`}
                      onClick={() => setAvatarMethodTab('upload')}
                    >
                      📁 Tải ảnh từ máy
                    </button>
                    <button
                      type="button"
                      className={`avatar-source-tab ${avatarMethodTab === 'url' ? 'active' : ''}`}
                      onClick={() => setAvatarMethodTab('url')}
                    >
                      🌐 Link ảnh bên ngoài
                    </button>
                    <button
                      type="button"
                      className={`avatar-source-tab ${avatarMethodTab === 'preset' ? 'active' : ''}`}
                      onClick={() => setAvatarMethodTab('preset')}
                    >
                      🤖 Ảnh mẫu có sẵn
                    </button>
                  </div>

                  {/* TAB 1: UPLOAD FROM DEVICE */}
                  {avatarMethodTab === 'upload' && (
                    <div
                      className={`avatar-dropzone ${avatarDragOver ? 'active' : ''}`}
                      onClick={() => avatarFileInputRef.current?.click()}
                      onDragOver={handleAvatarDragOver}
                      onDragLeave={handleAvatarDragLeave}
                      onDrop={handleAvatarDrop}
                    >
                      <div className="dropzone-icon">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                      </div>
                      <div className="dropzone-text">
                        <strong>Bấm để chọn tệp ảnh</strong> hoặc kéo thả ảnh vào đây
                      </div>
                      <div className="dropzone-hint">
                        Hỗ trợ JPG, PNG, GIF, WebP, SVG • Tự động nén tối ưu hiển thị
                      </div>
                      <div className="dropzone-badge-paste">
                        📋 Mẹo: Bạn có thể copy ảnh trên mạng rồi bấm <strong>Ctrl + V</strong> để dán trực tiếp
                      </div>

                      {avatarFileMeta && (
                        <div className="avatar-file-status">
                          <span>✅ {avatarFileMeta.name}</span>
                          {avatarFileMeta.size && <span className="size-pill">{avatarFileMeta.size}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: EXTERNAL URL */}
                  {avatarMethodTab === 'url' && (
                    <div className="avatar-url-pane">
                      <div className="avatar-url-input-wrap">
                        <span className="url-prefix-icon">🔗</span>
                        <input
                          type="url"
                          placeholder="Dán link ảnh từ web (https://...)"
                          value={avatarUrlInput}
                          onChange={(e) => {
                            setAvatarUrlInput(e.target.value)
                            setAvatarUrlStatus(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleApplyAvatarUrl()
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="url-apply-btn"
                          onClick={handleApplyAvatarUrl}
                          disabled={avatarCheckingUrl || !avatarUrlInput.trim()}
                        >
                          {avatarCheckingUrl ? 'Đang thử...' : 'Áp dụng'}
                        </button>
                      </div>

                      <div className="avatar-url-tips">
                        {avatarUrlStatus === 'valid' && (
                          <div className="url-status success">
                            ✅ Link ảnh hợp lệ và đã tải thành công!
                          </div>
                        )}
                        {avatarUrlStatus === 'invalid' && (
                          <div className="url-status error">
                            ⚠️ Không thể tải ảnh từ liên kết này. Trang web đó có thể chặn hiển thị bên ngoài (CORS). Bạn hãy tải ảnh về máy rồi dùng tab "Tải ảnh từ máy" nhé!
                          </div>
                        )}
                        {profileAvatarUrl && profileAvatarUrl.startsWith('http') && (
                          <button
                            type="button"
                            className="url-convert-btn"
                            onClick={handleSaveUrlAsBase64}
                            disabled={avatarConvertingBase64}
                            title="Lưu ảnh vào hệ thống để không lo link gốc bị chết"
                          >
                            {avatarConvertingBase64 ? 'Đang chuyển đổi...' : '🛡️ Chuyển thành ảnh lưu trữ vĩnh viễn'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: PRESET AVATARS */}
                  {avatarMethodTab === 'preset' && (
                    <div className="avatar-presets-pane">
                      <div className="preset-grid">
                        {PRESET_AVATARS.map((url, idx) => (
                          <button
                            type="button"
                            key={idx}
                            className={`preset-grid-item ${profileAvatarUrl === url ? 'selected' : ''}`}
                            onClick={() => handleSelectPreset(url)}
                            title={`Mẫu robot ${idx + 1}`}
                          >
                            <img src={url} alt={`Preset ${idx + 1}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <label>
                  Tên hiển thị
                  <input
                    type="text"
                    placeholder="Nhập tên hiển thị (tối đa 50 ký tự)"
                    value={profileDisplayName}
                    maxLength={50}
                    onChange={(e) => setProfileDisplayName(e.target.value)}
                  />
                </label>

                <label>
                  Tên đăng nhập (Username)
                  <input
                    type="text"
                    value={currentUser?.username || ''}
                    disabled
                    className="disabled-input"
                  />
                  <small className="field-hint">Tên đăng nhập cố định không thể thay đổi</small>
                </label>

                <label>
                  Tiểu sử / Trạng thái
                  <textarea
                    placeholder="Mô tả ngắn về bạn..."
                    value={profileBio}
                    maxLength={200}
                    rows={3}
                    onChange={(e) => setProfileBio(e.target.value)}
                  />
                  <small className="field-hint text-right">{profileBio.length}/200 ký tự</small>
                </label>

                {currentUser?.created_at && (
                  <div className="account-meta">
                    🗓 Ngày tham gia: <strong>{formatDate(currentUser.created_at)}</strong>
                  </div>
                )}

                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowProfileModal(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={profileLoading}
                  >
                    {profileLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleChangePassword} className="profile-form">
                <label>
                  Mật khẩu hiện tại
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu đang dùng"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </label>

                <label>
                  Mật khẩu mới
                  <input
                    type="password"
                    placeholder="Ít nhất 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </label>

                <label>
                  Xác nhận mật khẩu mới
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </label>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowProfileModal(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={profileLoading}
                  >
                    {profileLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Đặt tên gợi nhớ (Khớp theo ảnh người dùng) */}
      {editingNickname && activeChat && (
        <div className="modal-overlay" onClick={() => setEditingNickname(false)}>
          <div className="tg-nickname-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tg-nickname-modal-header">
              <h3>Đặt tên gợi nhớ</h3>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveNickname(activeChat.id, nicknameInput)
              }}
            >
              <div className="tg-nickname-modal-body">
                <img
                  src={
                    activeChat.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${activeChat.username}`
                  }
                  alt=""
                  className="tg-nickname-avatar"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${activeChat.username}`
                  }}
                />

                <p className="tg-nickname-guide">
                  Hãy đặt cho <strong>{activeChat.display_name || activeChat.username}</strong> một cái tên dễ nhớ.
                  <span>Lưu ý: Tên gợi nhớ sẽ chỉ hiển thị riêng với bạn.</span>
                </p>

                <input
                  type="text"
                  className="tg-nickname-input"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="Nhập tên gợi nhớ..."
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div className="tg-nickname-modal-footer">
                <button
                  type="button"
                  className="tg-nickname-cancel-btn"
                  onClick={() => setEditingNickname(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="tg-nickname-confirm-btn">
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chia sẻ / Chuyển tiếp tin nhắn Modal */}
      {sharingMessage && (
        <div
          className="modal-overlay"
          onClick={() => setSharingMessage(null)}
        >
          <div
            className="modal-card tg-forward-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 14 20 9 15 4"></polyline>
                    <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                  </svg>
                </div>
                <div>
                  <h3>Chia sẻ tin nhắn</h3>
                  <p>Chọn bạn bè để chuyển tiếp tin nhắn này</p>
                </div>
              </div>
              <button
                className="modal-close-button"
                onClick={() => setSharingMessage(null)}
              >
                ✕
              </button>
            </div>

            {/* Quoted preview of the message being forwarded */}
            <div className="tg-forward-preview">
              <div className="tg-forward-preview-quote">
                <div className="tg-reply-bar" />
                <div className="tg-reply-quote-content">
                  <span className="tg-reply-author">
                    {sharingMessage.sender_id === currentUser?.id
                      ? 'Bạn'
                      : getFriendName(activeChat)}
                  </span>
                  <span className="tg-reply-snippet">
                    {getMessageSnippet(sharingMessage.content)}
                  </span>
                </div>
              </div>
            </div>

            {/* Search contact to forward */}
            <div className="tg-forward-search">
              <input
                type="text"
                placeholder="Tìm bạn bè..."
                value={forwardSearchQuery}
                onChange={(e) => setForwardSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {forwardSuccessMessage && (
              <div className="modal-alert success">
                {forwardSuccessMessage}
              </div>
            )}

            {/* Friends list to send to */}
            <div className="tg-forward-list">
              {friends
                .filter((friend) => {
                  const name = getFriendName(friend).toLowerCase()
                  const uname = (friend.username || '').toLowerCase()
                  const q = forwardSearchQuery.trim().toLowerCase()
                  return !q || name.includes(q) || uname.includes(q)
                })
                .map((friend) => {
                  const isSent = Boolean(forwardSent[friend.id])
                  const isSending = Boolean(forwardSending[friend.id])
                  return (
                    <div className="tg-forward-item" key={friend.id}>
                      <div className="tg-forward-avatar">
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          getFriendName(friend).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="tg-forward-info">
                        <strong>{getFriendName(friend)}</strong>
                        <small>@{friend.username}</small>
                      </div>
                      <button
                        className={`tg-forward-btn ${isSent ? 'sent' : ''}`}
                        onClick={() => handleForwardMessage(friend.id, sharingMessage)}
                        disabled={isSending || isSent}
                      >
                        {isSending ? 'Đang gửi...' : isSent ? '✓ Đã gửi' : 'Gửi'}
                      </button>
                    </div>
                  )
                })}
              {friends.length === 0 && (
                <div className="tg-empty-list">
                  Chưa có bạn bè nào trong danh bạ
                </div>
              )}
            </div>

            <div className="tg-forward-footer">
              <button
                className="secondary-button"
                onClick={() => {
                  handleCopyMessage(sharingMessage.content)
                  setForwardSuccessMessage('Đã sao chép nội dung tin nhắn!')
                  setTimeout(() => setForwardSuccessMessage(''), 2500)
                }}
              >
                📋 Sao chép nội dung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toast notification */}
      {copyToast && (
        <div className="tg-floating-toast">
          {copyToast}
        </div>
      )}
    </div>
  )
}

export default App
