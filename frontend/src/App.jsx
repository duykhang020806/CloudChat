import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import './App.css'
import { supabase } from './supabaseClient'
import { getAppleEmojiUrl, renderWithAppleEmoji } from './appleEmoji.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import {
  getMemoryCachedMessages,
  setMemoryCachedMessages,
  saveMessagesToDb,
  getMessagesFromDb,
  deleteMessagesFromDb,
  preloadImage,
} from './chatMediaDb.js'
import ChatImage from './ChatImage.jsx'


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
  } catch { }

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

  const now = Date.now()
  const diffMs = now - date.getTime()
  if (diffMs < 0) return 'vài giây'

  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSec < 60) {
    return 'vài giây'
  }
  if (diffMin < 60) {
    return `${diffMin} phút`
  }
  if (diffHours < 24) {
    return `${diffHours} giờ`
  }
  if (diffDays === 1) {
    return 'Hôm qua'
  }
  if (diffDays < 7) {
    return `${diffDays} ngày`
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

  if (content === '__REVOKED__' || content === '[Tin nhắn đã được thu hồi]') {
    return `${prefix}🚫 Tin nhắn đã được thu hồi`
  }

  if (content.startsWith('{') && content.endsWith('}')) {
    try {
      const p = JSON.parse(content)
      if (p.isRevoked) return `${prefix}🚫 Tin nhắn đã được thu hồi`
      if (p.isVoice) return `${prefix}🎤 Tin nhắn thoại`
      if (p.isImage) return `${prefix}📷 ${p.caption ? p.caption : 'Hình ảnh'}`
      if (p.isVideo) return `${prefix}🎥 ${p.caption ? p.caption : 'Video'}`
      if (p.isAttachment) return `${prefix}📎 ${p.fileName || 'Tệp đính kèm'}`
    } catch { }
  }

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

export function getDefaultAvatar(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'https://cdn.auth0.com/avatars/u.png'
  }
  const clean = name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
  const parts = clean.split(/\s+/).filter(Boolean)
  let initials = ''
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toLowerCase()
  } else if (parts.length === 1) {
    initials = parts[0].slice(0, 2).toLowerCase()
  }
  initials = initials.replace(/[^a-z0-9]/gi, '')
  if (!initials) initials = 'u'
  return `https://cdn.auth0.com/avatars/${initials}.png`
}

function getFriendInitials(name) {
  if (!name || typeof name !== 'string' || !name.trim()) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
    return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase() || '?'
  }
  return (name.trim().charAt(0) || '?').toUpperCase()
}

function getFirstCharGroup(name) {
  if (!name || typeof name !== 'string' || !name.trim()) return '#'
  const first = (name.trim().charAt(0) || '#').toUpperCase()
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
  const trimmed = content.trim()
  if (trimmed === '__REVOKED__' || trimmed === '[Tin nhắn đã được thu hồi]') {
    text = '🚫 Tin nhắn đã được thu hồi'
  } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const p = JSON.parse(trimmed)
      if (p.isRevoked) text = '🚫 Tin nhắn đã được thu hồi'
      else if (p.isVoice) text = '🎤 Tin nhắn thoại'
      else if (p.isImage) text = p.caption ? `📷 ${p.caption}` : '📷 Hình ảnh'
      else if (p.isVideo) text = p.caption ? `🎥 ${p.caption}` : '🎥 Video'
      else if (p.isAttachment) text = `📎 ${p.fileName || 'Tệp đính kèm'}`
    } catch { }
  } else {
    const att = parseAttachment(content)
    if (att) {
      text = `📎 ${att.fileName || 'Tệp đính kèm'}`
    } else if (content.startsWith('data:image/') || /^https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg)/i.test(content)) {
      text = '📷 Hình ảnh'
    } else if (content.startsWith('data:video/') || /^https?:\/\/[^\s]+?\.(?:mp4|webm|mov|ogg)/i.test(content)) {
      text = '🎥 Video'
    }
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
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const p = JSON.parse(trimmed)
      if (p.isImage) return !p.caption
    } catch { }
  }
  return (
    trimmed.startsWith('data:image/') ||
    /^https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s]*)?$/i.test(trimmed)
  )
}

function isRevokedMessage(content) {
  if (!content || typeof content !== 'string') return false
  const trimmed = content.trim()
  if (trimmed === '__REVOKED__' || trimmed === '[Tin nhắn đã được thu hồi]') return true
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const p = JSON.parse(trimmed)
      return Boolean(p.isRevoked)
    } catch { }
  }
  return false
}

function getEmojiOnlyList(content) {
  if (!content || typeof content !== 'string') return null
  const trimmed = content.trim()
  if (!trimmed) return null

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || /^https?:\/\//i.test(trimmed)) {
    return null
  }

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
      const segments = Array.from(segmenter.segment(trimmed))
      const emojis = []
      for (const seg of segments) {
        const s = seg.segment
        if (/^\s+$/.test(s)) {
          continue
        }
        if (/\p{Extended_Pictographic}/u.test(s) || /^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(s)) {
          emojis.push(s)
        } else {
          return null
        }
      }
      if (emojis.length > 0) {
        return emojis
      }
      return null
    } catch { }
  }

  const singleEmojiRegex = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?)*|[\u{1F1E6}-\u{1F1FF}]{2})$/u
  if (singleEmojiRegex.test(trimmed)) {
    return [trimmed]
  }

  return null
}

function isSingleEmojiMessage(content) {
  const list = getEmojiOnlyList(content)
  return Boolean(list && list.length === 1)
}

function renderTextWithMentionsAndEmoji(text, keyPrefix) {
  if (!text) return null
  const mentionPattern = /(@everyone|@[a-zA-Z0-9_.-]+(?:@[a-zA-Z0-9_.-]+)?)/g
  const parts = text.split(mentionPattern)
  if (parts.length === 1) {
    return renderWithAppleEmoji(text, keyPrefix)
  }
  return parts.map((part, idx) => {
    if (part.toLowerCase() === '@everyone') {
      return (
        <span key={`${keyPrefix}-ev-${idx}`} className="tg-mention-tag tg-mention-everyone">
          @everyone
        </span>
      )
    }
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span key={`${keyPrefix}-usr-${idx}`} className="tg-mention-tag">
          {part}
        </span>
      )
    }
    return renderWithAppleEmoji(part, `${keyPrefix}-txt-${idx}`)
  })
}

function renderHighlightedText(content, highlightQuery) {
  if (!content) return null
  const urlPattern = /(https?:\/\/[^\s]+)/g
  const segments = content.split(urlPattern)
  const q = (highlightQuery || '').trim()

  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
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
                {renderWithAppleEmoji(part, `hl-${segIdx}-${pIdx}`)}
              </mark>
            ) : (
              renderTextWithMentionsAndEmoji(part, `txt-${segIdx}-${pIdx}`)
            )
          )
        }

        return renderTextWithMentionsAndEmoji(seg, `seg-${segIdx}`)
      })}
    </span>
  )
}

function VoicePlayer({ audioUrl, duration }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const updateTime = () => {
      setCurrentTime(audio.currentTime)
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
      }
    }
    const onEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    }
    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = (e) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => console.error('Audio play error:', err))
    }
  }

  const formatSec = (sec) => {
    const s = Math.floor(sec || 0)
    const m = Math.floor(s / 60)
    const rem = s % 60
    return `${m}:${rem < 10 ? '0' : ''}${rem}`
  }

  return (
    <div className="tg-voice-player">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button type="button" className={`tg-voice-play-btn ${isPlaying ? 'playing' : ''}`} onClick={togglePlay}>
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>
      <div className="tg-voice-body">
        <div className="tg-voice-waveform">
          {[40, 75, 30, 95, 60, 100, 45, 80, 55, 90, 35, 75, 50, 85, 65, 40, 70, 35].map((h, i) => (
            <span
              key={i}
              className={`tg-wave-bar ${(i / 18) * 100 <= progress ? 'active' : ''}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="tg-voice-meta">
          <span>{isPlaying ? formatSec(currentTime) : formatSec(duration || 0)}</span>
          <span> •</span>
        </div>
      </div>
    </div>
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
      if (p.isRevoked || p.isVoice || p.isImage) return null
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

const AUTH_TRANSLATIONS = {
  vi: {
    brandName: 'CloudChat',
    brandBadge: 'CLOUD',
    sloganMain: 'Kết nối mọi khoảng cách, hiệu suất không giới hạn !',
    sloganSub: 'CloudChat - Nền tảng giao tiếp đám mây bảo mật & tức thì',
    loginTitle: 'Đăng nhập CloudChat',
    loginSubtitle: 'Sử dụng tài khoản email và mật khẩu để tiếp tục',
    emailLabel: 'Email tài khoản',
    emailPlaceholder: 'Nhập Email của bạn',
    passwordLabel: 'Mật khẩu',
    passwordPlaceholder: 'Nhập mật khẩu',
    showPwd: 'Hiện',
    hidePwd: 'Ẩn',
    signInBtn: 'Đăng nhập',
    signingInBtn: 'Đang đăng nhập...',
    orDivider: 'Hoặc tiếp tục với',
    googleBtn: 'Đăng nhập với Google',
    noAccount: 'Chưa có tài khoản?',
    signUpNow: 'Đăng ký ngay',
    registerSloganMain: 'Tạo tài khoản mới, bắt đầu kết nối tức thì !',
    registerSloganSub: 'Gia nhập không gian trò chuyện đám mây thế hệ mới',
    registerTitle: 'Tạo tài khoản CloudChat',
    registerSubtitle: 'Đăng ký tài khoản để bắt đầu trải nghiệm',
    displayNameLabel: 'Tên hiển thị',
    displayNamePlaceholder: 'Ví dụ: Nguyễn Văn A',
    registerEmailLabel: 'Email đăng ký',
    confirmPasswordLabel: 'Xác nhận mật khẩu',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu',
    registerBtn: 'Đăng ký tài khoản',
    registeringBtn: 'Đang tạo tài khoản...',
    hasAccount: 'Đã có tài khoản?',
    backToLogin: '← Quay lại Đăng nhập',
    mockSearch: 'Tìm kiếm',
    mockTabAll: 'Tất cả',
    mockTabGroup: 'Nhóm',
    mockTabDirect: 'Cá nhân',
    mockTabUnread: 'Chưa đọc',
    mockTabMention: 'Được nhắc',
    mockTyping: '••• Đang nhập...',
    mockMsg1: 'Chào buổi sáng tốt lành nhé!',
    mockMsg2: 'CloudChat v2.0 đã cập nhật thành công!',
    mockMsg3: 'Dự_án_CloudChat.pdf',
    langEn: 'Tiếng Anh',
    langVi: 'Tiếng Việt',
  },
  en: {
    brandName: 'CloudChat',
    brandBadge: 'CLOUD',
    sloganMain: 'Connecting Every Distance, Limitless Performance !',
    sloganSub: 'CloudChat - Next-generation secure cloud messaging',
    loginTitle: 'Sign in to CloudChat',
    loginSubtitle: 'Enter your email and password to access workspace',
    emailLabel: 'Account Email',
    emailPlaceholder: 'Enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    showPwd: 'Show',
    hidePwd: 'Hide',
    signInBtn: 'Sign In',
    signingInBtn: 'Signing in...',
    orDivider: 'Or continue with',
    googleBtn: 'Sign in with Google',
    noAccount: "Don't have an account?",
    signUpNow: 'Sign up now',
    registerSloganMain: 'Create a new account, connect instantly !',
    registerSloganSub: 'Join the next-generation secure cloud workspace',
    registerTitle: 'Create CloudChat Account',
    registerSubtitle: 'Register an account to start your journey',
    displayNameLabel: 'Display Name',
    displayNamePlaceholder: 'e.g. Duy Khang',
    registerEmailLabel: 'Email Address',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    registerBtn: 'Create Account',
    registeringBtn: 'Creating account...',
    hasAccount: 'Already have an account?',
    backToLogin: '← Back to Sign In',
    mockSearch: 'Search',
    mockTabAll: 'All',
    mockTabGroup: 'Groups',
    mockTabDirect: 'Direct',
    mockTabUnread: 'Unread',
    mockTabMention: 'Mentions',
    mockTyping: '••• Typing...',
    mockMsg1: 'Hello! Have a productive working day! 🚀',
    mockMsg2: 'CloudChat v2.0 updated successfully!',
    mockMsg3: 'Project_Report.pdf',
    langEn: 'English',
    langVi: 'Vietnamese',
  }
}

/* ==========================================================================
   CUSTOM DOB SELECT DROPDOWN (KHỚP THEO ẢNH 1: VIỀN XANH, POPUP BO TRÒN, TÍCH XANH)
   ========================================================================== */
function CustomDobSelect({ value, options, onChange, placeholder = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const selectedEl = dropdownRef.current.querySelector('.selected')
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [isOpen])

  const selectedOption = options.find((opt) => String(opt.value) === String(value))
  const displayLabel = selectedOption ? selectedOption.label : (value || placeholder)

  return (
    <div className={`custom-dob-select-wrap ${isOpen ? 'open' : ''}`} ref={selectRef}>
      <button
        type="button"
        className="custom-dob-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{displayLabel}</span>
        <svg
          className={`custom-dob-chevron ${isOpen ? 'rotate' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="custom-dob-dropdown" ref={dropdownRef}>
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value)
            return (
              <div
                key={opt.value}
                className={`custom-dob-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <span className="custom-dob-option-check">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   VERIFIED BLUE BADGE (TÍCH XANH CHÍNH THỨC)
   ========================================================================== */
export function VerifiedBadge({ size = 16, style = {} }) {
  return (
    <span
      className="tg-verified-badge"
      title="Tài khoản chính thức đã xác minh"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
        verticalAlign: 'middle',
        ...style,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#2563eb" />
        <path
          d="M8.5 12.5l2.5 2.5 5-5"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/* ==========================================================================
   AVATAR CROP MODAL (CHỈNH SỬA HÌNH ẢNH - CHUẨN GIAO DIỆN HÌNH ẢNH YÊU CẦU)
   ========================================================================== */
function AvatarCropModal({ imageSource, onApply, onCancel }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0) // 0, 90, 180, 270
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 })
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 })
  const imgRef = useRef(null)

  const CROP_DIAMETER = 260

  const handleImageLoad = (e) => {
    const nw = e.target.naturalWidth || 300
    const nh = e.target.naturalHeight || 300
    setNaturalDimensions({ width: nw, height: nh })
  }

  // Tính scale cơ sở để ảnh luôn phủ kín vòng tròn cắt
  const isPerpendicular = rotation % 180 !== 0
  const effW = isPerpendicular ? naturalDimensions.height : naturalDimensions.width
  const effH = isPerpendicular ? naturalDimensions.width : naturalDimensions.height
  const baseScale = effW && effH ? Math.max(CROP_DIAMETER / effW, CROP_DIAMETER / effH) : 1
  const currentScale = baseScale * zoom

  // Kéo thả chuột
  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setPan({
      x: dragStart.initialPanX + dx,
      y: dragStart.initialPanY + dy,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  // Kéo thả cảm ứng trên điện thoại
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      })
    }
  }

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - dragStart.x
    const dy = e.touches[0].clientY - dragStart.y
    setPan({
      x: dragStart.initialPanX + dx,
      y: dragStart.initialPanY + dy,
    })
  }

  const handleTouchEnd = () => setIsDragging(false)

  // Lăn chuột để phóng to / thu nhỏ
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY * -0.002
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))))
  }

  // Nút xoay 90 độ cùng chiều kim đồng hồ
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  // Cắt ảnh xuất ra Canvas chuẩn 512x512 độ phân giải cao
  const handleApply = () => {
    if (!imgRef.current) return
    const img = imgRef.current
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const ratio = 512 / CROP_DIAMETER

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.save()

    // Căn giữa canvas
    ctx.translate(256, 256)
    // Tịnh tiến vị trí kéo
    ctx.translate(pan.x * ratio, pan.y * ratio)
    // Xoay ảnh
    ctx.rotate((rotation * Math.PI) / 180)
    // Phóng to thu nhỏ
    const finalScale = baseScale * zoom * ratio
    ctx.scale(finalScale, finalScale)

    // Vẽ ảnh ở trung tâm
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
    ctx.restore()

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92)
    onApply(croppedDataUrl)
  }

  const rawUrl = typeof imageSource === 'string' ? imageSource : imageSource?.dataUrl || ''

  return (
    <div className="modal-overlay tg-crop-modal-overlay" onClick={onCancel}>
      <div className="modal-card tg-crop-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Tiêu đề & nút đóng theo đúng ảnh mẫu */}
        <div className="modal-header tg-crop-header">
          <h3 className="tg-crop-title">Chỉnh sửa Hình ảnh</h3>
          <button className="modal-close-button" onClick={onCancel} title="Đóng">
            ✕
          </button>
        </div>

        {/* Khung xem trước kéo cắt với vòng tròn viền trắng */}
        <div
          className={`tg-crop-workspace ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          <img
            ref={imgRef}
            src={rawUrl}
            alt="Target"
            onLoad={handleImageLoad}
            className="tg-crop-target-img"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${currentScale})`,
            }}
            draggable={false}
          />
          {/* Lớp phủ vòng tròn cắt hình tròn */}
          <div className="tg-crop-circle-mask" />
        </div>

        {/* Thanh công cụ: Icon nhỏ, Slider Zoom, Icon lớn, Nút Xoay 90 độ */}
        <div className="tg-crop-controls">
          <button
            type="button"
            className="tg-crop-icon-btn"
            onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
            title="Thu nhỏ"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="tg-crop-slider"
          />

          <button
            type="button"
            className="tg-crop-icon-btn"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
            title="Phóng to"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          <button
            type="button"
            className="tg-crop-icon-btn rotate-btn"
            onClick={handleRotate}
            title="Xoay 90°"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6" />
              <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>

        {/* Nút hành động */}
        <div className="tg-crop-footer">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className="primary-button" onClick={handleApply}>
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   CLOUDCHAT OFFICIAL SYSTEM BOT & CLIENT INFO
   ========================================================================== */
export const CLOUDCHAT_BOT_ID = 'cloudchat_system_bot'

export const CLOUDCHAT_SYSTEM_BOT = {
  id: CLOUDCHAT_BOT_ID,
  username: 'cloudchat',
  display_name: 'CloudChat',
  avatar_url: '',
  is_group: false,
  is_verified: true,
  is_system_bot: true,
  bio: 'Tài khoản chính thức của CloudChat',
  is_online: true,
  last_message: 'You have successfully logged in to use ChatCloud.',
}

function getClientBrowserInfo() {
  const ua = navigator.userAgent
  let browser = 'Chrome 132'
  let os = 'Windows'

  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/(\d+)/)
    browser = `Edge ${match ? match[1] : ''}`
  } else if (ua.includes('Chrome/')) {
    const match = ua.match(/Chrome\/(\d+)/)
    browser = `Chrome ${match ? match[1] : '132'}`
  } else if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/(\d+)/)
    browser = `Firefox ${match ? match[1] : ''}`
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari'
  }

  if (ua.includes('Windows NT 10.0')) os = 'Windows'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Linux')) os = 'Linux'

  return `${browser} on ${os}`
}

const EMOJI_CATEGORIES = [
  {
    title: 'Cảm xúc',
    icon: '😊',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😋', '😛', '😜', '🤪', '😎', '🥳', '😏', '😒', '😞', '🥺', '😢', '😭', '😤', '😡', '🤬', '🤯', '😳', '😱', '😰', '🤔', '🤫', '🤐', '😴', '🤤', '😵'],
  },
  {
    title: 'Cử chỉ',
    icon: '👍',
    emojis: ['👍', '👎', '👏', '🙌', '👐', '🤝', '👊', '✊', '🤛', '🤜', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '✋', '👋', '🤙', '💪', '🙏', '✍️', '🤳', '💅'],
  },
  {
    title: 'Trái tim',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '🔥', '✨', '🌟', '⭐', '💫', '💥', '💯', '💢', '💬', '💭'],
  },
  {
    title: 'Đồ vật',
    icon: '🎉',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '🚀', '✈️', '🚗', '🔔', '📢', '🎵', '🎶', '💡', '🔑', '🔒', '📱', '💻', '☕', '🍺', '🍕', '🍔', '🍰', '🎂', '🌸', '🌹', '🍀'],
  },
]

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [page, setPage] = useState('loading')
  const [loginEmail, setLoginEmail] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [registerDisplayName, setRegisterDisplayName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const [friends, setFriends] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const activeChatRef = useRef(activeChat)
  useEffect(() => {
    activeChatRef.current = activeChat
  }, [activeChat])

  const [messages, setMessages] = useState([])

  const [search, setSearch] = useState('')
  const [globalSearchResults, setGlobalSearchResults] = useState([])
  const [searchUsersResults, setSearchUsersResults] = useState([])
  const [searchGroupsResults, setSearchGroupsResults] = useState([])
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchCategoryTab, setSearchCategoryTab] = useState('all') // 'all' | 'users' | 'messages'
  const [searchLoading, setSearchLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const prevChatIdRef = useRef(null)
  const isJustSwitchedChatRef = useRef(false)
  const userSentMessageRef = useRef(false)

  // Auto-hide scrollbars after 3 seconds of inactivity (show only when scrolling/mouse wheel)
  useEffect(() => {
    // Purge any corrupted cached messages from localStorage
    try {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('cloudchat_cached_msgs_')) {
          const val = localStorage.getItem(k)
          if (val && val.includes('base64,...')) {
            keysToRemove.push(k)
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k))
    } catch { }

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
  const [profileDisplayName, setProfileDisplayName] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('')
  const [profileGender, setProfileGender] = useState('nam') // 'nam' | 'nu'
  const [birthDay, setBirthDay] = useState('02')
  const [birthMonth, setBirthMonth] = useState('08')
  const [birthYear, setBirthYear] = useState('2006')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const avatarFileInputRef = useRef(null)
  const [profileTab, setProfileTab] = useState('info') // 'info' | 'password'
  const [avatarDragOver, setAvatarDragOver] = useState(false)
  const [avatarMethodTab, setAvatarMethodTab] = useState('upload') // 'upload' | 'url' | 'preset'
  const [avatarFileMeta, setAvatarFileMeta] = useState(null)
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const [avatarUrlStatus, setAvatarUrlStatus] = useState(null) // null | 'valid' | 'invalid'
  const [avatarCheckingUrl, setAvatarCheckingUrl] = useState(false)
  const [avatarConvertingBase64, setAvatarConvertingBase64] = useState(false)

  // System Theme & Settings Modal State
  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem('cloudchat_theme') || 'dark'
    } catch {
      return 'dark'
    }
  })
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [loginLang, setLoginLang] = useState(() => {
    try {
      return localStorage.getItem('cloudchat_auth_lang') || 'vi'
    } catch {
      return 'vi'
    }
  })
  const handleSetLang = (lang) => {
    setLoginLang(lang)
    try {
      localStorage.setItem('cloudchat_auth_lang', lang)
    } catch { }
  }
  const authT = AUTH_TRANSLATIONS[loginLang] || AUTH_TRANSLATIONS.vi



  // Blocked Users State (Danh sách đã chặn)
  const [blockedUserIds, setBlockedUserIds] = useState(() => {
    try {
      const saved = localStorage.getItem('cloudchat_blocked_users')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Anti-Spam Login / Register State (Chống spam, honeypot & rate limit)
  const formMountTimeRef = useRef(Date.now())
  const [honeypotVal, setHoneypotVal] = useState('')
  const [authAttempts, setAuthAttempts] = useState(() => {
    try {
      return parseInt(sessionStorage.getItem('cc_auth_attempts') || '0', 10)
    } catch {
      return 0
    }
  })
  const [authLockoutUntil, setAuthLockoutUntil] = useState(() => {
    try {
      return parseInt(sessionStorage.getItem('cc_lockout_until') || '0', 10)
    } catch {
      return 0
    }
  })
  const [mathChallenge, setMathChallenge] = useState({ q: '', a: 0 })
  const [userMathAnswer, setUserMathAnswer] = useState('')

  // CloudChat Bot Messages
  const [cloudChatBotMessages, setCloudChatBotMessages] = useState([])

  // Security Modal State (Bảo mật tài khoản / Đổi mật khẩu)
  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [securityLoading, setSecurityLoading] = useState(false)
  const [securityError, setSecurityError] = useState('')
  const [securitySuccess, setSecuritySuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

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

  // Add Friend Tab State ('search' | 'received' | 'sent')
  const [addFriendTab, setAddFriendTab] = useState('search') // 'search' | 'received' | 'sent'
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
  const [showAllMedia, setShowAllMedia] = useState(false)
  const [cropImageSource, setCropImageSource] = useState(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const photoInputRef = useRef(null)
  const documentInputRef = useRef(null)
  const attachMenuRef = useRef(null)

  // Attachment Picker & Preview states
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [pendingAttachment, setPendingAttachment] = useState(null)

  // Voice Note Recording states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [isVoicePaused, setIsVoicePaused] = useState(false)
  const [voiceDuration, setVoiceDuration] = useState(0)
  const [voiceDurationMs, setVoiceDurationMs] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const voiceTimerRef = useRef(null)
  const voiceStreamRef = useRef(null)
  const voiceStartTimeRef = useRef(0)
  const voicePausedDurationRef = useRef(0)
  const voicePauseTimeRef = useRef(0)

  // Emoji Picker states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [activeEmojiTab, setActiveEmojiTab] = useState(0)
  const emojiPickerRef = useRef(null)

  // Local hidden message IDs ("Xóa mình tôi")
  const [hiddenMessageIds, setHiddenMessageIds] = useState(() => {
    try {
      const stored = localStorage.getItem('cloudchat_hidden_msgs')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Pagination / Load 20 tin nhắn gần nhất & Tối ưu hiệu năng
  const [visibleCount, setVisibleCount] = useState(20)

  // Message Actions Popover (khi ấn nút ...)
  const [activeActionMsgId, setActiveActionMsgId] = useState(null)
  const [deletingMsgId, setDeletingMsgId] = useState(null)

  // Groups & Community State
  const [groups, setGroups] = useState([])
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [groupNameInput, setGroupNameInput] = useState('')
  const [groupAvatarInput, setGroupAvatarInput] = useState('')
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState([])
  const [createGroupError, setCreateGroupError] = useState('')
  const [createGroupLoading, setCreateGroupLoading] = useState(false)
  const [groupDetailData, setGroupDetailData] = useState(null)
  const [showAddGroupMemberModal, setShowAddGroupMemberModal] = useState(false)
  const [addMemberSelectedIds, setAddMemberSelectedIds] = useState([])
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const [addMemberError, setAddMemberError] = useState('')

  // Nhắc tên (@username & @everyone)
  const [showMentionPopover, setShowMentionPopover] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionCursorPos, setMentionCursorPos] = useState(0)
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0)
  const mentionPopoverRef = useRef(null)

  // Quản lý nhóm & Lời mời tham gia nhóm
  const [groupInvitations, setGroupInvitations] = useState([])
  const [showRenameGroupModal, setShowRenameGroupModal] = useState(false)
  const [renameGroupNameInput, setRenameGroupNameInput] = useState('')
  const [renameGroupLoading, setRenameGroupLoading] = useState(false)
  const [showDisbandConfirmModal, setShowDisbandConfirmModal] = useState(false)
  const [disbandGroupLoading, setDisbandGroupLoading] = useState(false)
  const [showLeaveGroupConfirmModal, setShowLeaveGroupConfirmModal] = useState(false)
  const [leaveGroupLoading, setLeaveGroupLoading] = useState(false)
  const [activeMemberMenuId, setActiveMemberMenuId] = useState(null)
  const [memberToKickModal, setMemberToKickModal] = useState(null)
  const groupAvatarInputRef = useRef(null)
  const [groupAvatarLoading, setGroupAvatarLoading] = useState(false)

  // Reply & Share State
  const [replyingMessage, setReplyingMessage] = useState(null)
  const [sharingMessage, setSharingMessage] = useState(null)
  const [forwardSearchQuery, setForwardSearchQuery] = useState('')
  const [forwardSuccessMessage, setForwardSuccessMessage] = useState('')
  const [forwardSending, setForwardSending] = useState({})
  const [forwardSent, setForwardSent] = useState({})
  const [copyToast, setCopyToast] = useState('')
  const toastTimerRef = useRef(null)

  // Pinned & Hidden Chats State
  const [pinnedChats, setPinnedChats] = useState([])
  const [hiddenChats, setHiddenChats] = useState([])
  const [activeChatMenuId, setActiveChatMenuId] = useState(null)
  const [showHiddenSection, setShowHiddenSection] = useState(false)

  // Tắt hoàn toàn các thông báo popup bé bé theo yêu cầu người dùng
  const showFloatingToast = () => { }
  const msgInputRef = useRef(null)

  // Đóng emoji picker, attachment menu, mention popover và member menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setShowAttachMenu(false)
      }
      if (mentionPopoverRef.current && !mentionPopoverRef.current.contains(e.target) && msgInputRef.current && !msgInputRef.current.contains(e.target)) {
        setShowMentionPopover(false)
      }
      if (activeMemberMenuId && !e.target.closest('.tg-member-actions-dropdown-wrapper')) {
        setActiveMemberMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [activeMemberMenuId])

  const mentionCandidates = useMemo(() => {
    if (!activeChat?.is_group) return []
    const q = (mentionQuery || '').toLowerCase().trim()
    const all = [
      { isEveryone: true, id: 'everyone', username: 'everyone', display_name: 'Tất cả mọi người (@everyone)' },
      ...(groupDetailData?.members || []).filter((m) => m.id !== currentUser?.id)
    ]
    if (!q) return all
    return all.filter((item) =>
      item.username?.toLowerCase().includes(q) ||
      item.display_name?.toLowerCase().includes(q)
    )
  }, [activeChat?.is_group, groupDetailData?.members, mentionQuery, currentUser?.id])

  const handleInsertEmoji = (emoji) => {
    setMessage((prev) => prev + emoji)
    // Chỉ focus input trên màn hình lớn để tránh bàn phím ảo mobile nhảy lên che picker
    if (window.innerWidth > 860 && msgInputRef.current) {
      msgInputRef.current.focus()
    }
  }

  const handleChatInputChange = (e) => {
    const val = e.target.value
    setMessage(val)
    if (!activeChat?.is_group) {
      setShowMentionPopover(false)
      return
    }
    const cursorPos = e.target.selectionStart || val.length
    const textBeforeCursor = val.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')
    if (atIndex !== -1) {
      const charBeforeAt = atIndex === 0 ? ' ' : textBeforeCursor[atIndex - 1]
      const queryAfterAt = textBeforeCursor.slice(atIndex + 1)
      if (/\s/.test(charBeforeAt) && !/\s/.test(queryAfterAt)) {
        setMentionQuery(queryAfterAt)
        setMentionCursorPos(atIndex)
        setMentionSelectedIndex(0)
        setShowMentionPopover(true)
        return
      }
    }
    setShowMentionPopover(false)
  }

  const handleChatInputKeyDown = (e) => {
    if (showMentionPopover && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionSelectedIndex((prev) => (prev + 1) % mentionCandidates.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionSelectedIndex((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selected = mentionCandidates[mentionSelectedIndex] || mentionCandidates[0]
        if (selected) {
          handleSelectMention(selected)
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentionPopover(false)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSelectMention = (cand) => {
    const tag = cand.isEveryone ? '@everyone ' : `@${cand.username} `
    const before = message.slice(0, mentionCursorPos)
    const after = message.slice(mentionCursorPos + 1 + (mentionQuery || '').length)
    const newMsg = before + tag + after
    setMessage(newMsg)
    setShowMentionPopover(false)
    setMentionQuery('')
    if (msgInputRef.current) {
      msgInputRef.current.focus()
      const newPos = before.length + tag.length
      setTimeout(() => {
        msgInputRef.current?.setSelectionRange(newPos, newPos)
      }, 0)
    }
  }

  // Xác định người dùng đăng nhập bằng OAuth (Google, v.v.)
  const isOAuthUser = Boolean(
    currentUser?.is_oauth ||
    currentUser?.provider === 'google' ||
    (currentUser?.app_metadata?.provider && currentUser?.app_metadata?.provider !== 'email')
  )

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

  // Sync pinned and hidden chats per user account
  useEffect(() => {
    if (!currentUser?.id) return
    try {
      const pinKey = `cloudchat_pinned_${currentUser.id}`
      const savedPin = localStorage.getItem(pinKey)
      if (savedPin) {
        setPinnedChats(JSON.parse(savedPin))
      } else {
        setPinnedChats([])
      }

      const hideKey = `cloudchat_hidden_${currentUser.id}`
      const savedHide = localStorage.getItem(hideKey)
      if (savedHide) {
        setHiddenChats(JSON.parse(savedHide))
      } else {
        setHiddenChats([])
      }
    } catch {
      setPinnedChats([])
      setHiddenChats([])
    }
  }, [currentUser?.id])

  // Close chat context menu on window click
  useEffect(() => {
    const handleWindowClick = () => {
      setActiveChatMenuId(null)
    }
    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  }, [])

  const handleTogglePinChat = (chatId, e) => {
    if (e) e.stopPropagation()
    setActiveChatMenuId(null)
    if (!currentUser?.id) return
    const isPinned = pinnedChats.includes(chatId)
    const updated = isPinned
      ? pinnedChats.filter((id) => id !== chatId)
      : [chatId, ...pinnedChats]
    setPinnedChats(updated)
    try {
      localStorage.setItem(`cloudchat_pinned_${currentUser.id}`, JSON.stringify(updated))
    } catch { }
    showFloatingToast(isPinned ? 'Đã bỏ ghim đoạn chat' : 'Đã ghim đoạn chat lên đầu')
  }

  const handleToggleHideChat = (chatId, e) => {
    if (e) e.stopPropagation()
    setActiveChatMenuId(null)
    if (!currentUser?.id) return
    const isHidden = hiddenChats.includes(chatId)
    const updated = isHidden
      ? hiddenChats.filter((id) => id !== chatId)
      : [...hiddenChats, chatId]
    setHiddenChats(updated)
    try {
      localStorage.setItem(`cloudchat_hidden_${currentUser.id}`, JSON.stringify(updated))
    } catch { }
    showFloatingToast(isHidden ? 'Đã hiện lại đoạn chat' : 'Đã ẩn đoạn chat')
  }

  // Bắt đầu tạo nhóm mới với người bạn này được chọn sẵn
  const handleStartGroupWithFriend = (friend, e) => {
    if (e) e.stopPropagation()
    setActiveChatMenuId(null)
    setShowMenu(false)
    setSelectedGroupMemberIds(friend?.id ? [friend.id] : [])
    setGroupNameInput(friend ? `Nhóm với ${getFriendName(friend)}` : '')
    setGroupAvatarInput('')
    setCreateGroupError('')
    setShowCreateGroupModal(true)
  }

  // Resolve active wallpaper for activeChat or global fallback
  const currentChatWallpaper = useMemo(() => {
    if (activeChat && chatWallpapers[activeChat.id]) {
      return chatWallpapers[activeChat.id]
    }
    return globalWallpaper || { type: 'default', value: '', dim: 0.2, blur: 0 }
  }, [activeChat, chatWallpapers, globalWallpaper])

  const getFriendName = (friend) => {
    if (!friend) return 'Người dùng'
    if (friend.id === CLOUDCHAT_BOT_ID || friend.username === 'cloudchat' || friend.is_system_bot) return 'CloudChat'
    if (nicknames && nicknames[friend.id]) return nicknames[friend.id]
    const resolved = friend.display_name || friend.username || friend.name || friend.full_name || 'Người dùng'
    return typeof resolved === 'string' && resolved.trim() ? resolved.trim() : 'Người dùng'
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
  // Group and sort friends alphabetically for "Bạn bè" tab (Images A, B headers)
  const alphabeticalFriends = useMemo(() => {
    // Tự động ẩn người dùng đã bị chặn khỏi tab Bạn bè
    const visibleFriends = friends.filter((f) => !blockedUserIds.includes(String(f.id)))
    const sorted = [...visibleFriends].sort((a, b) => {
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
  }, [friends, nicknames, blockedUserIds])

  // Sắp xếp và phân loại danh sách chat: CloudChat Bot & Pinned đưa lên đầu, Hidden lọc ra ngoài
  const allChatsSorted = useMemo(() => {
    // CloudChat Bot chính thức
    const botChat = {
      ...CLOUDCHAT_SYSTEM_BOT,
      last_message: cloudChatBotMessages.length > 0
        ? cloudChatBotMessages[cloudChatBotMessages.length - 1].content.split('\n')[0]
        : 'You have successfully logged in to use ChatCloud.',
      last_message_time: cloudChatBotMessages.length > 0
        ? cloudChatBotMessages[cloudChatBotMessages.length - 1].created_at
        : new Date().toISOString(),
    }

    // Gộp cả bot, nhóm và bạn bè thành 1 danh sách
    const all = [
      botChat,
      ...groups.map((g) => ({ ...g, is_group: true })),
      ...friends.map((f) => ({ ...f, is_group: false })),
    ]

    // Lọc theo chế độ xem (ẩn hay bình thường) và tự động ẩn hoàn toàn người dùng bị chặn
    const filtered = all.filter((chat) => {
      if (chat.id === CLOUDCHAT_BOT_ID) return true
      // Nếu là người dùng và đang bị chặn -> ẩn luôn khỏi danh sách hội thoại
      if (!chat.is_group && blockedUserIds.includes(String(chat.id))) {
        return false
      }
      const isHidden = hiddenChats.includes(chat.id)
      return showHiddenSection ? isHidden : !isHidden
    }).map((chat) => {
      const clearKey = `cloudchat_cleared_at_${currentUser?.id}_${chat.id}`
      const clearedAtStr = localStorage.getItem(clearKey)
      if (clearedAtStr && chat.last_message_time) {
        if (new Date(chat.last_message_time).getTime() <= new Date(clearedAtStr).getTime()) {
          return { ...chat, last_message: '' }
        }
      }
      return chat
    })

    // Sắp xếp: Bot luôn ở đầu (hoặc sau pinned), Pinned lên trước
    return filtered.sort((a, b) => {
      if (a.id === CLOUDCHAT_BOT_ID && !pinnedChats.includes(b.id)) return -1
      if (b.id === CLOUDCHAT_BOT_ID && !pinnedChats.includes(a.id)) return 1

      const aPinned = pinnedChats.includes(a.id)
      const bPinned = pinnedChats.includes(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1

      const timeA = new Date(a.last_message_time || a.created_at || 0).getTime()
      const timeB = new Date(b.last_message_time || b.created_at || 0).getTime()
      return timeB - timeA
    })
  }, [groups, friends, pinnedChats, hiddenChats, showHiddenSection, cloudChatBotMessages, blockedUserIds, currentUser?.id])

  const groupsSorted = useMemo(() => {
    const filtered = groups.filter((g) => {
      const isHidden = hiddenChats.includes(g.id)
      return showHiddenSection ? isHidden : !isHidden
    })

    return filtered.sort((a, b) => {
      const aPinned = pinnedChats.includes(a.id)
      const bPinned = pinnedChats.includes(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1

      const timeA = new Date(a.last_message_time || a.created_at || 0).getTime()
      const timeB = new Date(b.last_message_time || b.created_at || 0).getTime()
      return timeB - timeA
    })
  }, [groups, pinnedChats, hiddenChats, showHiddenSection])

  const hiddenCount = useMemo(() => {
    const all = [...groups, ...friends]
    return all.filter((c) => hiddenChats.includes(c.id)).length
  }, [groups, friends, hiddenChats])

  // Modal xác nhận xoá lịch sử trò chuyện
  const [chatToDeleteHistory, setChatToDeleteHistory] = useState(null)
  const [isDeletingChatHistory, setIsDeletingChatHistory] = useState(false)

  // Mở hộp thoại xác nhận xoá trò chuyện (khớp ảnh thiết kế)
  const handleClearChatHistory = (chatTarget) => {
    if (!chatTarget?.id || !currentUser?.id) return
    setChatToDeleteHistory(chatTarget)
  }

  // Thực hiện xoá lịch sử trò chuyện khi người dùng xác nhận "Xóa"
  const confirmClearChatHistory = async () => {
    if (!chatToDeleteHistory?.id || !currentUser?.id) return
    const targetId = chatToDeleteHistory.id
    setIsDeletingChatHistory(true)

    try {
      const nowIso = new Date().toISOString()
      const clearKey = `cloudchat_cleared_at_${currentUser.id}_${targetId}`
      localStorage.setItem(clearKey, nowIso)

      try {
        deleteMessagesFromDb(targetId)
        localStorage.removeItem(`cloudchat_cached_msgs_${targetId}`)
      } catch { }

      if (targetId === CLOUDCHAT_BOT_ID) {
        setCloudChatBotMessages([])
        try {
          localStorage.removeItem(`cloudchat_bot_msgs_${currentUser.id}`)
        } catch { }
      }

      if (activeChat && String(activeChat.id) === String(targetId)) {
        setMessages([])
      }

      if (chatToDeleteHistory.is_group) {
        await supabase
          .from('messages')
          .delete()
          .eq('group_id', targetId)
          .eq('sender_id', currentUser.id)
      } else {
        const { error: delErr } = await supabase
          .from('messages')
          .delete()
          .is('group_id', null)
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${currentUser.id})`)

        if (delErr) {
          await supabase
            .from('messages')
            .delete()
            .eq('sender_id', currentUser.id)
            .eq('receiver_id', targetId)
        }
      }

      showFloatingToast('Đã xoá lịch sử trò chuyện')
    } catch (err) {
      console.error('Lỗi xoá lịch sử chat:', err)
      showFloatingToast('Đã xoá lịch sử trò chuyện')
    } finally {
      setIsDeletingChatHistory(false)
      setChatToDeleteHistory(null)
    }
  }

  // Modal xác nhận Chặn người dùng (Khớp chuẩn hộp thoại xác nhận xoá chat)
  const [userToBlock, setUserToBlock] = useState(null)

  // Xử lý Chặn / Bỏ chặn người dùng
  const handleToggleBlockUser = (user) => {
    if (!user?.id) return
    const uid = String(user.id)
    if (blockedUserIds.includes(uid)) {
      // Đang bị chặn -> Bỏ chặn trực tiếp
      setBlockedUserIds((prev) => {
        const updated = prev.filter((id) => id !== uid)
        showFloatingToast(`Đã bỏ chặn ${user.display_name || user.username}`)
        try {
          localStorage.setItem('cloudchat_blocked_users', JSON.stringify(updated))
        } catch { }
        return updated
      })
    } else {
      // Chưa chặn -> Bật modal xác nhận Chặn
      setUserToBlock(user)
    }
  }

  // Xác nhận chặn người dùng
  const confirmBlockUser = () => {
    if (!userToBlock?.id) return
    const uid = String(userToBlock.id)
    setBlockedUserIds((prev) => {
      const updated = prev.includes(uid) ? prev : [...prev, uid]
      showFloatingToast(`Đã chặn ${userToBlock.display_name || userToBlock.username}`)
      if (activeChat && String(activeChat.id) === uid) {
        setActiveChat(null)
      }
      try {
        localStorage.setItem('cloudchat_blocked_users', JSON.stringify(updated))
      } catch { }
      return updated
    })
    setUserToBlock(null)
  }

  // Mở modal chỉnh sửa hồ sơ cá nhân (Giao diện mới)
  const handleOpenProfileModal = () => {
    setProfileDisplayName(currentUser?.display_name || currentUser?.username || '')
    setProfileBio(currentUser?.bio || '')
    const curAvatar = currentUser?.avatar_url || ''
    setProfileAvatarUrl(curAvatar)

    const storedGender =
      currentUser?.gender ||
      currentUser?.user_metadata?.gender ||
      (currentUser?.id ? localStorage.getItem(`cloudchat_gender_${currentUser.id}`) : null) ||
      'nam'
    setProfileGender(storedGender === 'female' || storedGender === 'nu' ? 'nu' : 'nam')

    let d = '02'
    let m = '08'
    let y = '2006'
    const storedDob =
      currentUser?.birthday ||
      currentUser?.user_metadata?.birthday ||
      (currentUser?.id ? localStorage.getItem(`cloudchat_dob_${currentUser.id}`) : null)
    if (storedDob && typeof storedDob === 'string') {
      const parts = storedDob.split('-')
      if (parts.length === 3) {
        y = parts[0]
        m = String(parseInt(parts[1], 10)).padStart(2, '0')
        d = String(parseInt(parts[2], 10)).padStart(2, '0')
      }
    }
    setBirthDay(d)
    setBirthMonth(m)
    setBirthYear(y)

    setProfileError('')
    setProfileSuccess('')
    setShowProfileModal(true)
  }

  // Cập nhật thông tin cá nhân (Giao diện mới: Tên hiển thị, Bio, Avatar, Giới tính, Ngày sinh)
  const handleUpdateProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!currentUser?.id) return

    setProfileLoading(true)
    setProfileError('')
    setProfileSuccess('')

    const birthdayStr = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`

    try {
      const updates = {
        display_name: (profileDisplayName || '').trim() || currentUser.username,
        bio: (profileBio || '').trim(),
        avatar_url: (profileAvatarUrl || '').trim(),
        gender: profileGender,
        birthday: birthdayStr,
      }

      // Cập nhật vào Supabase profiles
      try {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', currentUser.id)
        if (error) {
          await supabase
            .from('profiles')
            .update({
              display_name: updates.display_name,
              bio: updates.bio,
              avatar_url: updates.avatar_url,
            })
            .eq('id', currentUser.id)
        }
      } catch {
        await supabase
          .from('profiles')
          .update({
            display_name: updates.display_name,
            bio: updates.bio,
            avatar_url: updates.avatar_url,
          })
          .eq('id', currentUser.id)
      }

      // Lưu vào Supabase Auth user_metadata
      try {
        await supabase.auth.updateUser({
          data: {
            display_name: updates.display_name,
            avatar_url: updates.avatar_url,
            bio: updates.bio,
            gender: profileGender,
            birthday: birthdayStr,
          },
        })
      } catch { }

      // Lưu vào localStorage
      try {
        localStorage.setItem(`cloudchat_gender_${currentUser.id}`, profileGender)
        localStorage.setItem(`cloudchat_dob_${currentUser.id}`, birthdayStr)
      } catch { }

      setCurrentUser((prev) => ({
        ...prev,
        ...updates,
      }))
      setProfileSuccess('Cập nhật thông tin cá nhân thành công!')
      setTimeout(() => {
        setShowProfileModal(false)
        setProfileSuccess('')
      }, 1000)
    } catch (err) {
      console.error('Update profile error:', err)
      setProfileError(err?.message || 'Cập nhật thất bại. Vui lòng thử lại!')
    } finally {
      setProfileLoading(false)
    }
  }

  // Xử lý tệp hình ảnh đại diện (Mở modal xem trước & kéo cắt avatar)
  const handleAvatarFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setProfileError('Vui lòng chọn tệp hình ảnh hợp lệ!')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setProfileError('Kích thước ảnh đại diện tối đa là 10MB!')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const res = e.target?.result
      if (res) {
        setCropImageSource({
          dataUrl: res,
          fileName: file.name,
          fileSize: file.size,
        })
      }
    }
    reader.readAsDataURL(file)
  }

  // Khi người dùng bấm "Áp dụng" trong modal Chỉnh sửa Hình ảnh
  const handleApplyCroppedAvatar = async (croppedDataUrl) => {
    if (cropImageSource?.isGroupAvatar) {
      setCropImageSource(null)
      await handleUpdateGroupAvatar(croppedDataUrl)
      return
    }
    setProfileAvatarUrl(croppedDataUrl)
    setAvatarFileMeta({
      name: cropImageSource?.fileName || 'avatar.jpg',
      size: 'Đã cắt chuẩn tròn',
    })
    setCropImageSource(null)
    setProfileSuccess('Đã căn chỉnh ảnh đại diện! Nhấn "Lưu thay đổi" để áp dụng.')
  }

  const handleAvatarFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) handleAvatarFile(file)
    e.target.value = ''
  }

  const handleAvatarDragOver = (e) => {
    e.preventDefault()
    setAvatarDragOver(true)
  }

  const handleAvatarDragLeave = () => {
    setAvatarDragOver(false)
  }

  const handleAvatarDrop = (e) => {
    e.preventDefault()
    setAvatarDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleAvatarFile(file)
  }

  const handleProfilePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) {
          handleAvatarFile(file)
          break
        }
      }
    }
  }

  const handleRemoveAvatar = () => {
    setProfileAvatarUrl('')
    setAvatarFileMeta(null)
    setAvatarUrlInput('')
    setAvatarUrlStatus(null)
    setProfileSuccess('Đã gỡ ảnh đại diện. Nhấn "Lưu thay đổi" để dùng chữ cái mặc định.')
  }

  const handleSelectPreset = (url) => {
    setProfileAvatarUrl(url)
    setProfileSuccess('Đã chọn avatar mẫu! Nhấn "Lưu thay đổi" để áp dụng.')
  }

  const handleApplyAvatarUrl = () => {
    const trimmed = avatarUrlInput.trim()
    if (!trimmed) return
    setAvatarCheckingUrl(true)
    const img = new Image()
    img.onload = () => {
      setAvatarCheckingUrl(false)
      setAvatarUrlStatus('valid')
      setProfileAvatarUrl(trimmed)
      setProfileSuccess('Liên kết ảnh hợp lệ! Nhấn "Lưu thay đổi" để hoàn tất.')
    }
    img.onerror = () => {
      setAvatarCheckingUrl(false)
      setAvatarUrlStatus('invalid')
      setProfileError('Không thể tải ảnh từ URL này. Vui lòng kiểm tra lại link hoặc tải ảnh về máy!')
    }
    img.src = trimmed
  }

  const handleSaveUrlAsBase64 = async () => {
    if (!profileAvatarUrl) return
    setAvatarConvertingBase64(true)
    try {
      const res = await fetch(profileAvatarUrl)
      const blob = await res.blob()
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (result) {
          setProfileAvatarUrl(result)
          setProfileSuccess('Đã chuyển thành ảnh lưu trữ vĩnh viễn!')
        }
        setAvatarConvertingBase64(false)
      }
      reader.readAsDataURL(blob)
    } catch {
      setAvatarConvertingBase64(false)
      setProfileError('Không thể chuyển đổi trực tiếp liên kết ngoài này do CORS. Bạn hãy tải ảnh về máy và dùng tab "Tải ảnh từ máy" nhé!')
    }
  }

  // Khởi tạo câu đố toán học chống bot spam
  const generateNewMathChallenge = () => {
    const num1 = Math.floor(Math.random() * 8) + 2
    const num2 = Math.floor(Math.random() * 8) + 1
    setMathChallenge({ q: `${num1} + ${num2}`, a: num1 + num2 })
    setUserMathAnswer('')
  }



  // Khởi tạo tin nhắn bảo mật của CloudChat Bot khi đăng nhập
  useEffect(() => {
    if (!currentUser?.id) return

    const loadBotMessages = async () => {
      const storageKey = `cloudchat_bot_msgs_${currentUser.id}`
      let saved = []
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) saved = JSON.parse(raw)
      } catch { }

      let ipStr = '171.237.228.53 (Ho Chi Minh City, Vietnam)'
      try {
        const res = await fetch('https://ipwho.is/?fields=ip,city,country')
        const data = await res.json()
        if (data && data.ip) {
          ipStr = `${data.ip} (${data.city || 'Ho Chi Minh City'}, ${data.country || 'Vietnam'})`
        }
      } catch { }

      const browserStr = getClientBrowserInfo()
      const now = new Date()
      const timeStr = now.toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })

      const noticeText = `Bạn đã đăng nhập thành công vào CloudChat.\n\nBrowser: ${browserStr}\nIP: ${ipStr}\n\nBạn có thể nhấn "Đăng xuất phiên" để kết thúc phiên này. ${timeStr}`

      if (saved.length === 0) {
        const initMsg = {
          id: `bot_msg_${Date.now()}`,
          sender_id: CLOUDCHAT_BOT_ID,
          receiver_id: currentUser.id,
          content: noticeText,
          created_at: new Date().toISOString(),
          is_login_notice: true,
          sender_name: 'CloudChat',
          sender_username: 'cloudchat',
          is_verified: true,
        }
        saved = [initMsg]
        try {
          localStorage.setItem(storageKey, JSON.stringify(saved))
        } catch { }
      } else {
        let hasUpdated = false
        saved = saved.map((m) => {
          if (m.is_login_notice || (typeof m.content === 'string' && (m.content.includes('successfully logged in') || m.content.includes('đăng nhập thành công') || m.content.includes('Terminate session')))) {
            hasUpdated = true
            return {
              ...m,
              content: noticeText,
              is_login_notice: true,
            }
          }
          return m
        })
        if (hasUpdated) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(saved))
          } catch { }
        }
      }

      setCloudChatBotMessages(saved)
    }

    loadBotMessages()
  }, [currentUser?.id])

  // Reset in-chat search & info panel when activeChat changes
  useEffect(() => {
    setShowChatSearch(false)
    setChatSearchQuery('')
    setChatSearchIndex(0)
    setEditingNickname(false)
    setReplyingMessage(null)
  }, [activeChat?.id])

  // Global message search across all chats (Supabase PostgreSQL)
  useEffect(() => {
    const q = search.trim().toLowerCase()
    if (!q || !currentUser?.id) {
      setGlobalSearchResults([])
      setSearchUsersResults([])
      setSearchGroupsResults([])
      setSearchSuggestions([])
      setSearchLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        // 1. Tìm người dùng khớp username hoặc display_name
        const { data: matchedUsers } = await supabase
          .from('profiles')
          .select('id, username, display_name, bio, avatar_url')
          .neq('id', currentUser.id)
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .limit(10)

        const userResults = (matchedUsers || []).map((u) => ({
          ...u,
          is_user: true,
          is_friend: friends.some((f) => f.id === u.id),
        }))

        // 2. Tìm nhóm chat mà user đã tham gia khớp tên nhóm
        const matchedGroups = groups.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 10)
        const groupResults = matchedGroups.map((g) => ({ ...g, is_group: true }))

        // 3. Tìm tin nhắn khớp từ khóa
        const { data: matchedMsgs } = await supabase
          .from('messages')
          .select('id, sender_id, receiver_id, group_id, content, created_at')
          .ilike('content', `%${q}%`)
          .order('created_at', { ascending: false })
          .limit(50)

        const enrichedMsgs = (matchedMsgs || []).map((m) => {
          if (m.group_id) {
            const g = groups.find((grp) => String(grp.id) === String(m.group_id))
            return {
              ...m,
              friend_id: m.group_id,
              username: g?.name || 'Nhóm',
              display_name: g?.name || 'Nhóm chat',
              avatar_url: g?.avatar_url || '',
              is_group: true,
            }
          }
          const otherId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id
          const f = friends.find((fr) => fr.id === otherId)
          return {
            ...m,
            friend_id: otherId,
            username: f?.username || 'User',
            display_name: f?.display_name || f?.username || 'Người dùng',
            avatar_url: f?.avatar_url || '',
            is_group: false,
          }
        })

        // 4. Trích xuất gợi ý từ khóa
        const suggestionsSet = new Set()
        for (const m of (matchedMsgs || [])) {
          if (!m.content || m.content.startsWith('data:') || m.content.startsWith('{')) continue
          const contentText = m.content.replace(/\s+/g, ' ')
          const lowerText = contentText.toLowerCase()
          let pos = lowerText.indexOf(q)
          let count = 0
          while (pos !== -1 && count < 3) {
            const startIdx = Math.max(0, pos - 20)
            const endIdx = Math.min(contentText.length, pos + q.length + 25)
            let phrase = contentText.slice(startIdx, endIdx).trim()
            phrase = phrase.replace(/^[^\w\s\u00C0-\u1EF9]+|[^\w\s\u00C0-\u1EF9]+$/g, '').trim()
            if (phrase && phrase.toLowerCase() !== q && phrase.length >= q.length) {
              suggestionsSet.add(phrase)
            }
            pos = lowerText.indexOf(q, pos + q.length + 1)
            count++
          }
          if (suggestionsSet.size >= 8) break
        }

        setGlobalSearchResults(enrichedMsgs)
        setSearchUsersResults(userResults)
        setSearchGroupsResults(groupResults)
        setSearchSuggestions(Array.from(suggestionsSet).slice(0, 6))
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setSearchLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [search, currentUser?.id, friends, groups])

  const handleSelectSearchResult = (res) => {
    const targetId = res.friend_id || (res.sender_id === currentUser?.id ? res.receiver_id : res.sender_id)
    const matchedGroup = groups.find((g) => g.id === targetId)
    const matchedFriend = friends.find((f) => f.id === targetId)

    const chatTarget = matchedGroup || matchedFriend || {
      id: targetId,
      username: res.username || 'User',
      display_name: res.display_name || res.username || 'Người dùng',
      avatar_url: res.avatar_url || null,
      is_group: Boolean(res.is_group),
    }

    setActiveChat(chatTarget)
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
      const text = typeof m.content === 'string' ? m.content.trim() : ''
      if (!text) return

      // 1. Kiểm tra nếu tin nhắn là định dạng JSON (Ảnh gửi từ máy, Video, File đính kèm)
      let parsed = null
      if (text.startsWith('{') && text.endsWith('}')) {
        try {
          parsed = JSON.parse(text)
        } catch { }
      }

      if (parsed) {
        if (parsed.isRevoked) return // Bỏ qua tin nhắn đã thu hồi
        if (parsed.isImage && parsed.url) {
          foundMedia.unshift({
            id: m.id,
            type: 'image',
            url: parsed.url,
            caption: parsed.caption || '',
            date: formatTime(m.created_at) || 'Hôm nay',
          })
        } else if (parsed.isVideo && parsed.url) {
          foundMedia.unshift({
            id: m.id,
            type: 'video',
            url: parsed.url,
            caption: parsed.caption || '',
            date: formatTime(m.created_at) || 'Hôm nay',
          })
        } else if (parsed.isAttachment || parsed.fileName) {
          foundFiles.unshift({
            id: m.id,
            name: parsed.fileName || 'Tài liệu đính kèm',
            size: formatFileSize(parsed.fileSize),
            url: parsed.url || parsed.data || '',
            fileType: parsed.fileType || '',
            date: formatTime(m.created_at) || 'Hôm nay',
          })
        }

        // Nếu có caption chứa link thì thêm vào danh sách link
        if (parsed.caption) {
          const capLinks = parsed.caption.match(/https?:\/\/[^\s"'<>]+/gi)
          if (capLinks) {
            capLinks.forEach((url) => {
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
        return
      }

      // 2. Định dạng thông thường (data: URL hoặc văn bản chứa URL)
      if (text.startsWith('data:image/')) {
        foundMedia.unshift({ id: m.id, type: 'image', url: text, date: formatTime(m.created_at) || 'Hôm nay' })
      } else if (text.startsWith('data:video/')) {
        foundMedia.unshift({ id: m.id, type: 'video', url: text, date: formatTime(m.created_at) || 'Hôm nay' })
      } else {
        // Tìm ảnh thông thường trong văn bản
        const imgMatches = text.match(/https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s"'<>]*)?/gi)
        if (imgMatches) {
          imgMatches.forEach((url) => {
            foundMedia.unshift({ id: m.id, type: 'image', url, date: formatTime(m.created_at) || 'Hôm nay' })
          })
        }

        // Tìm video
        const vidMatches = text.match(/https?:\/\/[^\s"'<>]+?\.(?:mp4|webm|mov|ogg)(?:\?[^\s"'<>]*)?/gi)
        if (vidMatches) {
          vidMatches.forEach((url) => {
            foundMedia.unshift({ id: m.id, type: 'video', url, date: formatTime(m.created_at) || 'Hôm nay' })
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
            /https?:\/\/[^\s"'<>]+?\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|txt|csv)(?:\?[^\s"'<>]*)?/gi
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

        // Check general links
        if (!att && !text.startsWith('data:')) {
          const linkMatches = text.match(/https?:\/\/[^\s"'<>]+/gi)
          if (linkMatches) {
            linkMatches.forEach((url) => {
              const isMediaOrFile = /\.(?:png|jpe?g|gif|webp|svg|mp4|webm|mov|ogg|pdf|docx?|xlsx?|pptx?|zip|rar|txt|csv)(?:\?.*)?$/i.test(url)
              if (!isMediaOrFile) {
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
              }
            })
          }
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
    if (trimmed === '__REVOKED__' || trimmed === '[Tin nhắn đã được thu hồi]') {
      return '🚫 Tin nhắn đã được thu hồi'
    }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const p = JSON.parse(trimmed)
        if (p.isRevoked) return '🚫 Tin nhắn đã được thu hồi'
        if (p.isVoice) return '🎤 Tin nhắn thoại'
        if (p.isImage) return p.caption ? `📷 ${p.caption}` : '📷 Hình ảnh'
        if (p.isVideo) return p.caption ? `🎥 ${p.caption}` : '🎥 Video'
        if (p.isAttachment) return `📎 ${p.fileName || 'Tệp đính kèm'}`
      } catch { }
    }
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
        showFloatingToast('Đã sao chép tin nhắn!')
      })
      .catch(() => { })
  }

  // 1. Thu hồi tin nhắn (Recall message) - Áp dụng cho tin nhắn của chính mình
  const handleRecallMessage = async (messageId) => {
    if (!messageId) return
    setActiveActionMsgId(null)

    // Cập nhật Optimistic tại local
    setMessages((prev) =>
      prev.map((m) =>
        Number(m.id) === Number(messageId)
          ? { ...m, content: '__REVOKED__' }
          : m
      )
    )
    showFloatingToast('Đã thu hồi tin nhắn')

    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: '__REVOKED__' })
        .eq('id', messageId)
      if (error) console.error('Recall message failed:', error)
    } catch (err) {
      console.error('Recall message error:', err)
    }
  }

  // 2. Xóa với mọi người (Delete for everyone) - Xóa hẳn bản ghi khỏi Supabase
  const handleDeleteForEveryone = async (messageId) => {
    if (!messageId) return
    setActiveActionMsgId(null)

    setMessages((prev) => prev.filter((m) => Number(m.id) !== Number(messageId)))
    showFloatingToast('Đã xóa tin nhắn với mọi người')

    try {
      const { error } = await supabase.from('messages').delete().eq('id', messageId)
      if (error) console.error('Delete for everyone failed:', error)
    } catch (err) {
      console.error('Delete for everyone error:', err)
    }
  }

  // 3. Xóa mình tôi (Delete for me only) - Ẩn tin nhắn ở máy người dùng
  const handleDeleteForMe = (messageId) => {
    if (!messageId) return
    setActiveActionMsgId(null)

    const strId = String(messageId)
    setHiddenMessageIds((prev) => {
      const updated = [...prev, strId]
      try {
        localStorage.setItem('cloudchat_hidden_msgs', JSON.stringify(updated.slice(-500)))
      } catch { }
      return updated
    })
    setMessages((prev) => prev.filter((m) => String(m.id) !== strId))
    showFloatingToast('Đã xoá tin nhắn ở phía tôi')
  }

  // Giữ lại alias handleDeleteMessage phòng trường hợp gọi ở nơi khác
  const handleDeleteMessage = handleDeleteForEveryone

  // Tải danh sách nhóm chat của người dùng (Supabase)
  const loadGroups = async () => {
    if (!currentUser?.id) return

    try {
      const { data: memberships, error: memErr } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', currentUser.id)

      if (memErr) throw memErr
      // Bỏ qua các lời mời đang chờ xác nhận
      const acceptedMemberships = (memberships || []).filter((m) => m.role !== 'pending')
      if (acceptedMemberships.length === 0) {
        setGroups([])
        return
      }

      const groupIds = acceptedMemberships.map((m) => m.group_id)

      const { data: groupList, error: grpErr } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false })

      if (grpErr) throw grpErr

      const { data: allMembers } = await supabase
        .from('group_members')
        .select('group_id, role')
        .in('group_id', groupIds)

      const countMap = new Map()
      for (const m of (allMembers || [])) {
        if (m.role !== 'pending') {
          countMap.set(m.group_id, (countMap.get(m.group_id) || 0) + 1)
        }
      }

      const { data: recentMsgs } = await supabase
        .from('messages')
        .select('group_id, content, created_at')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })

      const lastMsgMap = new Map()
      for (const m of (recentMsgs || [])) {
        if (!lastMsgMap.has(m.group_id)) {
          lastMsgMap.set(m.group_id, m)
        }
      }

      const formattedGroups = (groupList || []).map((g) => ({
        ...g,
        id: g.id,
        is_group: true,
        member_count: countMap.get(g.id) || 1,
        last_message: lastMsgMap.get(g.id)?.content || null,
        last_message_time: lastMsgMap.get(g.id)?.created_at || null,
      }))

      setGroups(formattedGroups)

      try {
        const cleanGroups = formattedGroups.slice(0, 50).map((g) => {
          let lm = g.last_message
          if (typeof lm === 'string' && lm.length > 200) lm = lm.slice(0, 200)
          return { ...g, last_message: lm }
        })
        if (currentUser?.id) {
          localStorage.setItem(`cloudchat_cached_groups_${currentUser.id}`, JSON.stringify(cleanGroups))
        }
        localStorage.removeItem('cloudchat_cached_groups')
      } catch { }

      setActiveChat((current) => {
        if (current && current.is_group) {
          const updated = formattedGroups.find((g) => String(g.id) === String(current.id))
          if (updated) return { ...current, ...updated }
        }
        return current
      })
    } catch (err) {
      console.error('Load groups error:', err)
    }
  }

  // Tải danh sách lời mời vào nhóm đang chờ xác nhận (Supabase)
  const loadGroupInvitations = async () => {
    if (!currentUser?.id) return
    try {
      const { data: rows, error } = await supabase
        .from('group_members')
        .select('group_id, joined_at')
        .eq('user_id', currentUser.id)
        .eq('role', 'pending')

      if (error) throw error
      if (!rows || rows.length === 0) {
        setGroupInvitations([])
        return
      }

      const groupIds = rows.map((r) => r.group_id)
      const { data: groupList } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)

      const groupMap = new Map((groupList || []).map((g) => [g.id, g]))
      const creatorIds = (groupList || []).map((g) => g.creator_id).filter(Boolean)
      const { data: creatorProfiles } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', creatorIds)

      const creatorMap = new Map((creatorProfiles || []).map((p) => [p.id, p]))

      const enriched = rows.map((r) => {
        const grp = groupMap.get(r.group_id) || {}
        const creator = creatorMap.get(grp.creator_id) || {}
        return {
          group_id: r.group_id,
          name: grp.name || 'Nhóm chat',
          avatar_url: grp.avatar_url || '',
          creator_name: creator.display_name || creator.username || 'Người dùng',
          created_at: r.joined_at || grp.created_at,
        }
      })
      setGroupInvitations(enriched)
    } catch (err) {
      console.error('Load group invitations error:', err)
    }
  }

  // Đồng ý chấp nhận lời mời vào nhóm
  const handleAcceptGroupInvitation = async (invitation) => {
    if (!currentUser?.id || !invitation) return
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: 'member', joined_at: new Date().toISOString() })
        .eq('group_id', invitation.group_id)
        .eq('user_id', currentUser.id)

      if (error) throw error

      await supabase.from('messages').insert({
        group_id: invitation.group_id,
        sender_id: currentUser.id,
        content: `👋 ${currentUser.display_name || currentUser.username} đã chấp nhận lời mời và tham gia nhóm!`,
        is_read: false,
      })

      showFloatingToast(`Đã tham gia nhóm "${invitation.name}"!`)
      await loadGroupInvitations()
      await loadGroups()

      const joinedGroup = {
        id: invitation.group_id,
        name: invitation.name,
        avatar_url: invitation.avatar_url,
        is_group: true,
      }
      setActiveChat(joinedGroup)
    } catch (err) {
      alert('Lỗi chấp nhận lời mời: ' + err.message)
    }
  }

  // Từ chối lời mời vào nhóm
  const handleDeclineGroupInvitation = async (invitation) => {
    if (!currentUser?.id || !invitation) return
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', invitation.group_id)
        .eq('user_id', currentUser.id)

      if (error) throw error

      showFloatingToast('Đã từ chối lời mời vào nhóm.')
      await loadGroupInvitations()
    } catch (err) {
      alert('Lỗi từ chối lời mời: ' + err.message)
    }
  }

  // Tải chi tiết nhóm (Supabase)
  const loadGroupDetail = async (groupId) => {
    if (!currentUser?.id || !groupId) return

    try {
      const { data: group, error: grpErr } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (grpErr) throw grpErr

      const { data: members, error: memErr } = await supabase
        .from('group_members')
        .select('user_id, role, joined_at')
        .eq('group_id', groupId)

      if (memErr) throw memErr

      const acceptedMembers = (members || []).filter((m) => m.role !== 'pending')
      const pendingMembers = (members || []).filter((m) => m.role === 'pending')

      const memberCount = acceptedMembers.length
      const myMembership = (members || []).find((m) => m.user_id === currentUser.id)
      const isCreator = myMembership?.role === 'creator' || group?.creator_id === currentUser.id

      const allUserIds = (members || []).map((m) => m.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .in('id', allUserIds)

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

      const formattedMembers = acceptedMembers.map((m) => {
        const p = profileMap.get(m.user_id) || {}
        return {
          id: m.user_id,
          username: p.username || 'User',
          display_name: p.display_name || p.username || 'Thành viên',
          avatar_url: p.avatar_url || '',
          bio: p.bio || '',
          role: m.role,
          joined_at: m.joined_at,
        }
      })
      // Quản trị viên và người tạo lên đầu
      formattedMembers.sort((a, b) => {
        if (a.role === 'creator' && b.role !== 'creator') return -1
        if (b.role === 'creator' && a.role !== 'creator') return 1
        if (a.role === 'admin' && b.role !== 'admin') return -1
        if (b.role === 'admin' && a.role !== 'admin') return 1
        return 0
      })

      const formattedPending = pendingMembers.map((m) => {
        const p = profileMap.get(m.user_id) || {}
        return {
          id: m.user_id,
          username: p.username || 'User',
          display_name: p.display_name || p.username || 'Thành viên',
          avatar_url: p.avatar_url || '',
          bio: p.bio || '',
          role: m.role,
          joined_at: m.joined_at,
        }
      })

      setGroupDetailData({
        ...group,
        is_group: true,
        member_count: memberCount,
        user_role: myMembership?.role || 'member',
        is_creator: isCreator,
        members_hidden: false,
        members: formattedMembers,
        pending_members: formattedPending,
      })
    } catch (err) {
      console.error('Load group detail error:', err)
    }
  }

  // Tạo nhóm chat mới (Supabase) - Khi thành lập nhóm mời thành viên thì VÀO THẲNG không cần xác nhận
  const handleCreateGroup = async (e) => {
    if (e) e.preventDefault()
    const name = groupNameInput.trim()
    if (!name) {
      setCreateGroupError('Vui lòng nhập tên nhóm')
      return
    }

    setCreateGroupLoading(true)
    setCreateGroupError('')

    try {
      const totalInitial = 1 + selectedGroupMemberIds.length
      const avatarUrl = groupAvatarInput.trim() || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`

      const { data: newGroup, error: grpErr } = await supabase
        .from('groups')
        .insert({
          name,
          avatar_url: avatarUrl,
          creator_id: currentUser.id,
          is_community: 0,
        })
        .select()
        .single()

      if (grpErr) throw grpErr

      // Người tạo nhóm nhận quyền 'creator', thành viên được chọn khi tạo nhóm có quyền 'member' NGAY không cần xác nhận
      const memberInserts = [
        {
          group_id: newGroup.id,
          user_id: currentUser.id,
          role: 'creator',
        },
        ...selectedGroupMemberIds.map((uid) => ({
          group_id: newGroup.id,
          user_id: uid,
          role: 'member',
        })),
      ]

      await supabase.from('group_members').insert(memberInserts)

      await supabase.from('messages').insert({
        group_id: newGroup.id,
        sender_id: currentUser.id,
        content: `🎉 Nhóm "${name}" đã được tạo. Chào mừng các thành viên!`,
        is_read: false,
      })

      showFloatingToast(`Đã tạo nhóm "${name}" thành công!`)
      setShowCreateGroupModal(false)
      setGroupNameInput('')
      setGroupAvatarInput('')
      setSelectedGroupMemberIds([])

      await loadGroups()

      const createdChatTarget = {
        ...newGroup,
        is_group: true,
        member_count: totalInitial,
      }
      setActiveChat(createdChatTarget)
    } catch (err) {
      setCreateGroupError('Lỗi tạo nhóm: ' + err.message)
    } finally {
      setCreateGroupLoading(false)
    }
  }

  // Thêm / Mời thành viên vào nhóm hiện tại (Supabase) - Phải chờ người ấy đồng ý chấp nhận vào (status: pending)
  const handleAddMembersToGroup = async () => {
    if (!activeChat || !activeChat.is_group) return
    if (addMemberSelectedIds.length === 0) {
      setAddMemberError('Vui lòng chọn ít nhất một người bạn')
      return
    }

    setAddMemberLoading(true)
    setAddMemberError('')

    try {
      const groupId = activeChat.id

      // Kiểm tra thành viên đã có hoặc đã nhận lời mời
      const { data: existingMembers } = await supabase.from('group_members').select('user_id').eq('group_id', groupId)
      const existingSet = new Set((existingMembers || []).map((m) => m.user_id))
      const toInsertIds = addMemberSelectedIds.filter((uid) => !existingSet.has(uid))

      if (toInsertIds.length === 0) {
        setAddMemberError('Tất cả những người bạn chọn đã có trong nhóm hoặc đã nhận lời mời.')
        return
      }

      // Mời vào nhóm với role: 'pending' (chờ chấp nhận)
      const inserts = toInsertIds.map((uid) => ({
        group_id: groupId,
        user_id: uid,
        role: 'pending',
      }))

      const { error } = await supabase.from('group_members').insert(inserts)
      if (error) throw error

      showFloatingToast('Đã gửi lời mời tham gia nhóm! Đang chờ bạn bè chấp nhận.')
      setShowAddGroupMemberModal(false)
      setAddMemberSelectedIds([])
      await loadGroupDetail(groupId)
    } catch (err) {
      setAddMemberError('Lỗi gửi lời mời: ' + err.message)
    } finally {
      setAddMemberLoading(false)
    }
  }

  // Thu hồi lời mời vào nhóm đã gửi (Quản trị viên / Nhóm trưởng)
  const handleRevokeGroupInvitation = async (pendingUser) => {
    if (!activeChat?.is_group || !pendingUser) return
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', activeChat.id)
        .eq('user_id', pendingUser.id)
        .eq('role', 'pending')
      if (error) throw error

      showFloatingToast(`Đã thu hồi lời mời của ${pendingUser.display_name || pendingUser.username}.`)
      await loadGroupDetail(activeChat.id)
    } catch (err) {
      alert('Lỗi thu hồi lời mời: ' + err.message)
    }
  }

  // Nhóm trưởng: Đổi tên nhóm
  const handleRenameGroup = async (e) => {
    if (e) e.preventDefault()
    const newName = renameGroupNameInput.trim()
    if (!newName) return
    if (!activeChat?.is_group || !groupDetailData?.is_creator) return

    setRenameGroupLoading(true)
    try {
      const { error } = await supabase
        .from('groups')
        .update({ name: newName })
        .eq('id', activeChat.id)

      if (error) throw error

      await supabase.from('messages').insert({
        group_id: activeChat.id,
        sender_id: currentUser.id,
        content: `✏️ Quản trị viên đã đổi tên nhóm thành "${newName}".`,
        is_read: false,
      })

      showFloatingToast(`Đã đổi tên nhóm thành "${newName}"!`)
      setActiveChat((prev) => (prev ? { ...prev, name: newName } : prev))
      setGroupDetailData((prev) => (prev ? { ...prev, name: newName } : prev))
      setShowRenameGroupModal(false)
      await loadGroups()
    } catch (err) {
      alert('Lỗi đổi tên nhóm: ' + err.message)
    } finally {
      setRenameGroupLoading(false)
    }
  }

  // Nhóm trưởng: Chọn tệp ảnh đại diện cho nhóm
  const handleGroupAvatarSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP,...)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước ảnh đại diện nhóm tối đa là 10MB!')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const res = ev.target?.result
      if (res) {
        setCropImageSource({
          dataUrl: res,
          fileName: file.name,
          fileSize: file.size,
          isGroupAvatar: true,
        })
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Nhóm trưởng: Cập nhật ảnh đại diện nhóm lên Supabase
  const handleUpdateGroupAvatar = async (avatarUrl) => {
    if (!activeChat?.is_group || !activeChat?.id) return
    const groupId = activeChat.id
    setGroupAvatarLoading(true)
    try {
      const { error } = await supabase
        .from('groups')
        .update({ avatar_url: avatarUrl })
        .eq('id', groupId)

      if (error) throw error

      await supabase.from('messages').insert({
        group_id: groupId,
        sender_id: currentUser.id,
        content: avatarUrl
          ? `🖼️ ${currentUser.display_name || currentUser.username} đã cập nhật ảnh đại diện của nhóm.`
          : `🗑️ ${currentUser.display_name || currentUser.username} đã gỡ ảnh đại diện của nhóm.`,
        is_read: false,
      })

      setActiveChat((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev))
      setGroupDetailData((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev))
      setGroups((prev) =>
        prev.map((g) => (String(g.id) === String(groupId) ? { ...g, avatar_url: avatarUrl } : g))
      )
      await loadGroups()
    } catch (err) {
      alert('Lỗi cập nhật ảnh đại diện nhóm: ' + err.message)
    } finally {
      setGroupAvatarLoading(false)
    }
  }

  // Nhóm trưởng: Giải tán nhóm
  const handleDisbandGroup = async () => {
    if (!activeChat?.is_group || !groupDetailData?.is_creator) return

    setDisbandGroupLoading(true)
    try {
      const groupId = activeChat.id

      await supabase.from('messages').delete().eq('group_id', groupId)
      await supabase.from('group_members').delete().eq('group_id', groupId)
      const { error } = await supabase.from('groups').delete().eq('id', groupId)
      if (error) throw error

      showFloatingToast('Đã giải tán nhóm thành công.')
      setShowDisbandConfirmModal(false)
      setShowChatInfo(false)
      setActiveChat(null)
      await loadGroups()
    } catch (err) {
      alert('Lỗi giải tán nhóm: ' + err.message)
    } finally {
      setDisbandGroupLoading(false)
    }
  }

  // Rời khỏi nhóm (Thành viên)
  const handleLeaveGroup = async () => {
    if (!activeChat?.is_group || !currentUser?.id) return
    const groupId = activeChat.id

    if (groupDetailData?.is_creator) {
      alert('Bạn là nhóm trưởng (người tạo nhóm). Vui lòng chọn "Giải tán nhóm" nếu muốn đóng nhóm.')
      return
    }

    setLeaveGroupLoading(true)
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', currentUser.id)

      if (error) throw error

      await supabase.from('messages').insert({
        group_id: groupId,
        sender_id: currentUser.id,
        content: `🚪 ${currentUser.display_name || currentUser.username} đã rời khỏi nhóm.`,
        is_read: false,
      })

      showFloatingToast('Bạn đã rời khỏi nhóm.')
      setShowLeaveGroupConfirmModal(false)
      setShowChatInfo(false)
      setActiveChat(null)
      await loadGroups()
    } catch (err) {
      alert('Lỗi rời nhóm: ' + err.message)
    } finally {
      setLeaveGroupLoading(false)
    }
  }

  // Nhóm trưởng: Loại thành viên (Kick)
  const handleKickMember = async (memberToKick) => {
    if (!activeChat?.is_group || !groupDetailData?.is_creator || !memberToKick) return
    if (memberToKick.id === currentUser.id) return

    try {
      const groupId = activeChat.id
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', memberToKick.id)

      if (error) throw error

      await supabase.from('messages').insert({
        group_id: groupId,
        sender_id: currentUser.id,
        content: `🚫 ${memberToKick.display_name || memberToKick.username} đã bị loại khỏi nhóm.`,
        is_read: false,
      })

      showFloatingToast(`Đã loại ${memberToKick.display_name || memberToKick.username} khỏi nhóm.`)
      setMemberToKickModal(null)
      await loadGroupDetail(groupId)
      await loadGroups()
    } catch (err) {
      alert('Lỗi loại thành viên: ' + err.message)
    }
  }

  // Nhóm trưởng: Bổ nhiệm hoặc hạ quyền Quản trị viên
  const handleToggleAdminRole = async (member) => {
    if (!activeChat?.is_group || !groupDetailData?.is_creator || !member) return
    if (member.id === currentUser.id) return

    const newRole = member.role === 'admin' ? 'member' : 'admin'
    try {
      const groupId = activeChat.id
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('group_id', groupId)
        .eq('user_id', member.id)

      if (error) throw error

      const msg = newRole === 'admin'
        ? `👑 ${member.display_name || member.username} đã được bổ nhiệm làm Quản trị viên.`
        : `👤 ${member.display_name || member.username} đã chuyển về làm Thành viên thông thường.`

      await supabase.from('messages').insert({
        group_id: groupId,
        sender_id: currentUser.id,
        content: msg,
        is_read: false,
      })

      showFloatingToast(newRole === 'admin' ? `Đã bổ nhiệm ${member.display_name || member.username} làm Quản trị viên!` : `Đã hạ quyền Quản trị viên của ${member.display_name || member.username}.`)
      await loadGroupDetail(groupId)
    } catch (err) {
      alert('Lỗi cập nhật vai trò: ' + err.message)
    }
  }

  const handleForwardMessage = async (targetFriendId, msg) => {
    if (!targetFriendId || !msg || !currentUser?.id) return

    setForwardSending((prev) => ({ ...prev, [targetFriendId]: true }))
    try {
      const isTargetGroup = groups.some((g) => String(g.id) === String(targetFriendId))
      const payload = {
        sender_id: currentUser.id,
        receiver_id: isTargetGroup ? null : targetFriendId,
        group_id: isTargetGroup ? targetFriendId : null,
        content: msg.content,
        reply_to_id: null,
        is_read: false,
      }

      const { data, error } = await supabase.from('messages').insert(payload).select().single()
      if (error) throw error

      setForwardSent((prev) => ({ ...prev, [targetFriendId]: true }))
      setForwardSuccessMessage('Đã chuyển tiếp tin nhắn thành công!')

      if (activeChat && String(activeChat.id) === String(targetFriendId) && data) {
        setMessages((prev) => [
          ...prev,
          {
            ...data,
            sender_username: currentUser.username,
            sender_name: currentUser.display_name || currentUser.username,
            sender_avatar: currentUser.avatar_url || '',
          },
        ])
      }
      loadFriends()
      loadGroups()
    } catch (err) {
      console.error('Forward failed:', err)
    } finally {
      setForwardSending((prev) => ({ ...prev, [targetFriendId]: false }))
    }
  }

  // Handle attachment click: Mở trực tiếp bộ chọn file / camera hệ thống (hoạt động 100% trên cả PC và Mobile)
  const handleAttachmentClick = () => {
    if (!activeChat?.is_group && !friends.some((f) => String(f.id) === String(activeChat?.id))) {
      showFloatingToast('Bạn cần kết bạn và được đối phương đồng ý trước khi gửi tệp tin!')
      return
    }
    fileInputRef.current?.click()
  }

  // Nhận file từ Camera, Photos, hoặc Tệp tin -> Đưa vào Preview Bar thay vì tự gửi
  const handleAttachmentFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > 8 * 1024 * 1024) {
      alert('Kích thước tệp tin tối đa là 8MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const isImg = file.type.startsWith('image/')
      const isVid = file.type.startsWith('video/')
      setPendingAttachment({
        file,
        url: reader.result,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        isImage: isImg,
        isVideo: isVid,
      })
    }
    reader.readAsDataURL(file)
  }

  // Handle clipboard paste (Ctrl + V): Đưa vào Preview Bar chứ KHÔNG tự gửi
  const handleInputPaste = async (e) => {
    const clipboardData = e.clipboardData
    if (!clipboardData || !activeChat || !currentUser?.id) return

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
      if (imageFile.size > 8 * 1024 * 1024) {
        alert('Kích thước ảnh tối đa là 8MB.')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setPendingAttachment({
          file: imageFile,
          url: reader.result,
          name: imageFile.name || `image_${Date.now()}.png`,
          size: imageFile.size,
          type: imageFile.type || 'image/png',
          isImage: true,
          isVideo: false,
        })
      }
      reader.readAsDataURL(imageFile)
    }
  }

  // Voice Note Recording handlers
  const handleStartVoiceRecord = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Trình duyệt của bạn không hỗ trợ ghi âm trực tiếp!')
      return
    }
    if (!activeChat?.is_group && !friends.some((f) => String(f.id) === String(activeChat?.id))) {
      showFloatingToast('Bạn cần kết bạn và được đối phương đồng ý trước khi gửi thoại!')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      voiceStreamRef.current = stream

      let recorder
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      } catch {
        recorder = new MediaRecorder(stream)
      }

      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.start(200)
      setIsRecordingVoice(true)
      setIsVoicePaused(false)
      setVoiceDuration(0)
      setVoiceDurationMs(0)
      voiceStartTimeRef.current = Date.now()
      voicePausedDurationRef.current = 0

      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current)
      voiceTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - voiceStartTimeRef.current - voicePausedDurationRef.current
        setVoiceDurationMs(elapsed)
        setVoiceDuration(Math.round(elapsed / 1000))
      }, 30)
    } catch (err) {
      console.error('Microphone access error:', err)
      alert('Không thể truy cập Microphone. Vui lòng cấp quyền micro trong cài đặt trình duyệt!')
    }
  }

  const handleTogglePauseVoice = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    if (isVoicePaused) {
      try {
        if (recorder.state === 'paused') recorder.resume()
      } catch (e) {
        console.error('Recorder resume failed', e)
      }
      voicePausedDurationRef.current += Date.now() - voicePauseTimeRef.current
      setIsVoicePaused(false)
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current)
      voiceTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - voiceStartTimeRef.current - voicePausedDurationRef.current
        setVoiceDurationMs(elapsed)
        setVoiceDuration(Math.round(elapsed / 1000))
      }, 30)
    } else {
      try {
        if (recorder.state === 'recording') recorder.pause()
      } catch (e) {
        console.error('Recorder pause failed', e)
      }
      voicePauseTimeRef.current = Date.now()
      setIsVoicePaused(true)
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current)
    }
  }

  const handleCancelVoiceRecord = () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { }
    }
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    setIsRecordingVoice(false)
    setIsVoicePaused(false)
    setVoiceDuration(0)
    setVoiceDurationMs(0)
    audioChunksRef.current = []
  }

  const handleStopAndSendVoice = () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current)
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      setIsRecordingVoice(false)
      setIsVoicePaused(false)
      return
    }

    recorder.onstop = () => {
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      audioChunksRef.current = []
      setIsRecordingVoice(false)
      setIsVoicePaused(false)

      const durationToSend = Math.max(1, Math.round(voiceDurationMs / 1000)) || 1
      setVoiceDuration(0)
      setVoiceDurationMs(0)

      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Audio = reader.result
        const content = JSON.stringify({
          isVoice: true,
          audioData: base64Audio,
          duration: durationToSend,
        })
        sendVoicePayload(content)
      }
      reader.readAsDataURL(audioBlob)
    }

    try { recorder.stop() } catch { }
  }

  const formatVoiceCentiseconds = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const centiseconds = Math.floor((ms % 1000) / 10)
    return `${minutes}:${String(seconds).padStart(2, '0')},${String(centiseconds).padStart(2, '0')}`
  }

  const sendVoicePayload = async (content) => {
    const replyId = replyingMessage?.id || null
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const now = new Date().toISOString()

    const optimisticMsg = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: activeChat.is_group ? null : activeChat.id,
      group_id: activeChat.is_group ? activeChat.id : null,
      content,
      created_at: now,
      sender_username: currentUser.username,
      sender_name: currentUser.display_name || currentUser.username,
      sender_avatar: currentUser.avatar_url || '',
      is_optimistic: true,
      reply_to_id: replyId ? Number(replyId) : null,
    }

    userSentMessageRef.current = true
    setMessages((current) => [...current, optimisticMsg])
    setReplyingMessage(null)

    try {
      const payload = {
        sender_id: currentUser.id,
        receiver_id: activeChat.is_group ? null : activeChat.id,
        group_id: activeChat.is_group ? activeChat.id : null,
        content,
        reply_to_id: replyId ? Number(replyId) : null,
        is_read: false,
      }

      const { data, error } = await supabase.from('messages').insert(payload).select().single()
      if (error) throw error

      if (data) {
        setMessages((current) =>
          current.map((m) =>
            m.id === tempId
              ? {
                ...data,
                sender_username: currentUser.username,
                sender_name: currentUser.display_name || currentUser.username,
                sender_avatar: currentUser.avatar_url || '',
              }
              : m
          )
        )
        loadFriends()
        loadGroups()
      }
    } catch (err) {
      console.error('Send voice message error:', err)
      setMessages((current) => current.filter((m) => m.id !== tempId))
      showFloatingToast('Không thể gửi tin nhắn thoại')
    }
  }

  // Render message content with highlights, clickable links and file cards
  const renderMessageContent = (content, highlightQuery) => {
    if (!content) return null

    const trimmed = content.trim()

    // 0. Tin nhắn đã thu hồi
    if (trimmed === '__REVOKED__' || trimmed === '[Tin nhắn đã được thu hồi]') {
      return (
        <div className="tg-msg-revoked-bubble">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
          <span>Tin nhắn đã được thu hồi</span>
        </div>
      )
    }

    // 1. JSON-encoded: Thoại, Ảnh có caption, Video có caption, Tin nhắn thu hồi
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const p = JSON.parse(trimmed)
        if (p.isRevoked) {
          return (
            <div className="tg-msg-revoked-bubble">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
              </svg>
              <span>Tin nhắn đã được thu hồi</span>
            </div>
          )
        }
        if (p.isVoice) {
          return <VoicePlayer audioUrl={p.audioData} duration={p.duration} />
        }
        if (p.isImage) {
          if (!p.url) {
            return (
              <div className="tg-msg-image-wrap tg-msg-image-skeleton">
                <span className="tg-skeleton-icon">🖼️</span>
                <span>Không có ảnh</span>
              </div>
            )
          }
          return (
            <div className="tg-msg-image-wrap">
              <ChatImage
                src={p.url}
                alt="Ảnh gửi"
                className="tg-msg-image"
                onClick={() => setPreviewMediaUrl(p.url)}
              />
              {p.caption && (
                <div className="tg-msg-caption">
                  {renderHighlightedText(p.caption, highlightQuery)}
                </div>
              )}
            </div>
          )
        }
        if (p.isVideo) {
          return (
            <div className="tg-msg-video-wrap">
              <video
                controls
                src={p.url}
                style={{ maxWidth: '100%', borderRadius: 12, display: 'block' }}
              />
              {p.caption && (
                <div className="tg-msg-caption">
                  {renderHighlightedText(p.caption, highlightQuery)}
                </div>
              )}
            </div>
          )
        }
      } catch { }
    }

    // 2. Check if attachment (file, document, word, etc.)
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

    // 3. Standalone image URL
    const isStandaloneImageUrl =
      (trimmed.startsWith('data:image/') && !trimmed.includes('...')) ||
      /^https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s]*)?$/i.test(trimmed)

    if (isStandaloneImageUrl) {
      return (
        <ChatImage
          src={trimmed}
          alt="Hình ảnh"
          className="tg-msg-image"
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

    if (trimmed.includes('base64,...')) {
      return (
        <div className="tg-msg-image-skeleton">
          <span className="tg-skeleton-icon">🖼️</span>
          <span>Đang tải hình ảnh...</span>
        </div>
      )
    }

    // 4. Standalone video URL
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

    // 5. Normal text message
    return renderHighlightedText(content, highlightQuery)
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
    if (!currentUser?.id) return

    try {
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status, created_at')
        .eq('status', 'accepted')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)

      if (error) throw error

      if (!rows || rows.length === 0) {
        setFriends([])
        return
      }

      const otherUserIds = rows.map((r) => (r.user_id === currentUser.id ? r.friend_id : r.user_id))

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url, is_online, last_seen')
        .in('id', otherUserIds)

      if (profErr) throw profErr

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

      // Lấy tin nhắn mới nhất giữa currentUser và các bạn bè
      const { data: recentMsgs } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, is_read')
        .is('group_id', null)
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.in.(${otherUserIds.join(',')})),and(receiver_id.eq.${currentUser.id},sender_id.in.(${otherUserIds.join(',')}))`)
        .order('created_at', { ascending: false })
        .limit(100)

      const lastMsgMap = new Map()
      for (const m of (recentMsgs || [])) {
        const partnerId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id
        if (!lastMsgMap.has(partnerId)) {
          lastMsgMap.set(partnerId, m)
        }
      }

      const nextFriends = rows.map((r) => {
        const friendId = r.user_id === currentUser.id ? r.friend_id : r.user_id
        const p = profileMap.get(friendId) || { id: friendId, username: 'User', display_name: 'Người dùng', avatar_url: '' }
        const lastMsg = lastMsgMap.get(friendId)
        return {
          id: friendId,
          username: p.username,
          display_name: p.display_name || p.username,
          bio: p.bio || '',
          avatar_url: p.avatar_url || '',
          is_online: Boolean(p.is_online),
          last_seen: p.last_seen,
          friendship_id: r.id,
          created_at: r.created_at,
          last_message: lastMsg?.content || null,
          last_message_time: lastMsg?.created_at || null,
          last_message_sender_id: lastMsg?.sender_id || null,
          last_message_is_read: lastMsg ? (lastMsg.is_read ? 1 : 0) : 1,
          is_group: false,
        }
      })

      nextFriends.sort((a, b) => {
        const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : new Date(a.created_at).getTime()
        const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : new Date(b.created_at).getTime()
        return timeB - timeA
      })

      setFriends(nextFriends)

      try {
        const cleanFriends = nextFriends.slice(0, 50).map((f) => {
          let lm = f.last_message
          if (typeof lm === 'string' && lm.length > 200) lm = lm.slice(0, 200)
          return { ...f, last_message: lm }
        })
        if (currentUser?.id) {
          localStorage.setItem(`cloudchat_cached_friends_${currentUser.id}`, JSON.stringify(cleanFriends))
        }
        localStorage.removeItem('cloudchat_cached_friends')
      } catch { }

      setActiveChat((current) => {
        if (current && !current.is_group) {
          const updated = nextFriends.find((friend) => friend.id === current.id)
          if (updated) return { ...current, ...updated }
        }
        return current
      })
    } catch (error) {
      console.error('Load friends error:', error)
    }
  }

  const loadMessages = async (chatId, silent = false) => {
    if (!chatId || !currentUser?.id) return

    // 1. Nếu là CloudChat Bot: Trả về ngay tin nhắn hệ thống, không query Supabase
    if (chatId === CLOUDCHAT_BOT_ID) {
      setMessages(cloudChatBotMessages)
      setChatLoading(false)
      return
    }

    // 2. High-speed Multi-Chat Cache (RAM + IndexedDB)
    const clearKey = `cloudchat_cleared_at_${currentUser?.id}_${chatId}`
    const clearedAtStr = localStorage.getItem(clearKey)
    const clearedAtTime = clearedAtStr ? new Date(clearedAtStr).getTime() : 0
    let hasLoadedCache = false

    // Check RAM cache first (instant 0ms)
    const memCached = getMemoryCachedMessages(chatId)
    if (memCached && memCached.length > 0) {
      const cleaned = memCached.filter((m) => {
        if (hiddenMessageIds.includes(String(m.id))) return false
        if (clearedAtTime && new Date(m.created_at).getTime() <= clearedAtTime) return false
        return true
      })
      if (activeChatRef.current?.id === chatId) {
        setMessages(cleaned)
        setChatLoading(false)
        hasLoadedCache = true
      }
    }

    // Check persistent IndexedDB if not in RAM
    if (!hasLoadedCache && !silent) {
      getMessagesFromDb(chatId).then((dbMsgs) => {
        if (dbMsgs && dbMsgs.length > 0 && activeChatRef.current?.id === chatId) {
          const cleaned = dbMsgs.filter((m) => {
            if (hiddenMessageIds.includes(String(m.id))) return false
            if (clearedAtTime && new Date(m.created_at).getTime() <= clearedAtTime) return false
            return true
          })
          setMessages(cleaned)
          setChatLoading(false)
        }
      })
    }

    if (!silent && !hasLoadedCache) {
      setChatLoading(true)
    }

    try {
      const isGroup = activeChatRef.current?.is_group || false

      let query = supabase
        .from('messages')
        .select('id, sender_id, receiver_id, group_id, content, reply_to_id, is_read, created_at')

      if (isGroup) {
        query = query.eq('group_id', chatId)
      } else {
        query = query
          .is('group_id', null)
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${currentUser.id})`)
      }

      const { data: rawMessages, error } = await query.order('created_at', { ascending: true })

      if (error) throw error

      // Nếu trong lúc tải mạng người dùng đã chuyển sang chat khác -> BỎ QUA NGAY
      if (activeChatRef.current?.id !== chatId) return

      const msgList = rawMessages || []

      // Lấy profile người gửi
      const senderIds = [...new Set(msgList.map((m) => m.sender_id))]
      let profileMap = new Map()
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', senderIds)
        profileMap = new Map((profiles || []).map((p) => [p.id, p]))
      }

      // Kiểm tra lại sau khi fetch profile
      if (activeChatRef.current?.id !== chatId) return

      const msgIdMap = new Map(msgList.map((m) => [m.id, m]))

      const enriched = msgList.map((m) => {
        const p = profileMap.get(m.sender_id) || {}
        const replied = m.reply_to_id ? msgIdMap.get(m.reply_to_id) : null
        const repliedSender = replied ? profileMap.get(replied.sender_id) : null

        return {
          ...m,
          sender_username: p.username || 'User',
          sender_name: p.display_name || p.username || 'User',
          sender_avatar: p.avatar_url || '',
          reply_content: replied?.content || null,
          reply_sender_id: replied?.sender_id || null,
          reply_sender_name: repliedSender?.display_name || repliedSender?.username || null,
          reply_sender_username: repliedSender?.username || null,
        }
      })

      const filteredMsgs = enriched.filter((m) => {
        if (hiddenMessageIds.includes(String(m.id))) return false
        if (clearedAtTime && new Date(m.created_at).getTime() <= clearedAtTime) return false
        return true
      })

      if (activeChatRef.current?.id !== chatId) return

      setMessages((prev) => {
        if (activeChatRef.current?.id !== chatId) return prev
        const hasChange =
          prev.length !== filteredMsgs.length ||
          prev.some((m, idx) => m.is_read !== filteredMsgs[idx]?.is_read || m.id !== filteredMsgs[idx]?.id || m.content !== filteredMsgs[idx]?.content)
        if (!hasChange) return prev
        return filteredMsgs
      })

      // 🚀 Caching Technology (Telegram / WhatsApp standard):
      // 1. Preload and register images in browser memory so switching is instantaneous
      filteredMsgs.forEach((m) => {
        if (typeof m.content === 'string') {
          if (m.content.startsWith('{')) {
            try {
              const parsed = JSON.parse(m.content)
              if (parsed.isImage && parsed.url) preloadImage(parsed.url)
            } catch { }
          } else if (m.content.startsWith('http') || m.content.startsWith('data:image/')) {
            preloadImage(m.content)
          }
        }
      })

      // 2. Save full messages into RAM cache and IndexedDB (never strip images!)
      setMemoryCachedMessages(chatId, filteredMsgs)
      saveMessagesToDb(chatId, filteredMsgs)

      // Đánh dấu đã đọc các tin nhắn nhận được
      if (!isGroup) {
        const unreadIds = msgList.filter((m) => m.sender_id === chatId && !m.is_read).map((m) => m.id)
        if (unreadIds.length > 0) {
          supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then(() => { })
        }
      }
    } catch (error) {
      if (!silent) {
        console.error('Load messages error:', error)
        if (activeChatRef.current?.id === chatId) {
          setMessages([])
        }
      }
    } finally {
      if (!silent && activeChatRef.current?.id === chatId) {
        setChatLoading(false)
      }
    }
  }

  // Friend Requests & Friendship Actions (100% Supabase BaaS)
  const loadFriendRequests = async () => {
    if (!currentUser?.id) return
    try {
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status, created_at')
        .eq('status', 'pending')
        .eq('friend_id', currentUser.id)

      if (error) throw error
      if (!rows || rows.length === 0) {
        setFriendRequests([])
        return
      }

      const senderIds = rows.map((r) => r.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .in('id', senderIds)

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]))
      const enriched = rows.map((r) => {
        const p = profileMap.get(r.user_id) || {}
        return {
          id: r.id,
          user_id: r.user_id,
          friend_id: r.friend_id,
          username: p.username || 'User',
          display_name: p.display_name || p.username || 'Người dùng',
          avatar_url: p.avatar_url || '',
          bio: p.bio || '',
          created_at: r.created_at,
        }
      })
      setFriendRequests(enriched)
    } catch (e) {
      console.error('Load friend requests failed:', e)
    }
  }

  const loadSentFriendRequests = async () => {
    if (!currentUser?.id) return
    try {
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status, created_at')
        .eq('status', 'pending')
        .eq('user_id', currentUser.id)

      if (error) throw error
      if (!rows || rows.length === 0) {
        setSentFriendRequests([])
        return
      }

      const receiverIds = rows.map((r) => r.friend_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .in('id', receiverIds)

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]))
      const enriched = rows.map((r) => {
        const p = profileMap.get(r.friend_id) || {}
        return {
          id: r.id,
          user_id: r.user_id,
          friend_id: r.friend_id,
          username: p.username || 'User',
          display_name: p.display_name || p.username || 'Người dùng',
          avatar_url: p.avatar_url || '',
          bio: p.bio || '',
          created_at: r.created_at,
        }
      })
      setSentFriendRequests(enriched)
    } catch (e) {
      console.error('Load sent friend requests failed:', e)
    }
  }

  const handleAcceptFriendRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)

      if (error) throw error
      showFloatingToast('Đã chấp nhận lời mời kết bạn!')
      await loadFriends()
      await loadFriendRequests()
    } catch (err) {
      console.error('Accept friend error:', err)
      showFloatingToast('Không thể chấp nhận lời mời: ' + err.message)
    }
  }

  const handleRejectFriendRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) throw error
      showFloatingToast('Đã từ chối lời mời kết bạn')
      await loadFriendRequests()
    } catch (err) {
      console.error('Reject friend error:', err)
      showFloatingToast('Không thể từ chối lời mời: ' + err.message)
    }
  }

  const handleCancelFriendRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) throw error
      showFloatingToast('Đã thu hồi lời mời kết bạn')
      await loadSentFriendRequests()
    } catch (err) {
      console.error('Cancel request error:', err)
      showFloatingToast('Không thể thu hồi lời mời: ' + err.message)
    }
  }

  const handleSearchFriend = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const query = (searchFriendInput || '').trim().toLowerCase()
    if (!query) return
    setSearchFriendLoading(true)
    setSearchFriendError('')
    setSearchFriendSuccess('')
    setSearchFriendResult(null)

    // 1. Kiểm tra nếu tìm kiếm chính tài khoản của mình
    const myUsername = (currentUser?.username || '').toLowerCase()
    const myDisplayName = (currentUser?.display_name || '').toLowerCase()
    const myEmail = (currentUser?.email || '').toLowerCase()

    if (
      (myUsername && query === myUsername) ||
      (myEmail && query === myEmail) ||
      (myDisplayName && query === myDisplayName) ||
      (myUsername && query.length >= 4 && myUsername.startsWith(query))
    ) {
      setSearchFriendError('💡 Đây là tài khoản của chính bạn! Hãy nhập tên hoặc email của bạn bè để kết nối.')
      setSearchFriendLoading(false)
      return
    }

    const sanitized = query.replace(/[,()]/g, '')
    if (!sanitized) {
      setSearchFriendError('Vui lòng nhập tên hoặc email hợp lệ để tìm kiếm')
      setSearchFriendLoading(false)
      return
    }

    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .neq('id', currentUser?.id)
        .or(`username.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`)
        .limit(1)

      if (error) throw error
      if (!users || users.length === 0) {
        setSearchFriendError('Không tìm thấy người dùng phù hợp. Hãy chắc chắn bạn bè đã đăng ký tài khoản trên hệ thống!')
      } else {
        setSearchFriendResult(users[0])
      }
    } catch (err) {
      setSearchFriendError('Lỗi tìm kiếm: ' + err.message)
    } finally {
      setSearchFriendLoading(false)
    }
  }

  const handleSendFriendRequest = async (targetId) => {
    if (!currentUser?.id || !targetId) return
    setSearchFriendLoading(true)
    setSearchFriendError('')
    setSearchFriendSuccess('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUid = session?.user?.id || currentUser.id

      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${currentUid},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${currentUid})`)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'accepted') {
          setSearchFriendError('Hai bạn đã là bạn bè của nhau rồi!')
          showFloatingToast('Hai bạn đã là bạn bè của nhau rồi!')
        } else {
          setSearchFriendError('Đã có lời mời kết bạn đang chờ phản hồi!')
          showFloatingToast('Đã có lời mời kết bạn đang chờ phản hồi!')
        }
        return
      }

      const { error } = await supabase.from('friendships').insert({
        user_id: currentUid,
        friend_id: targetId,
        status: 'pending',
      })
      if (error) {
        console.error('Supabase friendship insert error:', error)
        if (error.message && error.message.includes('row-level security policy')) {
          setSearchFriendError('Lỗi RLS Supabase: Vui lòng chạy file fix_friendships_rls.sql trong Supabase SQL Editor để cấp quyền!')
          showFloatingToast('Lỗi RLS: Hãy chạy file fix_friendships_rls.sql')
        } else {
          setSearchFriendError('Không thể gửi lời mời: ' + error.message)
          showFloatingToast('Không thể gửi lời mời: ' + error.message)
        }
        return
      }

      setSearchFriendSuccess('Đã gửi lời mời kết bạn thành công! ✨')
      showFloatingToast('Đã gửi lời mời kết bạn!')
      loadSentFriendRequests()
    } catch (err) {
      setSearchFriendError('Không thể gửi lời mời: ' + err.message)
      showFloatingToast('Không thể gửi lời mời: ' + err.message)
    } finally {
      setSearchFriendLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (currentUser?.id) {
        await supabase
          .from('profiles')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('id', currentUser.id)
      }
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('SignOut error:', e)
    }
    try {
      localStorage.removeItem('cloudchat_token')
      localStorage.removeItem('cloudchat_current_user')
      localStorage.removeItem('cloudchat_cached_friends')
      localStorage.removeItem('cloudchat_cached_groups')
      if (currentUser?.id) {
        localStorage.removeItem(`cloudchat_cached_friends_${currentUser.id}`)
        localStorage.removeItem(`cloudchat_cached_groups_${currentUser.id}`)
      }
    } catch { }
    setCurrentUser(null)
    setFriends([])
    setGroups([])
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

  const handleSecurityChangePassword = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setSecurityError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setSecurityError('Mật khẩu xác nhận không khớp')
      return
    }

    setSecurityLoading(true)
    setSecurityError('')
    setSecuritySuccess('')
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error

      setSecuritySuccess('Đổi mật khẩu thành công!')
      showFloatingToast('Đã đổi mật khẩu thành công!')
      setNewPassword('')
      setConfirmNewPassword('')
      setCurrentPassword('')
    } catch (err) {
      setSecurityError('Đổi mật khẩu thất bại: ' + err.message)
    } finally {
      setSecurityLoading(false)
    }
  }

  // Modals & QR Safe Handlers
  const handleOpenAddFriendModal = () => {
    setShowAddFriendModal(true)
    setSearchFriendResult(null)
    setSearchFriendError('')
    setSearchFriendSuccess('')
    setSearchFriendInput('')
    if (currentUser?.id) {
      const email = (currentUser.email || currentUser.username || '').toLowerCase()
      const displayName = currentUser.display_name || (email ? email.split('@')[0] : 'User')
      supabase.from('profiles').upsert({
        id: currentUser.id,
        username: email,
        display_name: displayName,
        avatar_url: currentUser.avatar_url || getDefaultAvatar(displayName),
        bio: currentUser.bio || '',
        is_online: true,
        last_seen: new Date().toISOString()
      }, { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('Sync profile error:', error.message)
      })
    }
  }
  const handleCloseAddFriendModal = () => {
    setShowAddFriendModal(false)
    setSearchFriendResult(null)
    setSearchFriendError('')
    setSearchFriendSuccess('')
  }
  const handleOpenMyQrModal = () => { setShowMyQrModal(true) }
  const handleCloseMyQrModal = () => { setShowMyQrModal(false) }
  const handleGenerateMyQr = async () => { }
  const handleRevokeMyQr = async () => { }
  const handleDownloadQrCard = () => { }
  const handleCopyQrCode = () => { }
  const handleStartQrCamera = () => { }
  const handleStopQrCamera = () => { }
  const handleScanQrFromFile = () => { }
  const handleResolveQrCode = () => { }
  const handleAddFriendViaQr = () => { }

  // Kiểm tra session Supabase Auth & Đăng ký listener
  useEffect(() => {
    // 1. Kiểm tra nếu trên URL có chứa lỗi OAuth trả về từ Google / Supabase
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    if (hash.includes('error=') || search.includes('error=')) {
      const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : search)
      const errDesc = params.get('error_description') || params.get('error')
      if (errDesc) {
        console.error('OAuth error from URL:', errDesc)
        setError('Lỗi xác thực Google: ' + decodeURIComponent(errDesc.replace(/\+/g, ' ')))
      }
    }

    const resolveUserProfile = async (user) => {
      if (!user) return null
      const rawEmail = (user.email || '').toLowerCase()
      const rawUser = rawEmail || user.user_metadata?.username || user.id
      const rawName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || (rawEmail ? rawEmail.split('@')[0] : 'User')
      const rawAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || getDefaultAvatar(rawName || rawEmail)

      let profile = null
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        profile = data
      } catch (err) {
        console.warn('Failed to fetch profile:', err)
      }

      if (!profile) {
        const newProfile = {
          id: user.id,
          username: rawUser,
          display_name: rawName,
          avatar_url: rawAvatar,
          bio: '',
          is_online: true,
          last_seen: new Date().toISOString(),
        }
        try {
          const { data: createdProfile } = await supabase
            .from('profiles')
            .upsert(newProfile)
            .select()
            .maybeSingle()
          profile = createdProfile || newProfile
        } catch (err) {
          console.warn('Failed to upsert profile, using fallback:', err)
          profile = newProfile
        }
      } else {
        try {
          await supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', user.id)
        } catch {
          // ignore error
        }
      }

      const provider = user.app_metadata?.provider || (user.identities && user.identities[0]?.provider)
      const isOAuth = Boolean(
        (provider && provider !== 'email') ||
        (user.identities && user.identities.some((i) => i.provider !== 'email'))
      )

      const base = profile || {
        id: user.id,
        username: rawUser,
        display_name: rawName,
        avatar_url: rawAvatar,
        bio: '',
        is_online: true,
      }

      return {
        ...base,
        email: rawEmail || base.email,
        is_oauth: isOAuth,
        provider: provider || 'email',
        app_metadata: user.app_metadata,
      }
    }

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session?.user) {
          if (error) console.error('getSession error:', error)
          setCurrentUser(null)
          try {
            localStorage.removeItem('cloudchat_current_user')
            localStorage.removeItem('cloudchat_cached_friends')
            localStorage.removeItem('cloudchat_cached_groups')
          } catch { }
          setActiveChat(null)
          setFriends([])
          setGroups([])
          setMessages([])
          setPage('login')
          return
        }

        const userProfile = await resolveUserProfile(session.user)
        if (userProfile) {
          setCurrentUser((prev) => {
            if (prev && prev.id !== userProfile.id) {
              setActiveChat(null)
              setFriends([])
              setGroups([])
              setMessages([])
            }
            return userProfile
          })
          try {
            localStorage.setItem('cloudchat_current_user', JSON.stringify(userProfile))
          } catch { }
          setPage('chat')
        } else {
          setPage('login')
        }
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname)
        }
      } catch (err) {
        console.error('Session init error:', err)
        setCurrentUser(null)
        setActiveChat(null)
        setFriends([])
        setGroups([])
        setMessages([])
        setPage('login')
      } finally {
        setLoading(false)
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase Auth Event:', event, session?.user?.email)

      if (event === 'SIGNED_OUT' || !session?.user) {
        setCurrentUser(null)
        try {
          localStorage.removeItem('cloudchat_current_user')
          localStorage.removeItem('cloudchat_cached_friends')
          localStorage.removeItem('cloudchat_cached_groups')
        } catch { }
        setActiveChat(null)
        setFriends([])
        setGroups([])
        setMessages([])
        setPage('login')
        setLoading(false)
        return
      }

      if (session?.user) {
        try {
          const userProfile = await resolveUserProfile(session.user)
          if (userProfile) {
            setCurrentUser((prev) => {
              if (prev && prev.id !== userProfile.id) {
                setActiveChat(null)
                setFriends([])
                setGroups([])
                setMessages([])
              }
              return userProfile
            })
            try {
              localStorage.setItem('cloudchat_current_user', JSON.stringify(userProfile))
            } catch { }
            setPage('chat')
          }
        } catch (err) {
          console.error('resolveUserProfile on auth state change error:', err)
        } finally {
          setLoading(false)
        }
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Supabase Realtime WebSocket Subscription (Tin nhắn & Bạn bè)
  useEffect(() => {
    if (!currentUser?.id) return

    loadFriends()
    loadGroups()
    loadFriendRequests()
    loadSentFriendRequests()
    loadGroupInvitations()

    const messageChannel = supabase
      .channel('cloudchat-messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMsg = payload.new
          const currentActive = activeChatRef.current

          const isForActiveChat = currentActive && (
            (currentActive.is_group && Number(newMsg.group_id) === Number(currentActive.id)) ||
            (!currentActive.is_group && !newMsg.group_id && (
              (newMsg.sender_id === currentActive.id && newMsg.receiver_id === currentUser.id) ||
              (newMsg.sender_id === currentUser.id && newMsg.receiver_id === currentActive.id)
            ))
          )

          let senderInfo = {
            username: currentUser.username,
            display_name: currentUser.display_name,
            avatar_url: currentUser.avatar_url,
          }
          if (newMsg.sender_id !== currentUser.id) {
            const { data: p } = await supabase
              .from('profiles')
              .select('username, display_name, avatar_url')
              .eq('id', newMsg.sender_id)
              .maybeSingle()
            if (p) senderInfo = p
          }

          const enrichedMsg = {
            ...newMsg,
            sender_username: senderInfo.username,
            sender_name: senderInfo.display_name || senderInfo.username,
            sender_avatar: senderInfo.avatar_url || '',
          }

          if (typeof enrichedMsg.content === 'string') {
            if (enrichedMsg.content.startsWith('{')) {
              try {
                const parsed = JSON.parse(enrichedMsg.content)
                if (parsed.isImage && parsed.url) preloadImage(parsed.url)
              } catch { }
            } else if (enrichedMsg.content.startsWith('http') || enrichedMsg.content.startsWith('data:image/')) {
              preloadImage(enrichedMsg.content)
            }
          }

          if (isForActiveChat) {
            setMessages((prev) => {
              const filtered = prev.filter((m) => !m.is_optimistic || m.content !== newMsg.content)
              if (filtered.some((m) => Number(m.id) === Number(newMsg.id))) return filtered
              const updated = [...filtered, enrichedMsg]
              if (currentActive?.id) {
                setMemoryCachedMessages(currentActive.id, updated)
                saveMessagesToDb(currentActive.id, updated)
              }
              return updated
            })

            if (newMsg.receiver_id === currentUser.id && !newMsg.is_read) {
              supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then(() => { })
            }
          } else {
            const chatTargetId = newMsg.group_id || (newMsg.sender_id === currentUser.id ? newMsg.receiver_id : newMsg.sender_id)
            if (chatTargetId) {
              const cached = getMemoryCachedMessages(chatTargetId)
              if (cached && Array.isArray(cached)) {
                const filtered = cached.filter((m) => !m.is_optimistic || m.content !== newMsg.content)
                if (!filtered.some((m) => Number(m.id) === Number(newMsg.id))) {
                  const updated = [...filtered, enrichedMsg]
                  setMemoryCachedMessages(chatTargetId, updated)
                  saveMessagesToDb(chatTargetId, updated)
                }
              }
            }
          }

          loadFriends()
          loadGroups()
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const deletedId = payload.old?.id
          if (deletedId) {
            setMessages((prev) => prev.filter((m) => Number(m.id) !== Number(deletedId)))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMsg = payload.new
          if (updatedMsg?.id) {
            setMessages((prev) =>
              prev.map((m) =>
                Number(m.id) === Number(updatedMsg.id)
                  ? { ...m, ...updatedMsg }
                  : m
              )
            )
          }
        }
      )
      .subscribe()

    const friendshipChannel = supabase
      .channel('cloudchat-friendships-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          loadFriends()
          loadFriendRequests()
          loadSentFriendRequests()
        }
      )
      .subscribe()

    const groupMemberChannel = supabase
      .channel('cloudchat-groupmembers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members' },
        () => {
          loadGroups()
          loadGroupInvitations()
          if (activeChatRef.current?.is_group) {
            loadGroupDetail(activeChatRef.current.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(friendshipChannel)
      supabase.removeChannel(groupMemberChannel)
    }
  }, [currentUser?.id])

  useEffect(() => {
    if (!activeChat?.id) {
      setMessages([])
      setGroupDetailData(null)
      prevChatIdRef.current = null
      return
    }

    if (prevChatIdRef.current !== activeChat.id) {
      prevChatIdRef.current = activeChat.id
      isJustSwitchedChatRef.current = true
    }

    setVisibleCount(20) // Reset về 20 tin nhắn mỗi khi đổi chat

    // ⚡ 0ms Multi-Chat Switch (Telegram standard):
    const cached = getMemoryCachedMessages(activeChat.id)
    if (cached && cached.length > 0) {
      setMessages(cached)
      setChatLoading(false)
      loadMessages(activeChat.id, true) // Silent background check for updates
    } else {
      loadMessages(activeChat.id, false)
    }
    if (activeChat.is_group) {
      loadGroupDetail(activeChat.id)
    }

    const interval = setInterval(() => {
      if (activeChat?.id && activeChat.id !== CLOUDCHAT_BOT_ID) {
        loadMessages(activeChat.id, true)
        if (activeChat.is_group) {
          loadGroupDetail(activeChat.id)
        }
      }
    }, 30000)

    const handleFocus = () => {
      if (activeChat?.id && activeChat.id !== CLOUDCHAT_BOT_ID) {
        loadMessages(activeChat.id, true)
        if (activeChat.is_group) {
          loadGroupDetail(activeChat.id)
        }
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [activeChat?.id])

  useLayoutEffect(() => {
    if (!activeChat?.id || messages.length === 0) return

    const container = messagesContainerRef.current
    if (!container) return

    // 1. Khi vừa bấm chuyển sang đoạn chat: Đứng yên ngay tại tin nhắn hiện tại (dưới đáy), không chạy animation từ trên xuống
    if (isJustSwitchedChatRef.current) {
      isJustSwitchedChatRef.current = false
      container.scrollTop = container.scrollHeight
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight
      })
      return
    }

    // 2. Khi chính bạn vừa gửi tin nhắn: Cuộn mượt nhẹ nhàng xuống tin nhắn vừa gửi
    if (userSentMessageRef.current) {
      userSentMessageRef.current = false
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    // 3. Khi đang ở gần đáy (trong vòng 150px) và có tin nhắn mới tới: Tự động ghim đáy tức thì
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, activeChat?.id])

  // Gửi tin nhắn tối ưu: 0ms delay (Optimistic UI update)
  const handleSend = async () => {
    const text = message.trim()
    if ((!text && !pendingAttachment) || !activeChat || !currentUser?.id) return

    // Xử lý nội dung nếu có pendingAttachment
    let finalContent = text
    if (pendingAttachment) {
      if (pendingAttachment.isImage) {
        finalContent = JSON.stringify({
          isImage: true,
          url: pendingAttachment.url,
          caption: text,
        })
      } else if (pendingAttachment.isVideo) {
        finalContent = JSON.stringify({
          isVideo: true,
          url: pendingAttachment.url,
          caption: text,
          fileName: pendingAttachment.name,
        })
      } else {
        finalContent = JSON.stringify({
          isAttachment: true,
          fileName: pendingAttachment.name,
          fileSize: pendingAttachment.size,
          fileType: pendingAttachment.type,
          data: pendingAttachment.url,
          caption: text,
        })
      }
    }

    const replyId = replyingMessage?.id || null
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const now = new Date().toISOString()

    // ⚡ OPTIMISTIC UPDATE: Đưa ngay lập tức vào state messages không chờ backend
    const optimisticMsg = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: activeChat.is_group ? null : activeChat.id,
      group_id: activeChat.is_group ? activeChat.id : null,
      content: finalContent,
      created_at: now,
      sender_username: currentUser.username,
      sender_name: currentUser.display_name || currentUser.username,
      sender_avatar: currentUser.avatar_url || '',
      is_optimistic: true,
      reply_to_id: replyId,
    }

    userSentMessageRef.current = true
    if (pendingAttachment?.isImage && pendingAttachment?.url) {
      preloadImage(pendingAttachment.url)
    }
    setMessages((current) => {
      const updated = [...current, optimisticMsg]
      setMemoryCachedMessages(activeChat.id, updated)
      return updated
    })
    setMessage('')
    setPendingAttachment(null)
    setReplyingMessage(null)
    msgInputRef.current?.focus()

    try {
      const payload = {
        sender_id: currentUser.id,
        receiver_id: activeChat.is_group ? null : activeChat.id,
        group_id: activeChat.is_group ? activeChat.id : null,
        content: finalContent,
        reply_to_id: replyId ? Number(replyId) : null,
        is_read: false,
      }

      const { data: inserted, error } = await supabase
        .from('messages')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      setMessages((current) => {
        const updated = current.map((m) =>
          m.id === tempId
            ? {
              ...m,
              id: inserted.id,
              is_optimistic: false,
              created_at: inserted.created_at,
            }
            : m
        )
        setMemoryCachedMessages(activeChat.id, updated)
        saveMessagesToDb(activeChat.id, updated)
        return updated
      })

      loadFriends()
      loadGroups()
    } catch (err) {
      console.error('Send message failed:', err)
      setMessages((current) => {
        const reverted = current.filter((m) => m.id !== tempId)
        setMemoryCachedMessages(activeChat.id, reverted)
        return reverted
      })
      showFloatingToast('Không thể gửi tin nhắn. Vui lòng thử lại!')
    }
  }

  // Đăng nhập qua Supabase Auth
  const handleLogin = async (event) => {
    event.preventDefault()

    const cleanUser = (loginEmail || username).trim()
    if (!cleanUser || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu')
      return
    }

    setLoading(true)
    setError('')
    setAuthSuccess('')

    try {
      const email = cleanUser.includes('@')
        ? cleanUser
        : `${cleanUser.toLowerCase().replace(/[^a-z0-9_]/g, '')}@cloudchat.top`

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message?.includes('Email not confirmed')) {
          setError('Tài khoản chưa xác nhận email. Hãy tắt "Confirm email" trong Supabase Auth!')
        } else if (error.message?.includes('Invalid login credentials')) {
          setError('Email hoặc mật khẩu không chính xác')
        } else {
          setError(error.message || 'Đăng nhập thất bại')
        }
        return
      }

      if (data?.user) {
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!profile) {
          const rawUser = data.user.user_metadata?.username || cleanUser
          const rawName = data.user.user_metadata?.display_name || rawUser
          const { data: newProfile } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              username: rawUser,
              display_name: rawName,
              avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(rawUser)}`,
              bio: '',
              is_online: true,
              last_seen: new Date().toISOString(),
            })
            .select()
            .single()
          profile = newProfile
        }

        setCurrentUser(profile)
        try {
          localStorage.setItem('cloudchat_current_user', JSON.stringify(profile))
        } catch { }
        setPage('chat')
      }
    } catch (err) {
      setError('Lỗi kết nối Supabase: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Đăng nhập Google qua Supabase OAuth
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
    } catch (err) {
      setError('Lỗi đăng nhập Google: ' + err.message)
      setLoading(false)
    }
  }

  // Đăng ký qua Supabase Auth
  const handleRegister = async (event) => {
    event.preventDefault()

    const email = (registerEmail || username).trim().toLowerCase()
    const displayName = registerDisplayName.trim() || (email ? email.split('@')[0] : 'User')

    if (!email || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Địa chỉ email không đúng định dạng (VD: example@gmail.com)')
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
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', email)
        .maybeSingle()

      if (existingUser) {
        setError('Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: email,
            display_name: displayName,
          },
        },
      })

      if (error) {
        if (error.message?.includes('already registered')) {
          setError('Email này đã được đăng ký tài khoản. Vui lòng đăng nhập.')
        } else {
          setError(error.message || 'Đăng ký thất bại')
        }
        return
      }

      if (data?.user) {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: email,
            display_name: displayName,
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
            bio: '',
            is_online: true,
            last_seen: new Date().toISOString(),
          })
          .catch(() => { })
      }

      setUsername(email)
      setLoginEmail(email)
      setRegisterEmail('')
      setPassword('')
      setConfirmPassword('')
      setRegisterDisplayName('')

      if (data?.session) {
        setCurrentUser({
          id: data.user.id,
          username: email,
          display_name: displayName,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        })
        setPage('chat')
      } else {
        setPage('login')
        setAuthSuccess('Đăng ký tài khoản thành công! Vui lòng đăng nhập.')
      }
    } catch (err) {
      setError('Lỗi kết nối Supabase: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Apply Theme Mode (Sáng / Tối / Hệ Thống)
  useEffect(() => {
    const updateTheme = () => {
      let active = themeMode
      if (themeMode === 'system') {
        const isLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
        active = isLight ? 'light' : 'dark'
      }
      document.documentElement.setAttribute('data-theme', active)
      document.body.setAttribute('data-theme', active)
    }

    updateTheme()
    try {
      localStorage.setItem('cloudchat_theme', themeMode)
    } catch { }

    if (themeMode === 'system' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: light)')
      const handler = () => updateTheme()
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [themeMode])

  const handleThemeChange = (mode) => {
    setThemeMode(mode)
  }



  if (page === 'loading') {
    return (
      <div className="fpt-auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--tg-bg, #0f172a)' }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div className="cloudchat-brand-icon" style={{ margin: '0 auto 16px auto', display: 'flex', justifyContent: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="ccGradLoading" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="10" fill="url(#ccGradLoading)" />
              <path d="M19.5 21.5C21.9853 21.5 24 19.4853 24 17C24 14.6548 22.2039 12.7291 19.9079 12.5226C19.4674 9.94823 17.2273 8 14.5 8C11.6669 8 9.34969 10.1065 9.04167 12.836C6.75704 13.203 5 15.1952 5 17.5C5 20.0274 7.04263 22.074 9.57 22.074H19.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '15px', fontWeight: 500, letterSpacing: '0.3px' }}>Đang khởi tạo CloudChat...</div>
        </div>
      </div>
    )
  }

  if (page === 'login') {
    return (
      <div className="fpt-auth-page">
        {/* CỘT TRÁI: SHOWCASE ĐIỆN THOẠI & THƯƠNG HIỆU CLOUDCHAT */}
        <div className="fpt-showcase-col">
          {/* Logo Thương hiệu CloudChat */}
          <div className="fpt-brand-header">
            <div className="fpt-logo-group">
              <div className="cloudchat-brand-icon">
                <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
                  <defs>
                    <linearGradient id="ccGradL" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <path d="M9.5 21a6.5 6.5 0 0 1-.5-13 8 8 0 0 1 15 2.5 5.5 5.5 0 0 1 1 10.5H9.5z" fill="url(#ccGradL)" />
                  <circle cx="12" cy="15" r="1.5" fill="#ffffff" />
                  <circle cx="16" cy="15" r="1.5" fill="#ffffff" />
                  <circle cx="20" cy="15" r="1.5" fill="#ffffff" />
                </svg>
              </div>
              <span className="fpt-brand-name">CloudChat</span>
              <span className="cloudchat-pro-badge">CLOUD</span>
            </div>
          </div>

          {/* Slogan */}
          <div className="fpt-slogan-wrap">
            <h1 className="fpt-main-heading">
              {authT.sloganMain}
            </h1>
            <p className="fpt-sub-heading">
              {authT.sloganSub}
            </p>
          </div>

          {/* Mockup iPhone & Các huy hiệu bay xung quanh */}
          <div className="fpt-mockup-area">
            {/* Đốm sáng tím mờ phía sau */}
            <div className="fpt-mockup-glow" />

            {/* Vòng elip quỹ đạo nét đứt & mũi tên 3D */}
            <div className="fpt-orbit-ring">
              <div className="fpt-orbit-pointer">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 22L12 18L22 22L12 2Z" fill="url(#orbitArrowGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                  <defs>
                    <linearGradient id="orbitArrowGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#38bdf8" />
                      <stop offset="0.5" stopColor="#6366f1" />
                      <stop offset="1" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Huy hiệu bảo mật xanh lá (🛡) */}
            <div className="fpt-float-badge badge-shield">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
            </div>

            {/* Huy hiệu gọi điện cam (📞) */}
            <div className="fpt-float-badge badge-phone">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>

            {/* Huy hiệu tin nhắn xanh cyan (💬) */}
            <div className="fpt-float-badge badge-chat">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>

            {/* Thiết bị iPhone hiển thị màn hình Chats */}
            <div className="fpt-phone-device">
              {/* Dynamic Island */}
              <div className="fpt-phone-island" />

              {/* Status bar */}
              <div className="fpt-phone-status-bar">
                <span>9:41</span>
                <div className="fpt-phone-status-icons">
                  <span style={{ fontSize: 11 }}>●●●●</span>
                  <span style={{ fontSize: 11 }}>📶</span>
                  <span style={{ fontSize: 11 }}>🔋</span>
                </div>
              </div>

              {/* App Header */}
              <div className="fpt-phone-app-header">
                <div className="fpt-phone-avatar-circle">
                  <img src="https://cdn.auth0.com/avatars/cc.png" alt="Avatar" />
                  <span className="online-dot" />
                </div>
                <div className="fpt-phone-app-title">CloudChat</div>
                <div className="fpt-phone-edit-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </div>
              </div>

              {/* Search box */}
              <div className="fpt-phone-search-box">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span>{authT.mockSearch}</span>
              </div>

              {/* Filter tabs */}
              <div className="fpt-phone-tabs">
                <span className="phone-tab active">{authT.mockTabAll}</span>
                <span className="phone-tab">{authT.mockTabGroup}</span>
                <span className="phone-tab">{authT.mockTabDirect}</span>
                <span className="phone-tab">{authT.mockTabUnread}</span>
                <span className="phone-tab">{authT.mockTabMention}</span>
              </div>

              {/* Danh sách tin nhắn mẫu trong điện thoại */}
              <div className="fpt-phone-chat-list">
                <div className="fpt-mock-chat-item">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="" className="mock-chat-avatar" />
                  <div className="mock-chat-details">
                    <div className="mock-chat-row">
                      <span className="mock-chat-name">Lê Nguyễn Quỳnh Chi</span>
                      <span className="mock-chat-time">vài giây</span>
                    </div>
                    <div className="mock-chat-sub">{authT.mockMsg1}</div>
                  </div>
                </div>

                <div className="fpt-mock-chat-item">
                  <img src="https://play-lh.googleusercontent.com/KB2nVpIl14Wcg4rLapktzKqr-O6TzyYItFivTcE-vsH_0o-ACpn2VrNWpILBnsKyZNeovTJ29aicwvcDm3nd" alt="" className="mock-chat-avatar" />
                  <div className="mock-chat-details">
                    <div className="mock-chat-row">
                      <span className="mock-chat-name">Nguyễn Trung Đạt</span>
                      <span className="mock-chat-time">2 phút</span>
                    </div>
                    <div className="mock-chat-row-sub">
                      <span className="mock-chat-typing">{authT.mockTyping}</span>
                      <span className="mock-chat-badge">99+</span>
                    </div>
                  </div>
                </div>

                <div className="fpt-mock-chat-item">
                  <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_FdV46NrjhSMaAZy7FkNGMhMhf1ZJ2Xtb2vcWu5s_Y0cv526mULCuA7Cp&s=10" alt="" className="mock-chat-avatar" />
                  <div className="mock-chat-details">
                    <div className="mock-chat-row">
                      <span className="mock-chat-name">Phạm Văn Hùng</span>
                      <span className="mock-chat-time">30 phút</span>
                    </div>
                    <div className="mock-chat-sub">🌄 {authT.mockMsg3}</div>
                  </div>
                </div>

                <div className="fpt-mock-chat-item">
                  <div className="mock-chat-avatar group-avatar">CC</div>
                  <div className="mock-chat-details">
                    <div className="mock-chat-row">
                      <span className="mock-chat-name">CloudChat Global</span>
                      <span className="mock-chat-time">2 ngày</span>
                    </div>
                    <div className="mock-chat-row-sub">
                      <span className="mock-chat-typing">{authT.mockMsg2}</span>
                      <span className="mock-chat-badge">12</span>
                    </div>
                  </div>
                </div>

                <div className="fpt-mock-chat-item">
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80" alt="" className="mock-chat-avatar" />
                  <div className="mock-chat-details">
                    <div className="mock-chat-row">
                      <span className="mock-chat-name">Vũ Thị Hương</span>
                      <span className="mock-chat-time">5 ngày</span>
                    </div>
                    <div className="mock-chat-row-sub">
                      <span className="mock-chat-sub">{authT.mockMsg1}</span>
                      <span className="mock-chat-badge">2</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: TRẮNG TINH KHÔI VỚI FORM ĐĂNG NHẬP EMAIL + PASSWORD + GOOGLE */}
        <div className="fpt-auth-col">
          {/* Nút chọn ngôn ngữ góc trên phải */}
          <div className="fpt-top-bar">
            <div className="fpt-lang-selector">
              <button
                type="button"
                className={`fpt-lang-btn ${loginLang === 'en' ? 'active' : ''}`}
                onClick={() => handleSetLang('en')}
              >
                Tiếng Anh
              </button>
              <span className="fpt-lang-sep">|</span>
              <button
                type="button"
                className={`fpt-lang-btn ${loginLang === 'vi' ? 'active' : ''}`}
                onClick={() => handleSetLang('vi')}
              >
                Tiếng Việt
              </button>
            </div>
          </div>

          {/* Vùng trung tâm: Form đăng nhập trực tiếp */}
          <div className="fpt-auth-center">
            <div className="fpt-form-card">
              <h2 className="fpt-form-title">
                {authT.loginTitle}
              </h2>
              <p className="fpt-form-desc">{authT.loginSubtitle}</p>

              <form onSubmit={handleLogin} className="fpt-login-form">
                {/* Honeypot field - ẩn hoàn toàn để phát hiện bot tự động điền form */}
                <input
                  type="text"
                  name="user_organization_hp"
                  value={honeypotVal}
                  onChange={(e) => setHoneypotVal(e.target.value)}
                  style={{ display: 'none', opacity: 0, position: 'absolute', left: '-9999px', height: 0, width: 0 }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                {/* Math challenge nếu thử đăng nhập sai >= 2 lần */}
                {authAttempts >= 2 && mathChallenge.q && (
                  <div className="fpt-input-group" style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '12px', borderRadius: 10, border: '1px solid rgba(99, 102, 241, 0.25)', marginBottom: 12 }}>
                    <label className="fpt-input-label" style={{ color: '#818cf8', fontWeight: 600 }}>
                      🛡️ Xác minh chống bot: {mathChallenge.q} = ?
                    </label>
                    <input
                      type="number"
                      placeholder="Nhập kết quả số..."
                      value={userMathAnswer}
                      onChange={(e) => setUserMathAnswer(e.target.value)}
                      className="fpt-text-input"
                      required
                      style={{ marginTop: 6 }}
                    />
                  </div>
                )}

                <div className="fpt-input-group">
                  <label className="fpt-input-label">{authT.emailLabel}</label>
                  <input
                    type="email"
                    placeholder={authT.emailPlaceholder}
                    value={loginEmail || username}
                    onChange={(e) => {
                      setLoginEmail(e.target.value)
                      setUsername(e.target.value)
                    }}
                    className="fpt-text-input"
                    required
                    autoFocus
                  />
                </div>

                <div className="fpt-input-group">
                  <label className="fpt-input-label">{authT.passwordLabel}</label>
                  <div className="fpt-pwd-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={authT.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="fpt-text-input"
                      required
                    />
                    <button
                      type="button"
                      className="fpt-pwd-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? authT.hidePwd : authT.showPwd}
                    </button>
                  </div>
                </div>

                {error && <div className="fpt-alert error">{error}</div>}
                {authSuccess && <div className="fpt-alert success">{authSuccess}</div>}

                <button type="submit" className="fpt-submit-primary" disabled={loading}>
                  {loading ? authT.signingInBtn : authT.signInBtn}
                </button>

                <div className="fpt-or-divider">
                  <span>{authT.orDivider}</span>
                </div>

                <button
                  type="button"
                  className="fpt-google-btn"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="auth-google-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{authT.googleBtn}</span>
                </button>

                <div className="fpt-register-switch">
                  <span>{authT.noAccount} </span>
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
                    {authT.signUpNow}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (page === 'register') {
    return (
      <div className="fpt-auth-page">
        {/* Cột trái showcase tương tự */}
        <div className="fpt-showcase-col">
          <div className="fpt-brand-header">
            <div className="fpt-logo-group">
              <div className="cloudchat-brand-icon">
                <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
                  <defs>
                    <linearGradient id="ccGradR" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <path d="M9.5 21a6.5 6.5 0 0 1-.5-13 8 8 0 0 1 15 2.5 5.5 5.5 0 0 1 1 10.5H9.5z" fill="url(#ccGradR)" />
                  <circle cx="12" cy="15" r="1.5" fill="#ffffff" />
                  <circle cx="16" cy="15" r="1.5" fill="#ffffff" />
                  <circle cx="20" cy="15" r="1.5" fill="#ffffff" />
                </svg>
              </div>
              <span className="fpt-brand-name">CloudChat</span>
              <span className="cloudchat-pro-badge">CLOUD</span>
            </div>
          </div>

          <div className="fpt-slogan-wrap">
            <h1 className="fpt-main-heading">
              {authT.registerSloganMain}
            </h1>
            <p className="fpt-sub-heading">
              {authT.registerSloganSub}
            </p>
          </div>

          {/* Mockup iPhone & Các huy hiệu bay xung quanh */}
          <div className="fpt-mockup-area">
            {/* Đốm sáng tím mờ phía sau */}
            <div className="fpt-mockup-glow" />

            {/* Vòng elip quỹ đạo nét đứt & mũi tên 3D */}
            <div className="fpt-orbit-ring">
              <div className="fpt-orbit-pointer">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 22L12 18L22 22L12 2Z" fill="url(#orbitArrowGradR)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                  <defs>
                    <linearGradient id="orbitArrowGradR" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#38bdf8" />
                      <stop offset="0.5" stopColor="#6366f1" />
                      <stop offset="1" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Huy hiệu bảo mật xanh lá (🛡) */}
            <div className="fpt-float-badge badge-shield">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
            </div>

            {/* Huy hiệu gọi điện cam (📞) */}
            <div className="fpt-float-badge badge-phone">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>

            {/* Huy hiệu tin nhắn xanh cyan (💬) */}
            <div className="fpt-float-badge badge-chat">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>

            {/* Thiết bị iPhone hiển thị màn hình Chats */}
            <div className="fpt-phone-device">
              {/* Dynamic Island */}
              <div className="fpt-phone-island" />

              {/* Status bar */}
              <div className="fpt-phone-status-bar">
                <span>9:41</span>
                <div className="fpt-phone-status-icons">
                  <span style={{ fontSize: 11 }}>●●●●</span>
                  <span style={{ fontSize: 11 }}>📶</span>
                  <span style={{ fontSize: 11 }}>🔋</span>
                </div>
              </div>

              {/* App Header */}
              <div className="fpt-phone-app-header">
                <div className="fpt-phone-avatar-circle">
                  <img src="https://cdn.auth0.com/avatars/cc.png" alt="Avatar" />
                  <span className="online-dot" />
                </div>
                <div className="fpt-phone-app-title">CloudChat</div>
                <div className="fpt-phone-edit-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </div>
              </div>

              {/* Search box */}
              <div className="fpt-phone-search-box">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span>{authT.mockSearch}</span>
              </div>

              {/* Filter tabs */}
              <div className="fpt-phone-tabs">
                <span className="phone-tab active">{authT.mockTabAll}</span>
                <span className="phone-tab">{authT.mockTabGroup}</span>
                <span className="phone-tab">{authT.mockTabDirect}</span>
                <span className="phone-tab">{authT.mockTabUnread}</span>
                <span className="phone-tab">{authT.mockTabMention}</span>
              </div>

              {/* Danh sách tin nhắn mẫu trong điện thoại */}
              <div className="fpt-phone-chat-list">
                <div className="fpt-mock-chat-item">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="" className="mock-chat-avatar" />
                  <div className="mock-chat-details">
                    <div className="mock-chat-row">
                      <span className="mock-chat-name">Lê Nguyễn Quỳnh Chi</span>
                      <span className="mock-chat-time">08:30</span>
                    </div>
                    <div className="mock-chat-sub">{authT.mockMsg1}</div>
                  </div>
                </div>

                <div className="fpt-mock-chat-item">
                  <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80" alt="" className="mock-chat-avatar" />
                  <div className="mock-chat-details">
                    <div className="mock-chat-row">
                      <span className="mock-chat-name">Bùi Thuý Trinh ⚡</span>
                      <span className="mock-chat-time">08:06</span>
                    </div>
                    <div className="mock-chat-row-sub">
                      <span className="mock-chat-typing">{authT.mockTyping}</span>
                      <span className="mock-chat-badge">90</span>
                    </div>
                  </div>
                </div>

                <div className="fpt-mock-chat-item">
                  <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80" alt="" className="mock-chat-avatar" />
                  <div className="mock-chat-details">
                    <div className="mock-chat-row">
                      <span className="mock-chat-name">Trịnh Hoài Ngọc 🔒</span>
                      <span className="mock-chat-time">08:30</span>
                    </div>
                    <div className="mock-chat-sub">🌄 {authT.mockMsg3}</div>
                  </div>
                </div>

                <div className="fpt-mock-chat-item">
                  <div className="mock-chat-avatar group-avatar">CC</div>
                  <div className="mock-chat-details">
                    <div className="mock-chat-row">
                      <span className="mock-chat-name">CloudChat Global 📣</span>
                      <span className="mock-chat-time">08:06</span>
                    </div>
                    <div className="mock-chat-row-sub">
                      <span className="mock-chat-typing">{authT.mockMsg2}</span>
                      <span className="mock-chat-badge">12</span>
                    </div>
                  </div>
                </div>

                <div className="fpt-mock-chat-item">
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80" alt="" className="mock-chat-avatar" />
                  <div className="mock-chat-details">
                    <div className="mock-chat-row">
                      <span className="mock-chat-name">Vũ Thị Hương</span>
                      <span className="mock-chat-time">08:06</span>
                    </div>
                    <div className="mock-chat-row-sub">
                      <span className="mock-chat-sub">{authT.mockMsg1}</span>
                      <span className="mock-chat-badge">2</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải Form đăng ký */}
        <div className="fpt-auth-col">
          <div className="fpt-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="fpt-back-to-qr-btn"
              onClick={() => {
                setError('')
                setAuthSuccess('')
                setPassword('')
                setConfirmPassword('')
                setPage('login')
              }}
              style={{ margin: 0 }}
            >
              {authT.backToLogin}
            </button>

            <div className="fpt-lang-selector">
              <button
                type="button"
                className={`fpt-lang-btn ${loginLang === 'en' ? 'active' : ''}`}
                onClick={() => handleSetLang('en')}
              >
                Tiếng Anh
              </button>
              <span className="fpt-lang-sep">|</span>
              <button
                type="button"
                className={`fpt-lang-btn ${loginLang === 'vi' ? 'active' : ''}`}
                onClick={() => handleSetLang('vi')}
              >
                Tiếng Việt
              </button>
            </div>
          </div>

          <div className="fpt-auth-center">
            <div className="fpt-form-card">
              <h2 className="fpt-form-title">{authT.registerTitle}</h2>
              <p className="fpt-form-desc">{authT.registerSubtitle}</p>

              <form onSubmit={handleRegister} className="fpt-login-form">
                {/* Honeypot field - ẩn hoàn toàn để phát hiện bot tự động điền form */}
                <input
                  type="text"
                  name="user_organization_hp"
                  value={honeypotVal}
                  onChange={(e) => setHoneypotVal(e.target.value)}
                  style={{ display: 'none', opacity: 0, position: 'absolute', left: '-9999px', height: 0, width: 0 }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                {/* Math challenge nếu thử thao tác quá nhiều lần */}
                {authAttempts >= 2 && mathChallenge.q && (
                  <div className="fpt-input-group" style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '12px', borderRadius: 10, border: '1px solid rgba(99, 102, 241, 0.25)', marginBottom: 12 }}>
                    <label className="fpt-input-label" style={{ color: '#818cf8', fontWeight: 600 }}>
                      🛡️ Xác minh chống bot: {mathChallenge.q} = ?
                    </label>
                    <input
                      type="number"
                      placeholder="Nhập kết quả số..."
                      value={userMathAnswer}
                      onChange={(e) => setUserMathAnswer(e.target.value)}
                      className="fpt-text-input"
                      required
                      style={{ marginTop: 6 }}
                    />
                  </div>
                )}

                <div className="fpt-input-group">
                  <label className="fpt-input-label">{authT.displayNameLabel}</label>
                  <input
                    type="text"
                    placeholder={authT.displayNamePlaceholder}
                    value={registerDisplayName}
                    onChange={(e) => setRegisterDisplayName(e.target.value)}
                    className="fpt-text-input"
                    required
                  />
                </div>

                <div className="fpt-input-group">
                  <label className="fpt-input-label">{authT.registerEmailLabel}</label>
                  <input
                    type="email"
                    placeholder={authT.emailPlaceholder}
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="fpt-text-input"
                    required
                  />
                </div>

                <div className="fpt-input-group">
                  <label className="fpt-input-label">{authT.passwordLabel}</label>
                  <input
                    type="password"
                    placeholder={authT.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="fpt-text-input"
                    required
                  />
                </div>

                <div className="fpt-input-group">
                  <label className="fpt-input-label">{authT.confirmPasswordLabel}</label>
                  <input
                    type="password"
                    placeholder={authT.confirmPasswordPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="fpt-text-input"
                    required
                  />
                </div>

                {error && <div className="fpt-alert error">{error}</div>}
                {authSuccess && <div className="fpt-alert success">{authSuccess}</div>}

                <button type="submit" className="fpt-submit-primary" disabled={loading}>
                  {loading ? authT.registeringBtn : authT.registerBtn}
                </button>

                <div className="fpt-register-switch">
                  <span>{authT.hasAccount} </span>
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setAuthSuccess('')
                      setPassword('')
                      setConfirmPassword('')
                      setPage('login')
                    }}
                  >
                    {authT.signInBtn}
                  </button>
                </div>
              </form>
            </div>
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
                  title="Thông tin tài khoản"
                >
                  <div className="tg-avatar sm tg-menu-avatar-wrap">
                    <img
                      src={currentUser?.avatar_url || getDefaultAvatar(currentUser?.display_name || currentUser?.username)}
                      alt=""
                      className="avatar-img"
                      onError={(e) => {
                        e.currentTarget.src = getDefaultAvatar(currentUser?.display_name || currentUser?.username)
                      }}
                    />
                  </div>
                  <div className="tg-menu-user-info">
                    <strong>{currentUser?.display_name || currentUser?.username || 'Người dùng'}</strong>
                    <span>{currentUser?.email || currentUser?.username || 'user'}</span>
                  </div>
                </div>

                {/* 👁️‍🗨️ Đoạn chat đã ẩn */}
                {hiddenCount > 0 && (
                  <button
                    className={`tg-menu-item ${showHiddenSection ? 'active' : ''}`}
                    onClick={() => {
                      setShowMenu(false)
                      setShowHiddenSection((prev) => !prev)
                    }}
                  >
                    <span className="tg-menu-icon">
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    </span>
                    <span>{showHiddenSection ? 'Xem chat thông thường' : 'Đoạn chat đã ẩn'}</span>
                    <span className="tg-menu-badge" style={{ background: '#3b82f6', color: '#fff', fontSize: 10 }}>{hiddenCount}</span>
                  </button>
                )}

                {/* 🔒 Bảo mật: Chỉ hiển thị cho tài khoản đăng ký Email/Mật khẩu (Ẩn nếu đăng nhập bằng OAuth/Google) */}
                {!isOAuthUser && (
                  <button
                    className="tg-menu-item"
                    onClick={() => {
                      setShowMenu(false)
                      setNewPassword('')
                      setConfirmNewPassword('')
                      setSecurityError('')
                      setSecuritySuccess('')
                      setShowSecurityModal(true)
                    }}
                  >
                    <span className="tg-menu-icon">
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <span>Bảo mật</span>
                  </button>
                )}


                {/* ⚙ Cài đặt */}
                <button
                  className="tg-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    setShowSettingsModal(true)
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
          <div className="tg-search-bar" style={{ flex: 1 }}>
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
          </div>

          {/* Nút bên phải thanh search: Khi đang search thì thay bằng dấu X (xóa tìm kiếm), khi bình thường hiện icon Thêm bạn bè */}
          {search ? (
            <button
              type="button"
              className="tg-add-friend-header-btn"
              onClick={() => setSearch('')}
              title="Xóa tìm kiếm"
              aria-label="Xóa tìm kiếm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className="tg-add-friend-header-btn"
              onClick={() => handleOpenAddFriendModal()}
              title="Thêm bạn bè mới"
              aria-label="Thêm bạn bè mới"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Global Search Results OR Telegram Folders & Chat List */}
        {search.trim() ? (
          <>
            {/* Thanh Tab phân loại tìm kiếm: Tất cả, Mọi người, Tin nhắn */}
            <div
              className="tg-search-category-bar"
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY
                }
              }}
            >
              <button
                type="button"
                className={`tg-search-pill-category ${searchCategoryTab === 'all' ? 'active' : ''}`}
                onClick={() => setSearchCategoryTab('all')}
              >
                Tất cả <span>({searchUsersResults.length + searchGroupsResults.length + globalSearchResults.length})</span>
              </button>
              <button
                type="button"
                className={`tg-search-pill-category ${searchCategoryTab === 'users' ? 'active' : ''}`}
                onClick={() => setSearchCategoryTab('users')}
              >
                Mọi người & Nhóm <span>({searchUsersResults.length + searchGroupsResults.length})</span>
              </button>
              <button
                type="button"
                className={`tg-search-pill-category ${searchCategoryTab === 'messages' ? 'active' : ''}`}
                onClick={() => setSearchCategoryTab('messages')}
              >
                Tin nhắn <span>({globalSearchResults.length})</span>
              </button>
            </div>

            {/* Gợi ý từ khóa liên quan đến đoạn chat */}
            {searchSuggestions.length > 0 && (
              <div className="tg-search-suggestions-box">
                <div className="tg-search-suggestions-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>Gợi ý tìm kiếm liên quan:</span>
                </div>
                <div className="tg-search-suggestions-chips">
                  {searchSuggestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      className="tg-search-chip"
                      onClick={() => setSearch(sug)}
                      title={`Tìm kiếm: "${sug}"`}
                    >
                      <span className="tg-search-chip-icon">🔍</span>
                      <span className="tg-search-chip-text">{sug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="tg-chat-list">
              {searchLoading ? (
                <div className="tg-empty-list">
                  <div className="tg-spinner" style={{ margin: '20px auto' }} />
                  <p>Đang tìm kiếm người dùng và tin nhắn...</p>
                </div>
              ) : (
                <>
                  {/* PHẦN 1: KẾT QUẢ TÌM KIẾM NGƯỜI DÙNG & NHÓM */}
                  {(searchCategoryTab === 'all' || searchCategoryTab === 'users') &&
                    (searchUsersResults.length > 0 || searchGroupsResults.length > 0) && (
                      <div className="tg-search-section">
                        <div className="tg-search-section-title">
                          Mọi người & Nhóm ({searchUsersResults.length + searchGroupsResults.length})
                        </div>

                        {/* Render Nhóm khớp tên */}
                        {searchGroupsResults.map((grp) => (
                          <button
                            className={`tg-chat-item ${activeChat?.id === grp.id ? 'active' : ''}`}
                            key={`search-grp-${grp.id}`}
                            onClick={() => setActiveChat(grp)}
                          >
                            <div
                              className="tg-avatar"
                              style={{
                                background: !grp.avatar_url
                                  ? getAvatarGradient(grp.id || grp.name)
                                  : undefined,
                              }}
                            >
                              {grp.avatar_url ? (
                                <img
                                  src={grp.avatar_url}
                                  alt={grp.name}
                                  className="avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                getFriendInitials(grp.name)
                              )}
                            </div>
                            <div className="tg-chat-info">
                              <div className="tg-chat-top">
                                <span className="tg-chat-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {renderHighlightedSnippet(grp.name, search)}
                                  {grp.is_community ? (
                                    <span style={{ fontSize: 10, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                                      CỘNG ĐỒNG
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 10, background: 'rgba(135, 116, 225, 0.2)', color: '#8774e1', padding: '1px 6px', borderRadius: 8 }}>
                                      {grp.member_count} tv
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="tg-chat-bottom">
                                <span className="tg-chat-preview" style={{ color: '#8774e1' }}>
                                  👥 Nhóm trò chuyện
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}

                        {/* Render Người dùng khớp tên hoặc username */}
                        {searchUsersResults.map((u) => {
                          const isFriend = u.is_friend || friends.some((f) => f.id === u.id)
                          const friendObj = friends.find((f) => f.id === u.id) || u
                          const displayName = getFriendName(friendObj) || u.display_name || u.username

                          return (
                            <button
                              className={`tg-chat-item ${activeChat?.id === u.id ? 'active' : ''}`}
                              key={`search-user-${u.id}`}
                              onClick={() => {
                                setActiveChat(friendObj)
                              }}
                            >
                              <div
                                className="tg-avatar"
                                style={{
                                  background: !u.avatar_url
                                    ? getAvatarGradient(u.id || u.username)
                                    : undefined,
                                }}
                              >
                                {u.avatar_url ? (
                                  <img
                                    src={u.avatar_url}
                                    alt={displayName}
                                    className="avatar-img"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  (displayName || 'U').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="tg-chat-info">
                                <div className="tg-chat-top">
                                  <span className="tg-chat-name">
                                    {renderHighlightedSnippet(displayName, search)}
                                  </span>
                                  {isFriend && (
                                    <span style={{ fontSize: 11, color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '1px 6px', borderRadius: 6, fontWeight: 600 }}>
                                      Bạn bè
                                    </span>
                                  )}
                                </div>
                                <div className="tg-chat-bottom">
                                  <span className="tg-chat-preview">
                                    @{u.username} {u.bio ? `• ${u.bio}` : ''}
                                  </span>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                  {/* PHẦN 2: KẾT QUẢ TÌM KIẾM TIN NHẮN */}
                  {(searchCategoryTab === 'all' || searchCategoryTab === 'messages') && (
                    <div className="tg-search-section">
                      {(searchCategoryTab === 'all' && (searchUsersResults.length > 0 || searchGroupsResults.length > 0)) && (
                        <div className="tg-search-section-title">
                          Tin nhắn ({globalSearchResults.length})
                        </div>
                      )}

                      {globalSearchResults.length > 0 ? (
                        globalSearchResults.map((res) => {
                          const targetId = res.friend_id || (res.sender_id === currentUser?.id ? res.receiver_id : res.sender_id)
                          const matchedGroup = groups.find((g) => g.id === targetId)
                          const matchedFriend = friends.find((f) => f.id === targetId)

                          const chatTarget = matchedGroup || matchedFriend || {
                            id: targetId,
                            username: res.username || 'User',
                            display_name: res.display_name || res.username || 'Người dùng',
                            avatar_url: res.avatar_url || null,
                            is_group: Boolean(res.is_group),
                          }

                          const displayName = chatTarget.is_group
                            ? (chatTarget.name || 'Nhóm')
                            : (getFriendName(chatTarget) || chatTarget.username || 'Người dùng')
                          const isSelected = activeChat?.id === chatTarget.id
                          const initialLetter = (displayName || 'U').charAt(0).toUpperCase()

                          return (
                            <button
                              className={`tg-chat-item tg-search-result-item ${isSelected ? 'active' : ''}`}
                              key={`search-msg-${res.id}`}
                              onClick={() => handleSelectSearchResult({ ...res, friend_id: chatTarget.id })}
                            >
                              <div className="tg-avatar">
                                {chatTarget.avatar_url ? (
                                  <img
                                    src={chatTarget.avatar_url}
                                    alt={displayName}
                                    className="avatar-img"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  initialLetter
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
                        searchCategoryTab === 'messages' && (
                          <div className="tg-empty-list">
                            <p>Không tìm thấy tin nhắn nào chứa "{search}"</p>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* KHI KHÔNG TÌM THẤY GÌ TRONG CẢ HAI MỤC */}
                  {searchUsersResults.length === 0 &&
                    searchGroupsResults.length === 0 &&
                    globalSearchResults.length === 0 && (
                      <div className="tg-empty-list">
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                        <p>Không tìm thấy người dùng hoặc tin nhắn nào khớp với "{search}"</p>
                      </div>
                    )}
                </>
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
                className={`tg-folder-tab ${folderTab === 'groups' ? 'active' : ''}`}
                onClick={() => setFolderTab('groups')}
              >
                <span>Nhóm</span>
                {groups.length > 0 && <span className="tg-tab-badge">{groups.length}</span>}
              </button>
              <button
                className={`tg-folder-tab ${folderTab === 'friends' ? 'active' : ''}`}
                onClick={() => setFolderTab('friends')}
              >
                <span>Bạn bè</span>
              </button>
              {(friendRequests.length > 0 || groupInvitations.length > 0) && (
                <button
                  className={`tg-folder-tab ${folderTab === 'requests' ? 'active' : ''}`}
                  onClick={() => setFolderTab('requests')}
                >
                  <span>Lời mời</span>
                  <span className="tg-tab-badge">{friendRequests.length + groupInvitations.length}</span>
                </button>
              )}
            </div>

            {/* Chat / Friends / Requests List */}
            <div className="tg-chat-list">
              {/* Lời mời tham gia nhóm đang chờ người dùng xác nhận */}
              {groupInvitations.length > 0 && folderTab !== 'requests' && (
                <div className="tg-group-invitation-banner">
                  <div className="tg-group-invitation-title">
                    <span>📨 Lời mời vào nhóm ({groupInvitations.length})</span>
                  </div>
                  {groupInvitations.map((inv) => (
                    <div key={inv.group_id} className="tg-group-invitation-item">
                      <div className="tg-group-invitation-avatar">
                        {inv.avatar_url ? (
                          <img src={inv.avatar_url} alt="" />
                        ) : (
                          (inv.name || 'G').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="tg-group-invitation-info">
                        <div className="tg-group-invitation-name">{inv.name}</div>
                        <div className="tg-group-invitation-desc">Mời bởi {inv.creator_name}</div>
                      </div>
                      <div className="tg-group-invitation-actions">
                        <button
                          type="button"
                          className="tg-group-invitation-accept"
                          onClick={() => handleAcceptGroupInvitation(inv)}
                        >
                          Đồng ý
                        </button>
                        <button
                          type="button"
                          className="tg-group-invitation-decline"
                          onClick={() => handleDeclineGroupInvitation(inv)}
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {folderTab === 'requests' ? (
                friendRequests.length > 0 || groupInvitations.length > 0 ? (
                  <div className="tg-friend-requests-list">
                    {/* Danh sách lời mời vào nhóm trong tab Lời mời */}
                    {groupInvitations.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 6px 8px' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tg-primary, #8774e1)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                            👥 Lời mời vào nhóm ({groupInvitations.length})
                          </span>
                        </div>
                        {groupInvitations.map((inv) => (
                          <div className="tg-friend-req-card" key={`tab-group-inv-${inv.group_id}`} style={{ marginBottom: 8 }}>
                            <div className="tg-friend-req-user">
                              <div
                                className="tg-avatar sm"
                                style={{
                                  background: !inv.avatar_url
                                    ? getAvatarGradient(inv.group_id || inv.name)
                                    : undefined,
                                }}
                              >
                                {inv.avatar_url ? (
                                  <img
                                    src={inv.avatar_url}
                                    alt=""
                                    className="avatar-img"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  getFriendInitials(inv.name)
                                )}
                              </div>
                              <div className="tg-friend-req-info">
                                <div className="tg-friend-req-top">
                                  <span className="tg-friend-req-name" title={inv.name}>
                                    {inv.name}
                                  </span>
                                  <span className="tg-friend-req-time">
                                    {formatChatListTime(inv.created_at)}
                                  </span>
                                </div>
                                <span className="tg-friend-req-uname">Mời bởi {inv.creator_name}</span>
                              </div>
                            </div>
                            <div className="tg-friend-req-actions">
                              <button
                                className="tg-req-accept-btn"
                                onClick={() => handleAcceptGroupInvitation(inv)}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Đồng ý
                              </button>
                              <button
                                className="tg-req-reject-btn"
                                onClick={() => handleDeclineGroupInvitation(inv)}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                                Từ chối
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Danh sách lời mời kết bạn */}
                    {friendRequests.length > 0 && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 6px 6px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#8b96a7', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                            📥 Lời mời kết bạn ({friendRequests.length})
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
                      </>
                    )}
                  </div>
                ) : (
                  <div className="tg-empty-list">
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
                    <p>Không có lời mời nào</p>
                    <span style={{ fontSize: 12, color: '#727e90', display: 'block', maxWidth: 220, margin: '4px auto 0' }}>
                      Khi có người gửi lời mời, bạn có thể đồng ý hoặc từ chối tại đây.
                    </span>
                    <button
                      className="secondary-button"
                      style={{ marginTop: 14, fontSize: 12, padding: '7px 14px' }}
                      onClick={() => handleOpenAddFriendModal()}
                    >
                      + Thêm bạn bè mới
                    </button>
                  </div>
                )
              ) : folderTab === 'groups' ? (
                groupsSorted.length > 0 ? (
                  <>
                    <div className="tg-create-group-bar">
                      <button
                        type="button"
                        className="tg-create-group-btn"
                        onClick={() => {
                          setSelectedGroupMemberIds([])
                          setGroupNameInput('')
                          setGroupAvatarInput('')
                          setCreateGroupError('')
                          setShowCreateGroupModal(true)
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>Tạo nhóm chat mới</span>
                      </button>
                    </div>
                    {groupsSorted.map((group) => {
                      const isPinned = pinnedChats.includes(group.id)
                      const isHidden = hiddenChats.includes(group.id)
                      const isMenuOpen = activeChatMenuId === group.id
                      return (
                        <div
                          className={`tg-chat-item-wrapper ${activeChat?.id === group.id ? 'active' : ''}`}
                          key={group.id}
                        >
                          <button
                            className={`tg-chat-item ${activeChat?.id === group.id ? 'active' : ''}`}
                            onClick={() => setActiveChat(group)}
                          >
                            <div
                              className="tg-avatar"
                              style={{
                                background: !group.avatar_url
                                  ? getAvatarGradient(group.id || group.name)
                                  : undefined,
                              }}
                            >
                              {group.avatar_url ? (
                                <img
                                  src={group.avatar_url}
                                  alt={group.name}
                                  className="avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                getFriendInitials(group.name)
                              )}
                            </div>

                            <div className="tg-chat-info">
                              <div className="tg-chat-top">
                                <span className="tg-chat-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {isPinned && <span className="tg-pin-icon" title="Đã ghim">📌</span>}
                                  {group.name}
                                  {group.is_community ? (
                                    <span style={{ fontSize: 10, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                                      CỘNG ĐỒNG
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 10, background: 'rgba(135, 116, 225, 0.2)', color: '#8774e1', padding: '1px 6px', borderRadius: 8 }}>
                                      {group.member_count} tv
                                    </span>
                                  )}
                                </span>
                                <span className="tg-chat-time">
                                  {formatChatListTime(group.last_message_time || group.created_at)}
                                </span>
                              </div>
                              <div className="tg-chat-bottom">
                                <span className="tg-chat-preview">
                                  {group.last_message || 'Chưa có tin nhắn trong nhóm'}
                                </span>
                              </div>
                            </div>
                          </button>

                          {/* Nút 3 chấm trên từng nhóm */}
                          <div className="tg-chat-item-actions">
                            <button
                              type="button"
                              className="tg-chat-more-btn"
                              title="Tùy chọn cuộc trò chuyện"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveChatMenuId(isMenuOpen ? null : group.id)
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="2.2"></circle>
                                <circle cx="12" cy="12" r="2.2"></circle>
                                <circle cx="12" cy="19" r="2.2"></circle>
                              </svg>
                            </button>

                            {/* Context Menu Dropdown */}
                            {isMenuOpen && (
                              <div className="tg-chat-context-menu" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="tg-chat-menu-action"
                                  onClick={(e) => handleTogglePinChat(group.id, e)}
                                >
                                  <span>{isPinned ? 'Bỏ ghim chat' : 'Ghim đoạn chat'}</span>
                                </button>
                                <button
                                  type="button"
                                  className="tg-chat-menu-action"
                                  onClick={(e) => handleToggleHideChat(group.id, e)}
                                >
                                  <span>{isHidden ? 'Hiện lại chat' : 'Ẩn trò chuyện'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </>
                ) : (
                  <div className="tg-empty-list">
                    <p>{showHiddenSection ? 'Không có nhóm nào bị ẩn.' : 'Chưa tham gia nhóm chat nào.'}</p>
                    {!showHiddenSection && (
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ marginTop: 10, fontSize: 12, padding: '7px 14px' }}
                        onClick={() => {
                          setSelectedGroupMemberIds([])
                          setGroupNameInput('')
                          setGroupAvatarInput('')
                          setCreateGroupError('')
                          setShowCreateGroupModal(true)
                        }}
                      >
                        + Tạo nhóm chat mới
                      </button>
                    )}
                  </div>
                )
              ) : folderTab === 'all' ? (
                allChatsSorted.length > 0 ? (
                  <>
                    {allChatsSorted.map((item) => {
                      const isPinned = pinnedChats.includes(item.id)
                      const isHidden = hiddenChats.includes(item.id)
                      const isMenuOpen = activeChatMenuId === item.id
                      const isGroup = Boolean(item.is_group)

                      return (
                        <div
                          className={`tg-chat-item-wrapper ${activeChat?.id === item.id ? 'active' : ''} ${isMenuOpen ? 'has-open-menu' : ''}`}
                          key={item.id}
                        >
                          <button
                            className={`tg-chat-item ${activeChat?.id === item.id ? 'active' : ''}`}
                            onClick={() => setActiveChat(item)}
                          >
                            <div
                              className="tg-avatar"
                              style={{
                                background: !item.avatar_url
                                  ? getAvatarGradient(item.id || (isGroup ? item.name : item.username))
                                  : undefined,
                              }}
                            >
                              {item.id === CLOUDCHAT_BOT_ID || item.username === 'cloudchat' ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', borderRadius: '50%' }}>
                                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
                                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                                  </svg>
                                </div>
                              ) : item.avatar_url ? (
                                <img
                                  src={item.avatar_url}
                                  alt={isGroup ? item.name : item.username}
                                  className="avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                getFriendInitials(isGroup ? item.name : getFriendName(item))
                              )}
                              {!isGroup && item.id !== CLOUDCHAT_BOT_ID && (
                                <div className={`tg-online-dot ${item.is_online ? 'online' : 'offline'}`} />
                              )}
                            </div>

                            <div className="tg-chat-info">
                              <div className="tg-chat-top">
                                <span className="tg-chat-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {isPinned && <span className="tg-pin-icon" title="Đã ghim">📌</span>}
                                  {isGroup ? item.name : getFriendName(item)}
                                  {(item.is_verified || item.username === 'cloudchat') && <VerifiedBadge size={15} />}
                                  {isGroup && item.is_community && (
                                    <span style={{ fontSize: 10, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
                                      CỘNG ĐỒNG
                                    </span>
                                  )}
                                  {isGroup && !item.is_community && (
                                    <span style={{ fontSize: 10, background: 'rgba(135, 116, 225, 0.2)', color: '#8774e1', padding: '1px 6px', borderRadius: 8 }}>
                                      {item.member_count} tv
                                    </span>
                                  )}
                                </span>
                                <span className="tg-chat-time">
                                  {formatChatListTime(item.last_message_time || item.created_at)}
                                </span>
                              </div>
                              <div className="tg-chat-bottom">
                                <span className="tg-chat-preview">
                                  {isGroup
                                    ? item.last_message || 'Chưa có tin nhắn trong nhóm'
                                    : formatLastMessagePreview(item, currentUser)}
                                </span>
                              </div>
                            </div>
                          </button>

                          {/* Nút 3 chấm trên từng hội thoại */}
                          <div className="tg-chat-item-actions">
                            <button
                              type="button"
                              className="tg-chat-more-btn"
                              title="Tùy chọn cuộc trò chuyện"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveChatMenuId(isMenuOpen ? null : item.id)
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="2.2"></circle>
                                <circle cx="12" cy="12" r="2.2"></circle>
                                <circle cx="12" cy="19" r="2.2"></circle>
                              </svg>
                            </button>

                            {/* Dropdown Menu 3 chấm: Ghim chat, Ẩn chat, Thêm nhóm */}
                            {isMenuOpen && (
                              <div className="tg-chat-context-menu" onClick={(e) => e.stopPropagation()}>
                                {!isGroup && (
                                  <button
                                    type="button"
                                    className="tg-chat-menu-action highlight"
                                    onClick={(e) => handleStartGroupWithFriend(item, e)}
                                  >
                                    <span>Thêm nhóm mới (+)</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="tg-chat-menu-action"
                                  onClick={(e) => handleTogglePinChat(item.id, e)}
                                >
                                  <span>{isPinned ? 'Bỏ ghim chat' : 'Ghim đoạn chat'}</span>
                                </button>
                                <button
                                  type="button"
                                  className="tg-chat-menu-action"
                                  onClick={(e) => handleToggleHideChat(item.id, e)}
                                >
                                  <span>{isHidden ? 'Hiện lại chat' : 'Ẩn trò chuyện'}</span>
                                </button>
                                {!isGroup && item.id !== CLOUDCHAT_BOT_ID && (
                                  <>
                                    <button
                                      type="button"
                                      className="tg-chat-menu-action danger"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveChatMenuId(null)
                                        handleClearChatHistory(item)
                                      }}
                                    >
                                      <span>Xoá lịch sử trò chuyện</span>
                                    </button>
                                    <button
                                      type="button"
                                      className={`tg-chat-menu-action ${blockedUserIds.includes(String(item.id)) ? '' : 'danger'}`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveChatMenuId(null)
                                        handleToggleBlockUser(item)
                                      }}
                                    >
                                      <span>{blockedUserIds.includes(String(item.id)) ? 'Bỏ chặn' : 'Chặn người dùng'}</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </>
                ) : (
                  <div className="tg-empty-list">
                    <p>{showHiddenSection ? 'Không có cuộc trò chuyện nào bị ẩn.' : 'Chưa có cuộc trò chuyện nào.'}</p>
                    {!showHiddenSection && (
                      <button
                        className="secondary-button"
                        style={{ marginTop: 10, fontSize: 12, padding: '7px 14px' }}
                        onClick={() => handleOpenAddFriendModal()}
                      >
                        + Thêm bạn bè để bắt đầu
                      </button>
                    )}
                  </div>
                )
              ) : (
                /* Tab Bạn bè */
                friends.length > 0 ? (
                  alphabeticalFriends.map((group) => (
                    <div key={group.letter} className="tg-friend-group">
                      <div className="tg-friend-group-header">{group.letter}</div>
                      {group.items.map((friend) => {
                        const isPinned = pinnedChats.includes(friend.id)
                        const isHidden = hiddenChats.includes(friend.id)
                        const isMenuOpen = activeChatMenuId === friend.id

                        return (
                          <div
                            className={`tg-chat-item-wrapper ${activeChat?.id === friend.id ? 'active' : ''} ${isMenuOpen ? 'has-open-menu' : ''}`}
                            key={friend.id}
                          >
                            <button
                              className={`tg-chat-item tg-friend-item ${activeChat?.id === friend.id ? 'active' : ''}`}
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
                                  <span className="tg-chat-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {isPinned && <span className="tg-pin-icon" title="Đã ghim">📌</span>}
                                    {getFriendName(friend)}
                                  </span>
                                </div>
                              </div>
                            </button>

                            {/* Nút 3 chấm trên từng bạn bè */}
                            <div className="tg-chat-item-actions">
                              <button
                                type="button"
                                className="tg-chat-more-btn"
                                title="Tùy chọn cuộc trò chuyện"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveChatMenuId(isMenuOpen ? null : friend.id)
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="12" cy="5" r="2.2"></circle>
                                  <circle cx="12" cy="12" r="2.2"></circle>
                                  <circle cx="12" cy="19" r="2.2"></circle>
                                </svg>
                              </button>

                              {/* Dropdown Menu 3 chấm */}
                              {isMenuOpen && (
                                <div className="tg-chat-context-menu" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="tg-chat-menu-action highlight"
                                    onClick={(e) => handleStartGroupWithFriend(friend, e)}
                                  >
                                    <span>Thêm nhóm mới (+)</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="tg-chat-menu-action"
                                    onClick={(e) => handleTogglePinChat(friend.id, e)}
                                  >
                                    <span>{isPinned ? 'Bỏ ghim chat' : 'Ghim đoạn chat'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="tg-chat-menu-action"
                                    onClick={(e) => handleToggleHideChat(friend.id, e)}
                                  >
                                    <span>{isHidden ? 'Hiện lại chat' : 'Ẩn trò chuyện'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="tg-chat-menu-action danger"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveChatMenuId(null)
                                      handleClearChatHistory(friend)
                                    }}
                                  >
                                    <span>Xoá lịch sử trò chuyện</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={`tg-chat-menu-action ${blockedUserIds.includes(String(friend.id)) ? '' : 'danger'}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveChatMenuId(null)
                                      handleToggleBlockUser(friend)
                                    }}
                                  >
                                    <span>{blockedUserIds.includes(String(friend.id)) ? 'Bỏ chặn' : 'Chặn người dùng'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                ) : (
                  <div className="tg-empty-list">
                    <p>Chưa có bạn bè nào.</p>
                    <button
                      className="secondary-button"
                      style={{ marginTop: 10, fontSize: 12, padding: '7px 14px' }}
                      onClick={() => handleOpenAddFriendModal()}
                    >
                      + Thêm bạn bè để bắt đầu
                    </button>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </aside>

      {/* Telegram Right Main Area: When no chat is clicked, shows wallpaper with centered pill */}
      <main className="tg-main-area">
        <ErrorBoundary key={activeChat ? String(activeChat.id) : 'empty'}>
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
                    {activeChat.id === CLOUDCHAT_BOT_ID || activeChat.username === 'cloudchat' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', borderRadius: '50%' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                        </svg>
                      </div>
                    ) : activeChat.avatar_url ? (
                      <img
                        src={activeChat.avatar_url}
                        alt={activeChat.username || activeChat.name}
                        className="avatar-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : activeChat.is_group ? (
                      getFriendInitials(activeChat.name)
                    ) : (
                      <img
                        src={getDefaultAvatar(getFriendName(activeChat))}
                        alt=""
                        className="avatar-img"
                      />
                    )}
                    {!activeChat.is_group && activeChat.id !== CLOUDCHAT_BOT_ID && (
                      <div className={`tg-online-dot ${activeChat.is_online ? 'online' : 'offline'}`} />
                    )}
                  </div>
                  <div className="tg-header-details">
                    <strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {activeChat.is_group ? activeChat.name : getFriendName(activeChat)}
                      {(activeChat.is_verified || activeChat.username === 'cloudchat') && <VerifiedBadge size={16} />}
                    </strong>
                    <span className={`tg-header-status ${activeChat.is_group ? 'online' : (activeChat.is_online ? 'online' : 'offline')}`}>
                      {activeChat.is_system_bot || activeChat.id === CLOUDCHAT_BOT_ID || activeChat.username === 'cloudchat'
                        ? 'Kênh thông báo'
                        : activeChat.is_group
                          ? `👥 Nhóm chat • ${groupDetailData?.member_count || activeChat.member_count || 1} thành viên`
                          : formatUserStatus(activeChat)}
                    </span>
                  </div>
                </div>

                <div className="tg-header-actions">

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
              <div className="tg-messages-scroll" ref={messagesContainerRef}>
                {chatLoading ? (
                  <div className="tg-messages-loading">
                    <div className="tg-spinner" />
                    <span>Đang tải tin nhắn...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="tg-empty-chat-state">
                    <div className="tg-avatar lg">
                      {activeChat.id === CLOUDCHAT_BOT_ID || activeChat.username === 'cloudchat' ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', borderRadius: '50%' }}>
                          <svg width="42" height="42" viewBox="0 0 24 24" fill="#ffffff">
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                          </svg>
                        </div>
                      ) : activeChat.avatar_url ? (
                        <img src={activeChat.avatar_url} alt="" className="avatar-img" />
                      ) : (
                        (getFriendName(activeChat) || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {getFriendName(activeChat)}
                      {(activeChat.is_verified || activeChat.username === 'cloudchat') && <VerifiedBadge size={20} />}
                    </h3>
                    <p>Chưa có tin nhắn nào ở đây. Hãy gửi lời chào đầu tiên!</p>

                    {/* Nút Kết Bạn hiển thị trực tiếp khi search và bấm vào người bạn chưa kết bạn (Ảnh 3) */}
                    {!activeChat.is_group && !activeChat.is_system_bot && !friends.some((f) => String(f.id) === String(activeChat.id)) && (
                      <div className="tg-chat-empty-friend-prompt">
                        <p className="tg-empty-friend-subtext">
                          Để nhắn tin, bạn cần gửi lời kết bạn với người này!
                        </p>
                        {friendRequests.some((r) => String(r.user_id) === String(activeChat.id) || String(r.id) === String(activeChat.id)) ? (
                          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => {
                                const req = friendRequests.find((r) => String(r.user_id) === String(activeChat.id) || String(r.id) === String(activeChat.id))
                                if (req) handleAcceptFriendRequest(req.id)
                              }}
                            >
                              ✓ Đồng ý kết bạn
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => {
                                const req = friendRequests.find((r) => String(r.user_id) === String(activeChat.id) || String(r.id) === String(activeChat.id))
                                if (req) handleRejectFriendRequest(req.id)
                              }}
                            >
                              ✕ Từ chối
                            </button>
                          </div>
                        ) : sentFriendRequests.some((r) => String(r.friend_id) === String(activeChat.id) || String(r.id) === String(activeChat.id)) ? (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled
                            style={{ opacity: 0.85, cursor: 'default' }}
                          >
                            ⏳ Đã gửi lời mời (Đang chờ đồng ý)
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="primary-button tg-empty-add-friend-btn"
                            onClick={() => handleSendFriendRequest(activeChat.id)}
                            disabled={searchFriendLoading}
                          >
                            {searchFriendLoading ? 'Đang gửi...' : '+ Gửi lời mời kết bạn'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  (() => {
                    const latestMineMsg = [...messages].reverse().find(
                      (m) => currentUser?.id != null && String(m.sender_id) === String(currentUser.id)
                    )
                    const latestMineId = latestMineMsg ? latestMineMsg.id : null

                    // QUY TẮC HIỆU NĂNG: Chỉ hiển thị visibleCount (mặc định 20) tin nhắn gần nhất để mượt mà, không lag
                    const displayedMessages = messages.slice(-visibleCount)
                    const hiddenCount = Math.max(0, messages.length - visibleCount)

                    return (
                      <>
                        {/* Nút Tải Thêm Tin Nhắn Cũ (Giảm Lag) */}
                        {hiddenCount > 0 && (
                          <div className="tg-load-more-container">
                            <button
                              type="button"
                              className="tg-load-more-btn"
                              onClick={() => setVisibleCount((prev) => prev + 20)}
                            >
                              <span>Tải thêm tin nhắn</span>
                              <span className="tg-load-more-badge">
                                Còn {hiddenCount} tin
                              </span>
                            </button>
                          </div>
                        )}

                        {displayedMessages.map((item, idx) => {
                          const isMine = Boolean(
                            currentUser?.id != null &&
                            String(item.sender_id) === String(currentUser.id)
                          )
                          const isRevoked = isRevokedMessage(item.content)
                          const isLatestMine = isMine && item.id === latestMineId
                          const isCurrentMatch =
                            matchingMessageIds.length > 0 &&
                            matchingMessageIds[chatSearchIndex] === item.id

                          const currentDateStr = formatDate(item.created_at)
                          const prevDateStr = idx > 0 ? formatDate(displayedMessages[idx - 1].created_at) : null
                          const showDateBubble = idx === 0 || (currentDateStr && currentDateStr !== prevDateStr)

                          const prevItem = idx > 0 ? displayedMessages[idx - 1] : null
                          const isFirstInSequence =
                            idx === 0 ||
                            showDateBubble ||
                            String(prevItem?.sender_id) !== String(item.sender_id)

                          const isActionMenuOpen = activeActionMsgId === item.id

                          return (
                            <div key={item.id}>
                              {showDateBubble && currentDateStr && (
                                <div className="tg-bubble-date">{currentDateStr}</div>
                              )}
                              <div
                                className={`tg-msg-row ${isMine ? 'mine' : 'theirs'} ${isFirstInSequence ? 'first-in-sequence' : 'consecutive'}`}
                                id={`msg-${item.id}`}
                                style={{ position: 'relative' }}
                              >
                                {!isMine && (
                                  <div className="tg-msg-avatar-col theirs">
                                    {isFirstInSequence ? (
                                      <div
                                        className="tg-msg-avatar theirs"
                                        title={item.sender_name || item.sender_username || getFriendName(activeChat)}
                                      >
                                        {item.sender_avatar || activeChat.avatar_url ? (
                                          <img
                                            src={item.sender_avatar || activeChat.avatar_url}
                                            alt=""
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          />
                                        ) : (
                                          (item.sender_name || item.sender_username || getFriendName(activeChat) || 'U').charAt(0).toUpperCase()
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

                                {/* If mine: action buttons sit to the left of the bubble -> (3 chấm, Share, Reply) [Bubble] */}
                                {isMine && (
                                  <div className="tg-msg-actions" style={{ position: 'relative' }}>
                                    <button
                                      className={`tg-msg-act-btn ${isActionMenuOpen ? 'active' : ''}`}
                                      title="Tùy chọn tin nhắn (...)"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveActionMsgId((curr) => (curr === item.id ? null : item.id))
                                      }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <circle cx="5" cy="12" r="2.2"></circle>
                                        <circle cx="12" cy="12" r="2.2"></circle>
                                        <circle cx="19" cy="12" r="2.2"></circle>
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
                                      title="Trả lời (Reply)"
                                      onClick={() => handleStartReply(item)}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
                                      </svg>
                                    </button>

                                    {/* Popover Menu khi ấn nút ... (Tin nhắn của tôi) */}
                                    {isActionMenuOpen && (
                                      <div
                                        className="tg-msg-popover-menu left-aligned"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          className="tg-popover-item"
                                          onClick={() => {
                                            setActiveActionMsgId(null)
                                            handleCopyMessage(item.content)
                                          }}
                                        >
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                          </svg>
                                          <span>Sao chép</span>
                                        </button>
                                        {!isRevoked && (
                                          <button
                                            type="button"
                                            className="tg-popover-item danger"
                                            onClick={() => handleRecallMessage(item.id)}
                                          >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                              <circle cx="12" cy="12" r="10"></circle>
                                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                            </svg>
                                            <span>Thu hồi</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          className="tg-popover-item danger"
                                          onClick={() => handleDeleteForMe(item.id)}
                                        >
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                          </svg>
                                          <span>Xoá chỉ ở phía tôi</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {(() => {
                                  const emojiList = getEmojiOnlyList(item.content)
                                  const isEmojiOnly = Boolean(emojiList && emojiList.length > 0 && !item.reply_to_id)
                                  return (
                                    <div
                                      className={`tg-msg-bubble ${isRevoked ? 'revoked-bubble' : ''} ${isCurrentMatch ? 'search-active-bubble' : ''} ${isImageMessage(item.content) && !item.reply_to_id ? 'image-only-bubble' : ''} ${isEmojiOnly ? 'single-emoji-bubble emoji-only-bubble' : ''}`}
                                      style={isEmojiOnly ? { background: 'transparent', backgroundColor: 'transparent', boxShadow: 'none', border: 'none', padding: 0, minWidth: 0 } : undefined}
                                      title={formatFullDateTime(item.created_at)}
                                    >
                                      {/* Nếu là trong nhóm và là tin nhắn của người khác, hiển thị tên người gửi */}
                                      {activeChat.is_group && !isMine && isFirstInSequence && (
                                        <div
                                          style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: '#a78bfa',
                                            marginBottom: 4,
                                          }}
                                        >
                                          {item.sender_name || item.sender_username || 'Thành viên'}
                                        </div>
                                      )}

                                      {/* Replied Message Quote */}
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
                                        {isEmojiOnly ? (
                                          <div className="tg-single-apple-emoji-wrap tg-multiple-emojis-wrap">
                                            {emojiList.map((emoji, eIdx) => {
                                              const appleUrl = getAppleEmojiUrl(emoji)
                                              return (
                                                <span key={eIdx} className="tg-emoji-standalone-item">
                                                  {appleUrl ? (
                                                    <>
                                                      <img
                                                        src={appleUrl}
                                                        alt={emoji}
                                                        className="tg-single-apple-emoji-img"
                                                        draggable={false}
                                                        onError={(e) => {
                                                          e.currentTarget.style.display = 'none'
                                                          const fallback = e.currentTarget.nextElementSibling
                                                          if (fallback) fallback.style.display = 'inline-block'
                                                        }}
                                                      />
                                                      <span className="tg-single-emoji-fallback" style={{ display: 'none' }}>
                                                        {emoji}
                                                      </span>
                                                    </>
                                                  ) : (
                                                    <span className="tg-single-emoji-fallback">
                                                      {emoji}
                                                    </span>
                                                  )}
                                                </span>
                                              )
                                            })}
                                          </div>
                                        ) : (
                                          renderMessageContent(item.content, chatSearchQuery)
                                        )}
                                        {(item.content?.includes('Terminate session') || item.is_login_notice) && (
                                          <div style={{ marginTop: 8 }}>
                                            <button
                                              type="button"
                                              className="tg-terminate-session-btn"
                                              onClick={handleLogout}
                                            >
                                              Đăng xuất phiên
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      {isLatestMine && !isEmojiOnly && (
                                        <div className="tg-msg-meta status-only">
                                          <span className={`tg-msg-receipt ${item.is_read ? 'read' : 'sent'}`}>
                                            {item.is_read ? 'Đã xem' : 'Đã gửi'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}

                                {/* If theirs: action buttons sit to the right of the bubble -> [Bubble] (Reply, Share, 3 chấm) */}
                                {!isMine && (
                                  <div className="tg-msg-actions" style={{ position: 'relative' }}>
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
                                      className={`tg-msg-act-btn ${isActionMenuOpen ? 'active' : ''}`}
                                      title="Tùy chọn tin nhắn (...)"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveActionMsgId((curr) => (curr === item.id ? null : item.id))
                                      }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <circle cx="5" cy="12" r="2.2"></circle>
                                        <circle cx="12" cy="12" r="2.2"></circle>
                                        <circle cx="19" cy="12" r="2.2"></circle>
                                      </svg>
                                    </button>

                                    {/* Popover Menu khi ấn nút ... (Tin nhắn người khác) */}
                                    {isActionMenuOpen && (
                                      <div
                                        className="tg-msg-popover-menu left-aligned"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          className="tg-popover-item"
                                          onClick={() => {
                                            setActiveActionMsgId(null)
                                            handleCopyMessage(item.content)
                                          }}
                                        >
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                          </svg>
                                          <span>Sao chép</span>
                                        </button>
                                        <button
                                          type="button"
                                          className="tg-popover-item danger"
                                          onClick={() => handleDeleteForMe(item.id)}
                                        >
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                          </svg>
                                          <span>Xoá chỉ ở phía tôi</span>
                                        </button>
                                      </div>
                                    )}
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
                        })}
                      </>
                    )
                  })()
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Hidden File Picker Inputs (Hỗ trợ Camera, Photos, Tệp) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAttachmentFileSelected}
                accept="*/*"
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleAttachmentFileSelected}
                accept="image/*,video/*"
                capture="environment"
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={photoInputRef}
                onChange={handleAttachmentFileSelected}
                accept="image/*,video/*"
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={documentInputRef}
                onChange={handleAttachmentFileSelected}
                accept="*/*"
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

              {/* Thanh xem trước tệp/ảnh đính kèm trước khi gửi */}
              {pendingAttachment && (
                <div className="tg-attach-preview-bar">
                  {pendingAttachment.isImage ? (
                    <img
                      src={pendingAttachment.url}
                      alt="Xem trước ảnh"
                      className="tg-attach-thumb"
                      onClick={() => setPreviewMediaUrl(pendingAttachment.url)}
                    />
                  ) : (
                    <div className="tg-attach-file-icon">📄</div>
                  )}
                  <div className="tg-attach-preview-info">
                    <span className="tg-attach-preview-name">{pendingAttachment.name}</span>
                    <span className="tg-attach-preview-size">{formatFileSize(pendingAttachment.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="tg-attach-preview-close"
                    title="Hủy tệp đính kèm"
                    onClick={() => setPendingAttachment(null)}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Giao diện ghi âm tin nhắn thoại (Voice Note) Khớp chuẩn 100% Ảnh 2 */}
              {isRecordingVoice ? (
                <div className="tg-voice-recording-container">
                  <button
                    type="button"
                    className="tg-voice-trash-btn"
                    onClick={handleCancelVoiceRecord}
                    title="Hủy ghi âm"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>

                  <div className="tg-voice-recording-pill">
                    <div className="tg-voice-recording-dot" />

                    {/* Dải sóng chấm tím animated giống Ảnh 2 */}
                    <div className="tg-voice-waveform-dots">
                      {Array.from({ length: 44 }).map((_, i) => (
                        <span
                          key={i}
                          className="tg-waveform-dot"
                          style={{
                            animationDelay: `${(i % 12) * 0.11}s`,
                            opacity: isVoicePaused ? 0.35 : undefined,
                          }}
                        />
                      ))}
                    </div>

                    {/* Đồng hồ số vàng hổ phách dạng 0:03,30 giống Ảnh 2 */}
                    <span className="tg-recording-time-amber">
                      {formatVoiceCentiseconds(voiceDurationMs)}
                    </span>

                    {/* Nút điều khiển: Tạm dừng / Tiếp tục */}
                    <button
                      type="button"
                      className="tg-voice-icon-ctrl-btn"
                      onClick={handleTogglePauseVoice}
                      title={isVoicePaused ? "Tiếp tục ghi âm" : "Tạm dừng"}
                    >
                      {isVoicePaused ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                          <polygon points="10 8 16 12 10 16 10 8"></polygon>
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="9"></circle>
                          <line x1="10" y1="9" x2="10" y2="15" strokeWidth="2.2" strokeLinecap="round"></line>
                          <line x1="14" y1="9" x2="14" y2="15" strokeWidth="2.2" strokeLinecap="round"></line>
                        </svg>
                      )}
                    </button>

                    {/* Nút gửi hình tròn tím máy bay giấy giống Ảnh 2 */}
                    <button
                      type="button"
                      className="tg-voice-send-circle-btn"
                      onClick={handleStopAndSendVoice}
                      title="Gửi tin nhắn thoại"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                /* Telegram Message Input Pill */
                <div className="tg-input-area">
                  <div className="tg-attach-wrapper" ref={attachMenuRef}>
                    <button
                      type="button"
                      className={`tg-icon-btn tg-attach-btn ${showAttachMenu ? 'active' : ''}`}
                      title="Đính kèm ảnh / video / tệp tin"
                      onClick={handleAttachmentClick}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                      </svg>
                    </button>

                    {/* Popup menu đính kèm: Chỉ hiện trên mobile khi bấm kẹp ghim */}
                    {showAttachMenu && (
                      <div className="tg-attach-popup">
                        <button
                          type="button"
                          className="tg-attach-option"
                          onClick={() => {
                            setShowAttachMenu(false)
                            cameraInputRef.current?.click()
                          }}
                        >
                          <span className="tg-attach-icon">📷</span>
                          <span>Camera</span>
                        </button>
                        <button
                          type="button"
                          className="tg-attach-option"
                          onClick={() => {
                            setShowAttachMenu(false)
                            photoInputRef.current?.click()
                          }}
                        >
                          <span className="tg-attach-icon">🖼️</span>
                          <span>Photos</span>
                        </button>
                        <button
                          type="button"
                          className="tg-attach-option"
                          onClick={() => {
                            setShowAttachMenu(false)
                            documentInputRef.current?.click()
                          }}
                        >
                          <span className="tg-attach-icon">📁</span>
                          <span>Tệp tin</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mention Suggestions Popover (@username & @everyone) */}
                  {showMentionPopover && mentionCandidates.length > 0 && (
                    <div className="tg-mention-popover" ref={mentionPopoverRef}>
                      <div className="tg-mention-popover-header">Nhắc tên thành viên (@)</div>
                      <div className="tg-mention-popover-list">
                        {mentionCandidates.map((cand, idx) => (
                          <div
                            key={cand.id}
                            className={`tg-mention-item ${idx === mentionSelectedIndex ? 'selected' : ''}`}
                            onClick={() => handleSelectMention(cand)}
                            onMouseEnter={() => setMentionSelectedIndex(idx)}
                          >
                            {cand.isEveryone ? (
                              <div className="tg-mention-item-avatar everyone">📢</div>
                            ) : (
                              <div
                                className="tg-mention-item-avatar"
                                style={{ background: !cand.avatar_url ? getAvatarGradient(cand.id || cand.username) : undefined }}
                              >
                                {cand.avatar_url ? (
                                  <img src={cand.avatar_url} alt="" className="avatar-img" />
                                ) : (
                                  (cand.display_name || cand.username || 'U').charAt(0).toUpperCase()
                                )}
                              </div>
                            )}
                            <div className="tg-mention-item-info">
                              <span className="tg-mention-item-name">
                                {cand.isEveryone ? '@everyone' : (cand.display_name || cand.username)}
                              </span>
                              <span className="tg-mention-item-sub">
                                {cand.isEveryone ? 'Thông báo đến tất cả mọi người' : `@${cand.username}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    ref={msgInputRef}
                    className="tg-msg-input"
                    placeholder={pendingAttachment ? "Nhập chú thích (tùy chọn)..." : "Viết tin nhắn..."}
                    value={message}
                    onChange={handleChatInputChange}
                    onPaste={handleInputPaste}
                    onKeyDown={handleChatInputKeyDown}
                    disabled={chatLoading}
                  />

                  {/* Nút icon (Emoji / Biểu tượng cảm xúc) nằm gần nút Mic / Gửi */}
                  <div className="tg-emoji-wrapper" ref={emojiPickerRef}>
                    <button
                      type="button"
                      className={`tg-icon-btn tg-emoji-btn ${showEmojiPicker ? 'active' : ''}`}
                      title="Biểu tượng cảm xúc (Apple Emoji)"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                    >
                      <img
                        src={getAppleEmojiUrl('😊')}
                        alt=""
                        className="tg-emoji-toggle-apple-img"
                        draggable={false}
                      />
                    </button>

                    {/* Popover chọn emoji */}
                    {showEmojiPicker && (
                      <div className="tg-emoji-picker-popover">
                        <div className="tg-emoji-categories">
                          {EMOJI_CATEGORIES.map((cat, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className={`tg-emoji-cat-btn ${activeEmojiTab === idx ? 'active' : ''}`}
                              onClick={() => setActiveEmojiTab(idx)}
                            >
                              <img
                                src={getAppleEmojiUrl(cat.icon)}
                                alt=""
                                className="tg-apple-cat-img"
                                draggable={false}
                              />
                            </button>
                          ))}
                        </div>
                        <div className="tg-emoji-grid">
                          {(EMOJI_CATEGORIES[activeEmojiTab] || EMOJI_CATEGORIES[0])?.emojis.map((emoji, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="tg-emoji-item"
                              onClick={() => handleInsertEmoji(emoji)}
                            >
                              <img
                                src={getAppleEmojiUrl(emoji)}
                                alt=""
                                className="tg-apple-emoji-img"
                                loading="lazy"
                                draggable={false}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nút gửi: Nếu có chữ hoặc có tệp thì là Send ✈️, nếu trống thì là Mic 🎙️ để gửi voice */}
                  {message.trim() || pendingAttachment ? (
                    <button
                      className="tg-send-btn"
                      onClick={handleSend}
                      disabled={chatLoading}
                      title="Gửi"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tg-send-btn tg-mic-btn"
                      onClick={handleStartVoiceRecord}
                      title="Nhấn để gửi tin nhắn thoại"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: '#ffffff', color: '#ffffff' }}>
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="#ffffff"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#ffffff"></path>
                        <line x1="12" y1="19" x2="12" y2="23" stroke="#ffffff"></line>
                        <line x1="8" y1="23" x2="16" y2="23" stroke="#ffffff"></line>
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="tg-no-chat-selected" />
          )}
        </ErrorBoundary>
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
              {/* User or Group Card */}
              <div className="tg-info-user-card">
                <div
                  className="tg-info-avatar-large"
                  style={activeChat.is_group && groupDetailData?.is_creator ? { cursor: 'pointer' } : {}}
                  onClick={() => {
                    if (activeChat.is_group && groupDetailData?.is_creator) {
                      groupAvatarInputRef.current?.click()
                    }
                  }}
                  title={activeChat.is_group && groupDetailData?.is_creator ? 'Nhấp để đổi ảnh đại diện nhóm' : ''}
                >
                  {activeChat.avatar_url ? (
                    <img
                      src={activeChat.avatar_url}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : activeChat.is_group ? (
                    getFriendInitials(activeChat.name)
                  ) : (
                    (getFriendName(activeChat) || 'U').charAt(0).toUpperCase()
                  )}

                  {activeChat.is_group && groupDetailData?.is_creator && (
                    <button
                      type="button"
                      className="tg-group-avatar-camera-badge"
                      title="Đổi ảnh đại diện nhóm"
                      onClick={(e) => {
                        e.stopPropagation()
                        groupAvatarInputRef.current?.click()
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                    </button>
                  )}
                </div>

                {activeChat.is_group && groupDetailData?.is_creator && (
                  <input
                    type="file"
                    ref={groupAvatarInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleGroupAvatarSelect}
                  />
                )}

                {activeChat.is_group ? (
                  <>
                    <div className="tg-info-name-wrap">
                      <h2>{activeChat.name}</h2>
                      {groupDetailData?.is_creator && (
                        <button
                          className="tg-edit-nickname-btn"
                          title="Đổi tên nhóm"
                          onClick={() => {
                            setRenameGroupNameInput(activeChat.name || '')
                            setShowRenameGroupModal(true)
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}


              </div>

              {/* NẾU LÀ NHÓM CHAT: PHẦN QUẢN LÝ THÀNH VIÊN VÀ QUY TẮC HIỂN THỊ */}
              {activeChat.is_group && (
                <div
                  className="tg-accordion-section tg-group-members-section"
                  style={{
                    borderBottom: '1px solid var(--tg-border, rgba(255,255,255,0.08))',
                    paddingBottom: 12,
                    overflow: 'visible',
                    position: 'relative',
                    zIndex: 30,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="tg-group-members-header" style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                        Thành viên ({groupDetailData?.member_count || activeChat.member_count || 1})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAddMemberSelectedIds([])
                        setAddMemberError('')
                        setShowAddGroupMemberModal(true)
                      }}
                      style={{
                        background: 'rgba(135, 116, 225, 0.2)',
                        border: '1px solid #8774e1',
                        color: 'var(--tg-primary, #8774e1)',
                        padding: '4px 10px',
                        borderRadius: 14,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + Mời thành viên
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 16px', overflow: 'visible' }}>
                    {(groupDetailData?.members || []).map((m) => (
                      <div
                        key={m.id}
                        className="tg-group-member-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: 8,
                          position: 'relative',
                          zIndex: activeMemberMenuId === m.id ? 50 : 1,
                          overflow: 'visible',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div
                            className="tg-avatar sm"
                            style={{
                              width: 32,
                              height: 32,
                              fontSize: 13,
                              flexShrink: 0,
                              background: !m.avatar_url ? getAvatarGradient(m.id || m.username) : undefined,
                            }}
                          >
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="avatar-img" />
                            ) : (
                              (m.display_name || m.username || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="tg-group-member-name" style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.display_name || m.username}
                              {m.id === currentUser?.id && <span style={{ color: 'var(--tg-text-secondary)', fontSize: 11 }}> (Bạn)</span>}
                            </div>
                            <div className="tg-group-member-username" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{m.username}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {m.role === 'creator' || m.role === 'admin' ? (
                            <span style={{ fontSize: 10, background: 'rgba(135, 116, 225, 0.2)', color: 'var(--tg-primary, #8774e1)', padding: '2px 7px', borderRadius: 8, fontWeight: 700 }}>
                              Quản trị viên
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: 'var(--tg-text-secondary)' }}>Thành viên</span>
                          )}

                          {groupDetailData?.is_creator && m.id !== currentUser?.id && (
                            <div
                              className="tg-member-actions-dropdown-wrapper"
                              style={{
                                position: 'relative',
                                zIndex: activeMemberMenuId === m.id ? 60 : 1,
                              }}
                            >
                              <button
                                type="button"
                                className="tg-icon-btn tg-member-menu-btn"
                                title="Quản lý thành viên"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveMemberMenuId(activeMemberMenuId === m.id ? null : m.id)
                                }}
                                style={{ width: 26, height: 26, borderRadius: 6, padding: 0, fontSize: 12 }}
                              >
                                •••
                              </button>
                              {activeMemberMenuId === m.id && (
                                <div
                                  className="tg-member-actions-menu"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="tg-member-action-item"
                                    onClick={() => {
                                      setActiveMemberMenuId(null)
                                      handleToggleAdminRole(m)
                                    }}
                                  >
                                    {m.role === 'admin' ? '👤 Hạ quyền thành viên' : '👑 Bổ nhiệm Quản trị viên'}
                                  </button>
                                  <button
                                    type="button"
                                    className="tg-member-action-item danger"
                                    onClick={() => {
                                      setActiveMemberMenuId(null)
                                      setMemberToKickModal(m)
                                    }}
                                  >
                                    🚫 Loại khỏi nhóm
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Lời mời vào nhóm đang chờ đồng ý (chỉ nhóm trưởng thấy) */}
                  {groupDetailData?.pending_members && groupDetailData.pending_members.length > 0 && groupDetailData.is_creator && (
                    <div style={{ marginTop: 12, padding: '0 16px' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tg-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
                        Đang chờ đồng ý ({groupDetailData.pending_members.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {groupDetailData.pending_members.map((p) => (
                          <div
                            key={p.id}
                            className="tg-group-member-item"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: 8,
                              opacity: 0.85,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <div
                                className="tg-avatar sm"
                                style={{
                                  width: 28,
                                  height: 28,
                                  fontSize: 12,
                                  flexShrink: 0,
                                  background: !p.avatar_url ? getAvatarGradient(p.id || p.username) : undefined,
                                }}
                              >
                                {p.avatar_url ? (
                                  <img src={p.avatar_url} alt="" className="avatar-img" />
                                ) : (
                                  (p.display_name || p.username || 'U').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div className="tg-group-member-name" style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.display_name || p.username}
                                </div>
                                <div className="tg-group-member-username" style={{ fontSize: 10 }}>@{p.username}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRevokeGroupInvitation(p)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#ef4444',
                                borderRadius: 6,
                                padding: '2px 8px',
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                            >
                              Huỷ lời mời
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                          {(showAllMedia ? chatMediaItems : chatMediaItems.slice(0, 8)).map((media, idx) => (
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
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.opacity = '0.3'
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        {chatMediaItems.length > 8 && (
                          <button
                            className="tg-view-all-btn"
                            onClick={() => setShowAllMedia((prev) => !prev)}
                          >
                            {showAllMedia ? 'Thu gọn ▴' : `Xem tất cả (${chatMediaItems.length}) ▾`}
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

              {/* Nút Giải tán nhóm (Nhóm trưởng) hoặc Rời khỏi nhóm (Thành viên) */}
              {activeChat.is_group && (
                <div className="tg-sidebar-block-action" style={{ padding: "16px 20px", marginTop: 12 }}>
                  {groupDetailData?.is_creator ? (
                    <button
                      type="button"
                      className="tg-clear-history-btn"
                      onClick={() => setShowDisbandConfirmModal(true)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "11px 16px",
                        borderRadius: 12,
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        color: "#ef4444",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>Giải tán nhóm</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tg-clear-history-btn"
                      onClick={() => setShowLeaveGroupConfirmModal(true)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "11px 16px",
                        borderRadius: 12,
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        color: "#ef4444",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      <span>Rời khỏi nhóm</span>
                    </button>
                  )}
                </div>
              )}

              {/* Nút Xoá lịch sử & Chặn / Bỏ chặn người dùng */}
              {!activeChat.is_group && activeChat.id !== CLOUDCHAT_BOT_ID && activeChat.username !== 'cloudchat' && (
                <div className="tg-sidebar-block-action" style={{ padding: "16px 20px", marginTop: 12 }}>
                  <button
                    type="button"
                    className="tg-clear-history-btn"
                    onClick={() => handleClearChatHistory(activeChat)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "11px 16px",
                      borderRadius: 12,
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      color: "#ef4444",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      marginBottom: 10,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span>Xoá lịch sử trò chuyện</span>
                  </button>
                  <button
                    type="button"
                    className="tg-block-user-btn"
                    onClick={() => handleToggleBlockUser(activeChat)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "11px 16px",
                      borderRadius: 12,
                      background: blockedUserIds.includes(String(activeChat.id))
                        ? "rgba(34, 197, 94, 0.12)"
                        : "rgba(239, 68, 68, 0.12)",
                      border: blockedUserIds.includes(String(activeChat.id))
                        ? "1px solid rgba(34, 197, 94, 0.4)"
                        : "1px solid rgba(239, 68, 68, 0.4)",
                      color: blockedUserIds.includes(String(activeChat.id)) ? "#22c55e" : "#ef4444",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                    <span>{blockedUserIds.includes(String(activeChat.id)) ? 'Bỏ chặn người dùng' : 'Chặn người dùng'}</span>
                  </button>
                </div>
              )}
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
            {/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(previewMediaUrl) || (typeof previewMediaUrl === 'string' && previewMediaUrl.startsWith('data:video/')) ? (
              <video src={previewMediaUrl} controls autoPlay className="tg-lightbox-img" style={{ maxHeight: '85vh', maxWidth: '90vw' }} />
            ) : (
              <img src={previewMediaUrl} alt="Preview" className="tg-lightbox-img" />
            )}
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

            <div className="tg-modal-requests-body" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '65vh', overflowY: 'auto', padding: '12px 4px' }}>
              {/* PHẦN 1: LỜI MỜI ĐÃ NHẬN */}
              <div className="tg-requests-section">
                <div className="tg-requests-section-header">
                  <span className="tg-requests-section-title">
                    📥 Lời mời đã nhận
                  </span>
                  <span className={`tg-requests-count-badge ${friendRequests.length > 0 ? 'active' : ''}`}>
                    {friendRequests.length}
                  </span>
                </div>

                {friendRequests.length > 0 ? (
                  <div className="tg-friend-requests-list">
                    {friendRequests.map((req) => {
                      const reqName = req.display_name || req.username
                      return (
                        <div className="tg-friend-req-card" key={req.id}>
                          <div className="tg-friend-req-user">
                            <div className="tg-avatar sm">
                              <img
                                src={req.avatar_url || getDefaultAvatar(reqName)}
                                alt=""
                                className="avatar-img"
                                onError={(e) => {
                                  e.currentTarget.src = getDefaultAvatar(reqName)
                                }}
                              />
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
                              <span className="tg-friend-req-uname">{req.username}</span>
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
                  <div className="tg-empty-section-hint">
                    Không có lời mời nào gửi đến bạn
                  </div>
                )}
              </div>

              {/* PHẦN 2: LỜI MỜI ĐÃ GỬI */}
              <div className="tg-requests-section" style={{ marginTop: 8 }}>
                <div className="tg-requests-section-header">
                  <span className="tg-requests-section-title">
                    📤 Lời mời bạn đã gửi
                  </span>
                  <span className={`tg-requests-count-badge ${sentFriendRequests.length > 0 ? 'active' : ''}`}>
                    {sentFriendRequests.length}
                  </span>
                </div>

                {sentFriendRequests.length > 0 ? (
                  <div className="tg-friend-requests-list">
                    {sentFriendRequests.map((req) => {
                      const reqName = req.display_name || req.username
                      return (
                        <div className="tg-friend-req-card" key={req.id}>
                          <div className="tg-friend-req-user">
                            <div className="tg-avatar sm">
                              <img
                                src={req.avatar_url || getDefaultAvatar(reqName)}
                                alt=""
                                className="avatar-img"
                                onError={(e) => {
                                  e.currentTarget.src = getDefaultAvatar(reqName)
                                }}
                              />
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
                              <span className="tg-friend-req-uname">{req.username}</span>
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
                  <div className="tg-empty-section-hint">
                    Bạn chưa gửi lời mời kết bạn nào đang chờ
                  </div>
                )}
              </div>
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
                          {(req.username || req.name || 'U').charAt(0).toUpperCase()}
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
                  handleOpenAddFriendModal()
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
                          (friend.display_name || friend.username || 'U').charAt(0).toUpperCase()
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

      {/* Add Friend Modal (Tìm kiếm bạn bè) */}
      {showAddFriendModal && (
        <div className="modal-overlay" onClick={handleCloseAddFriendModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon">➕</div>
                <div>
                  <h3>Thêm bạn bè</h3>

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

            {searchFriendError && <div className="modal-alert error">{searchFriendError}</div>}
            {searchFriendSuccess && <div className="modal-alert success">{searchFriendSuccess}</div>}

            <form onSubmit={handleSearchFriend} className="profile-form">
              <label>
                Tên người dùng hoặc Email
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Nhập tên hiển thị hoặc email người dùng..."
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
              <div className="qr-result-card" style={{ marginTop: 14 }}>
                <div className="qr-result-user">
                  <div className="tg-avatar sm">
                    {searchFriendResult.avatar_url ? (
                      <img src={searchFriendResult.avatar_url} alt="" className="avatar-img" />
                    ) : (
                      (searchFriendResult.display_name || searchFriendResult.username || 'U').charAt(0).toUpperCase()
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

            <div className="modal-footer" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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

      {/* Modal Thông tin tài khoản (Giao diện MỚI chuẩn: Avatar gọn gàng, Giới tính, Ngày sinh) */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-card tg-profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon">👤</div>
                <div>
                  <h3>Thông tin tài khoản</h3>

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

            {profileError && <div className="modal-alert error">{profileError}</div>}
            {profileSuccess && <div className="modal-alert success">{profileSuccess}</div>}

            <form onSubmit={handleUpdateProfile} className="profile-form">
              {/* --- COMPACT AVATAR: ICON DUY NHẤT & RÊ CHUỘT THAY ẢNH --- */}
              <div className="profile-avatar-center">
                <div
                  className="profile-avatar-wrapper"
                  onClick={() => avatarFileInputRef.current?.click()}
                  title="Nhấp để thay đổi ảnh đại diện"
                >
                  {profileAvatarUrl ? (
                    <img
                      src={profileAvatarUrl}
                      alt="Avatar"
                      className="profile-avatar-img"
                      onError={(e) => {
                        e.currentTarget.src = getDefaultAvatar(profileDisplayName || currentUser?.display_name || currentUser?.username)
                      }}
                    />
                  ) : (
                    <img
                      src={getDefaultAvatar(profileDisplayName || currentUser?.display_name || currentUser?.username)}
                      alt="Avatar"
                      className="profile-avatar-img"
                    />
                  )}

                  {/* Nút overlay thay ảnh khi rê chuột gần */}
                  <div className="profile-avatar-hover-overlay">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    <span>Thay ảnh</span>
                  </div>

                  {/* Badge camera nhỏ góc avatar */}
                  <div className="profile-avatar-camera-badge">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </div>
                </div>

                <input
                  type="file"
                  ref={avatarFileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                  onChange={handleAvatarFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Tên hiển thị */}
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


              {/* --- THÔNG TIN CÁ NHÂN (GIỚI TÍNH & NGÀY SINH) --- */}
              <div className="profile-personal-section">
                <div className="profile-section-heading">Thông tin cá nhân</div>

                {/* Giới tính */}
                <div className="profile-gender-group">
                  <label className="profile-radio-label">
                    <input
                      type="radio"
                      name="gender"
                      value="nam"
                      checked={profileGender === 'nam'}
                      onChange={() => setProfileGender('nam')}
                      className="profile-radio-input"
                    />
                    <span className="profile-radio-custom"></span>
                    <span className="profile-radio-text">Nam</span>
                  </label>

                  <label className="profile-radio-label">
                    <input
                      type="radio"
                      name="gender"
                      value="nu"
                      checked={profileGender === 'nu'}
                      onChange={() => setProfileGender('nu')}
                      className="profile-radio-input"
                    />
                    <span className="profile-radio-custom"></span>
                    <span className="profile-radio-text">Nữ</span>
                  </label>
                </div>

                {/* Ngày sinh */}
                <div className="profile-dob-group">
                  <div className="profile-field-title">Ngày sinh</div>
                  <div className="profile-dob-row">
                    <CustomDobSelect
                      value={birthDay}
                      options={Array.from({ length: 31 }, (_, i) => {
                        const val = String(i + 1).padStart(2, '0')
                        return { value: val, label: val }
                      })}
                      onChange={(val) => setBirthDay(val)}
                      placeholder="Ngày"
                    />

                    <CustomDobSelect
                      value={birthMonth}
                      options={Array.from({ length: 12 }, (_, i) => {
                        const val = String(i + 1).padStart(2, '0')
                        return { value: val, label: val }
                      })}
                      onChange={(val) => setBirthMonth(val)}
                      placeholder="Tháng"
                    />

                    <CustomDobSelect
                      value={birthYear}
                      options={Array.from({ length: 85 }, (_, i) => {
                        const val = String(2026 - i)
                        return { value: val, label: val }
                      })}
                      onChange={(val) => setBirthYear(val)}
                      placeholder="Năm"
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <label>
                Bio
                <textarea
                  placeholder="Mô tả ngắn về bạn..."
                  value={profileBio}
                  maxLength={200}
                  rows={3}
                  onChange={(e) => setProfileBio(e.target.value)}
                />
                <small className="field-hint text-right">{profileBio.length}/200 ký tự</small>
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
                  {profileLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bảo mật tài khoản (Tách riêng từ nút Bảo mật trên menu) */}
      {showSecurityModal && (
        <div className="modal-overlay" onClick={() => setShowSecurityModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                  🔒
                </div>
                <div>
                  <h3>Bảo mật tài khoản</h3>

                </div>
              </div>
              <button
                className="modal-close-button"
                onClick={() => setShowSecurityModal(false)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {securityError && <div className="modal-alert error">{securityError}</div>}
            {securitySuccess && <div className="modal-alert success">{securitySuccess}</div>}

            <form onSubmit={handleSecurityChangePassword} className="profile-form">
              <label>
                Mật khẩu mới *
                <input
                  type="password"
                  placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              <label>
                Xác nhận mật khẩu mới *
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </label>

              <div className="modal-footer" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowSecurityModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={securityLoading || !newPassword || !confirmNewPassword}
                >
                  {securityLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cài đặt hệ thống (Giao diện Sáng / Tối / Hệ Thống) */}

      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-card tg-settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                  ⚙️
                </div>
                <div>
                  <h3>Cài đặt</h3>

                </div>
              </div>
              <button
                className="modal-close-button"
                onClick={() => setShowSettingsModal(false)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="settings-body">
              {/* Phần Giao diện */}
              <div className="settings-section">
                <div className="settings-section-title">
                  <span className="settings-section-icon">🎨</span>
                  <span>Giao diện</span>
                </div>

                <div className="settings-item">
                  <div className="settings-item-header">

                    <div className="settings-item-label">
                      {themeMode === 'light'
                        ? 'Đang áp dụng giao diện Sáng'
                        : themeMode === 'dark'
                          ? 'Đang áp dụng giao diện Tối'
                          : 'Tự động đồng bộ theo giao diện máy tính / điện thoại'}
                    </div>
                  </div>

                  {/* 3 lựa chọn: Sáng / Tối / Hệ Thống */}
                  <div className="theme-toggle-group">
                    <button
                      type="button"
                      className={`theme-option-btn ${themeMode === 'light' ? 'active' : ''}`}
                      onClick={() => handleThemeChange('light')}
                    >
                      <span className="theme-option-icon">☀️</span>
                      <span className="theme-option-text">Sáng</span>
                      {themeMode === 'light' && <span className="theme-check-icon">✓</span>}
                    </button>

                    <button
                      type="button"
                      className={`theme-option-btn ${themeMode === 'dark' ? 'active' : ''}`}
                      onClick={() => handleThemeChange('dark')}
                    >
                      <span className="theme-option-icon">🌙</span>
                      <span className="theme-option-text">Tối</span>
                      {themeMode === 'dark' && <span className="theme-check-icon">✓</span>}
                    </button>

                    <button
                      type="button"
                      className={`theme-option-btn ${themeMode === 'system' ? 'active' : ''}`}
                      onClick={() => handleThemeChange('system')}
                    >
                      <span className="theme-option-icon">💻</span>
                      <span className="theme-option-text">Hệ Thống</span>
                      {themeMode === 'system' && <span className="theme-check-icon">✓</span>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Phần Danh sách đã chặn */}
              <div className="settings-section" style={{ marginTop: 20 }}>
                <div className="settings-section-title">
                  <span className="settings-section-icon">🚫</span>
                  <span>Danh sách đã chặn</span>
                </div>

                <div className="settings-item">

                  {blockedUserIds.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>
                      Chưa có người dùng nào trong danh sách chặn.
                    </div>
                  ) : (
                    <div className="tg-blocked-users-list">
                      {blockedUserIds.map((bId) => {
                        const targetUser = friends.find((f) => String(f.id) === String(bId)) || {
                          id: bId,
                          display_name: 'Người dùng ' + String(bId).slice(0, 6),
                          username: 'user_' + String(bId).slice(0, 6),
                        }
                        const name = targetUser.display_name || targetUser.username
                        return (
                          <div className="tg-blocked-user-row" key={bId}>
                            <div className="tg-blocked-user-left">
                              <div className="tg-avatar sm">
                                {targetUser.avatar_url ? (
                                  <img src={targetUser.avatar_url} alt="" className="avatar-img" />
                                ) : (
                                  (name || 'U').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="tg-blocked-user-info">
                                <strong>{name}</strong>
                                <span>@{targetUser.username}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="tg-unblock-btn"
                              onClick={() => handleToggleBlockUser(targetUser)}
                            >
                              Bỏ chặn
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => setShowSettingsModal(false)}
              >
                Hoàn tất
              </button>
            </div>
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
                          (getFriendName(friend) || 'U').charAt(0).toUpperCase()
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

      {/* Modal Tạo nhóm mới (Gôm thành viên vào nhóm) */}
      {showCreateGroupModal && (
        <div className="modal-overlay" onClick={() => setShowCreateGroupModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon" style={{ background: 'rgba(135, 116, 225, 0.2)', color: '#8774e1' }}>
                  👥
                </div>
                <div>
                  <h3>Tạo nhóm chat mới</h3>

                </div>
              </div>
              <button className="modal-close-button" onClick={() => setShowCreateGroupModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {createGroupError && (
                <div className="modal-alert error" style={{ margin: 0 }}>
                  {createGroupError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                  Tên nhóm *
                </label>
                <input
                  type="text"
                  className="tg-msg-input"
                  style={{ width: '100%', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="Ví dụ: Team CloudChat, Hội Bạn Thân..."
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                  Chọn bạn bè vào nhóm ({selectedGroupMemberIds.length}/49)
                </label>
                <div
                  style={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  {friends.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12, padding: 16 }}>
                      Chưa có bạn bè nào để thêm. Bạn vẫn có thể tạo nhóm và thêm sau!
                    </div>
                  ) : (
                    friends.map((f) => {
                      const isSelected = selectedGroupMemberIds.includes(f.id)
                      return (
                        <div
                          key={f.id}
                          onClick={() => {
                            setSelectedGroupMemberIds((prev) => {
                              if (prev.includes(f.id)) {
                                return prev.filter((id) => id !== f.id)
                              }
                              if (prev.length >= 49) {
                                alert('Nhóm thường giới hạn tối đa 50 người (tính cả người tạo). Muốn nhiều hơn cần nâng cấp lên Cộng đồng.')
                                return prev
                              }
                              return [...prev, f.id]
                            })
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(135, 116, 225, 0.2)' : 'transparent',
                            border: isSelected ? '1px solid rgba(135, 116, 225, 0.4)' : '1px solid transparent',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="tg-avatar sm" style={{ width: 28, height: 28, fontSize: 12 }}>
                              {f.avatar_url ? (
                                <img src={f.avatar_url} alt="" className="avatar-img" />
                              ) : (
                                getFriendInitials(getFriendName(f))
                              )}
                            </div>
                            <span style={{ fontSize: 13, color: '#f1f5f9' }}>{getFriendName(f)}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => { }}
                            style={{ cursor: 'pointer' }}
                          />
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowCreateGroupModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={createGroupLoading || !groupNameInput.trim()}
                >
                  {createGroupLoading ? 'Đang tạo...' : 'Tạo nhóm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm thành viên vào nhóm hiện tại */}
      {showAddGroupMemberModal && (
        <div className="modal-overlay" onClick={() => setShowAddGroupMemberModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                  ➕
                </div>
                <div>
                  <h3>Thêm thành viên</h3>

                </div>
              </div>
              <button className="modal-close-button" onClick={() => setShowAddGroupMemberModal(false)}>
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {addMemberError && (
                <div className="modal-alert error" style={{ margin: 0 }}>
                  {addMemberError}
                </div>
              )}

              <div
                style={{
                  maxHeight: 240,
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {(() => {
                  const currentMemberIds = new Set(
                    (groupDetailData?.members || []).map((m) => m.id)
                  )
                  const candidates = friends.filter((f) => !currentMemberIds.has(f.id))

                  if (candidates.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12, padding: 20 }}>
                        Tất cả bạn bè của bạn đã có mặt trong nhóm này rồi!
                      </div>
                    )
                  }

                  return candidates.map((f) => {
                    const isSelected = addMemberSelectedIds.includes(f.id)
                    return (
                      <div
                        key={f.id}
                        onClick={() => {
                          setAddMemberSelectedIds((prev) => {
                            if (prev.includes(f.id)) {
                              return prev.filter((id) => id !== f.id)
                            }
                            return [...prev, f.id]
                          })
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                          border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="tg-avatar sm" style={{ width: 28, height: 28, fontSize: 12 }}>
                            {f.avatar_url ? (
                              <img src={f.avatar_url} alt="" className="avatar-img" />
                            ) : (
                              getFriendInitials(getFriendName(f))
                            )}
                          </div>
                          <span style={{ fontSize: 13, color: '#f1f5f9' }}>{getFriendName(f)}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => { }}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    )
                  })
                })()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAddGroupMemberModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={addMemberLoading || addMemberSelectedIds.length === 0}
                  onClick={handleAddMembersToGroup}
                >
                  {addMemberLoading ? 'Đang thêm...' : `Thêm (${addMemberSelectedIds.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hộp thoại xác nhận xoá trò chuyện Khớp chuẩn 100% Ảnh */}
      {chatToDeleteHistory && (
        <div
          className="tg-confirm-modal-overlay"
          onClick={() => {
            if (!isDeletingChatHistory) setChatToDeleteHistory(null)
          }}
        >
          <div
            className="tg-confirm-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="tg-confirm-modal-header">
              <h3 className="tg-confirm-modal-title">Xác nhận</h3>
              <button
                type="button"
                className="tg-confirm-modal-close"
                onClick={() => {
                  if (!isDeletingChatHistory) setChatToDeleteHistory(null)
                }}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="tg-confirm-modal-body">
              <p>Toàn bộ nội dung trò chuyện sẽ bị xóa vĩnh viễn.</p>
              <p>Bạn có chắc chắn muốn xóa?</p>
            </div>

            {/* Footer */}
            <div className="tg-confirm-modal-footer">
              <button
                type="button"
                className="tg-confirm-btn-cancel"
                onClick={() => setChatToDeleteHistory(null)}
                disabled={isDeletingChatHistory}
              >
                Không
              </button>
              <button
                type="button"
                className="tg-confirm-btn-delete"
                onClick={confirmClearChatHistory}
                disabled={isDeletingChatHistory}
              >
                {isDeletingChatHistory ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hộp thoại xác nhận Chặn người dùng Giống chuẩn 100% Xác nhận xoá trò chuyện */}
      {userToBlock && (
        <div
          className="tg-confirm-modal-overlay"
          onClick={() => setUserToBlock(null)}
        >
          <div
            className="tg-confirm-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="tg-confirm-modal-header">
              <h3 className="tg-confirm-modal-title">Xác nhận chặn</h3>
              <button
                type="button"
                className="tg-confirm-modal-close"
                onClick={() => setUserToBlock(null)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="tg-confirm-modal-body">
              <p>Người này sẽ không thể gửi tin nhắn hoặc gọi điện cho bạn nữa.</p>
              <p>Bạn có chắc chắn muốn chặn <strong>{getFriendName(userToBlock)}</strong>?</p>
            </div>

            {/* Footer */}
            <div className="tg-confirm-modal-footer">
              <button
                type="button"
                className="tg-confirm-btn-cancel"
                onClick={() => setUserToBlock(null)}
              >
                Không
              </button>
              <button
                type="button"
                className="tg-confirm-btn-delete"
                onClick={confirmBlockUser}
              >
                Chặn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi tên nhóm (Nhóm trưởng) */}
      {showRenameGroupModal && (
        <div className="tg-confirm-modal-overlay" onClick={() => !renameGroupLoading && setShowRenameGroupModal(false)}>
          <div className="tg-confirm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="tg-confirm-modal-header">
              <h3 className="tg-confirm-modal-title">Đổi tên nhóm</h3>
              <button
                type="button"
                className="tg-confirm-modal-close"
                onClick={() => !renameGroupLoading && setShowRenameGroupModal(false)}
                title="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="tg-confirm-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--tg-text-secondary)' }}>
                Nhập tên mới cho nhóm trò chuyện của bạn:
              </p>
              <input
                type="text"
                className="fpt-input"
                value={renameGroupNameInput}
                onChange={(e) => setRenameGroupNameInput(e.target.value)}
                placeholder="Tên nhóm mới..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleRenameGroup()
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--tg-border, rgba(255,255,255,0.15))',
                  background: 'var(--tg-input-bg, rgba(0,0,0,0.2))',
                  color: 'var(--tg-text-primary, #ffffff)',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div className="tg-confirm-modal-footer">
              <button
                type="button"
                className="tg-confirm-btn-cancel"
                onClick={() => setShowRenameGroupModal(false)}
                disabled={renameGroupLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="tg-confirm-btn-delete"
                style={{ background: 'var(--tg-primary, #8774e1)', borderColor: 'var(--tg-primary, #8774e1)' }}
                onClick={handleRenameGroup}
                disabled={renameGroupLoading || !renameGroupNameInput.trim()}
              >
                {renameGroupLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận giải tán nhóm (Nhóm trưởng) */}
      {showDisbandConfirmModal && (
        <div className="tg-confirm-modal-overlay" onClick={() => !disbandGroupLoading && setShowDisbandConfirmModal(false)}>
          <div className="tg-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tg-confirm-modal-header">
              <h3 className="tg-confirm-modal-title">Xác nhận giải tán nhóm</h3>
              <button
                type="button"
                className="tg-confirm-modal-close"
                onClick={() => !disbandGroupLoading && setShowDisbandConfirmModal(false)}
                title="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="tg-confirm-modal-body">
              <p>Tất cả tin nhắn, hình ảnh và thành viên trong nhóm sẽ bị xóa vĩnh viễn.</p>
              <p>Hành động này không thể hoàn tác. Bạn có chắc chắn muốn giải tán nhóm?</p>
            </div>
            <div className="tg-confirm-modal-footer">
              <button
                type="button"
                className="tg-confirm-btn-cancel"
                onClick={() => setShowDisbandConfirmModal(false)}
                disabled={disbandGroupLoading}
              >
                Không
              </button>
              <button
                type="button"
                className="tg-confirm-btn-delete"
                onClick={handleDisbandGroup}
                disabled={disbandGroupLoading}
              >
                {disbandGroupLoading ? 'Đang giải tán...' : 'Giải tán nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận rời khỏi nhóm (Thành viên) */}
      {showLeaveGroupConfirmModal && (
        <div className="tg-confirm-modal-overlay" onClick={() => !leaveGroupLoading && setShowLeaveGroupConfirmModal(false)}>
          <div className="tg-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tg-confirm-modal-header">
              <h3 className="tg-confirm-modal-title">Xác nhận rời khỏi nhóm</h3>
              <button
                type="button"
                className="tg-confirm-modal-close"
                onClick={() => !leaveGroupLoading && setShowLeaveGroupConfirmModal(false)}
                title="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="tg-confirm-modal-body">
              <p>Bạn sẽ không còn nhận được tin nhắn và thông báo từ nhóm này.</p>
              <p>Bạn có chắc chắn muốn rời khỏi nhóm?</p>
            </div>
            <div className="tg-confirm-modal-footer">
              <button
                type="button"
                className="tg-confirm-btn-cancel"
                onClick={() => setShowLeaveGroupConfirmModal(false)}
                disabled={leaveGroupLoading}
              >
                Không
              </button>
              <button
                type="button"
                className="tg-confirm-btn-delete"
                onClick={handleLeaveGroup}
                disabled={leaveGroupLoading}
              >
                {leaveGroupLoading ? 'Đang rời...' : 'Rời khỏi nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận loại thành viên khỏi nhóm */}
      {memberToKickModal && (
        <div className="tg-confirm-modal-overlay" onClick={() => setMemberToKickModal(null)}>
          <div className="tg-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tg-confirm-modal-header">
              <h3 className="tg-confirm-modal-title">Xác nhận loại thành viên</h3>
              <button
                type="button"
                className="tg-confirm-modal-close"
                onClick={() => setMemberToKickModal(null)}
                title="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="tg-confirm-modal-body">
              <p>
                Bạn có chắc chắn muốn loại <strong>{memberToKickModal.display_name || memberToKickModal.username}</strong> khỏi nhóm trò chuyện này không?
              </p>
            </div>
            <div className="tg-confirm-modal-footer">
              <button
                type="button"
                className="tg-confirm-btn-cancel"
                onClick={() => setMemberToKickModal(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="tg-confirm-btn-delete"
                onClick={() => handleKickMember(memberToKickModal)}
              >
                Loại thành viên
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



      {/* Modal Chỉnh sửa / Cắt ảnh đại diện trước khi lưu */}
      {cropImageSource && (
        <AvatarCropModal
          imageSource={cropImageSource}
          onApply={handleApplyCroppedAvatar}
          onCancel={() => setCropImageSource(null)}
        />
      )}
    </div>
  )
}

export default App
