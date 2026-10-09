import { useEffect, useRef, useState, useMemo } from 'react'
import './App.css'

const API_BASE = 'http://localhost:8787'

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Luna',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Leo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Milo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Chloe',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Jack',
]

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
    } catch {}
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

function App() {
  const [page, setPage] = useState('loading')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [registerDisplayName, setRegisterDisplayName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
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

  // Telegram Hamburger Menu State (Image 2)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  // Telegram Folders Tab State (Image 1)
  const [folderTab, setFolderTab] = useState('all') // 'all' | 'friends'

  // Contacts Modal State
  const [showContactsModal, setShowContactsModal] = useState(false)
  const [friendRequests, setFriendRequests] = useState([])

  // Add Friend Modal State
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [searchFriendInput, setSearchFriendInput] = useState('')
  const [searchFriendResult, setSearchFriendResult] = useState(null)
  const [searchFriendError, setSearchFriendError] = useState('')
  const [searchFriendSuccess, setSearchFriendSuccess] = useState('')
  const [searchFriendLoading, setSearchFriendLoading] = useState(false)

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
  })
  const [previewMediaUrl, setPreviewMediaUrl] = useState(null)
  const fileInputRef = useRef(null)

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

  // Reset in-chat search & info panel when activeChat changes
  useEffect(() => {
    setShowChatSearch(false)
    setChatSearchQuery('')
    setChatSearchIndex(0)
    setEditingNickname(false)
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
            } catch {}

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
            }),
          }
        )

        const data = await response.json()
        if (data.success && data.message) {
          setMessages((current) => [...current, data.message])
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
              body: JSON.stringify({ content }),
            }
          )
          const data = await response.json()
          if (data.success && data.message) {
            setMessages((current) => [...current, data.message])
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
            maxHeight: 280,
            borderRadius: 12,
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
        if (
          prev.length === incoming.length &&
          prev.length > 0 &&
          prev[prev.length - 1]?.id === incoming[incoming.length - 1]?.id &&
          prev[prev.length - 1]?.is_read === incoming[incoming.length - 1]?.is_read
        ) {
          return prev
        }
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

    const interval = setInterval(() => {
      loadFriends()
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
      }

      setMessage('')
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
      setError('Đăng ký thành công. Hãy đăng nhập.')
    } catch {
      setError('Không thể kết nối đến CloudChat Backend')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenProfileModal = () => {
    setProfileDisplayName(currentUser?.display_name || '')
    setProfileBio(currentUser?.bio || '')
    setProfileAvatarUrl(currentUser?.avatar_url || '')
    setProfileTab('info')
    setProfileError('')
    setProfileSuccess('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setShowProfileModal(true)
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
      }
    } catch {
      setSearchFriendError('Không thể kết nối đến CloudChat Backend')
    } finally {
      setSearchFriendLoading(false)
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
        <div className="auth-card">
          <div className="brand">
            <div className="brand-icon">C</div>
            <div>
              <h1>CloudChat</h1>
              <p>Đang kết nối...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (page === 'login') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="brand">
            <div className="brand-icon">C</div>
            <div>
              <h1>CloudChat</h1>
              <p>Chat trên nền tảng Cloud</p>
            </div>
          </div>

          <div className="auth-heading">
            <h2>Đăng nhập</h2>
            <p>Đăng nhập để tiếp tục sử dụng CloudChat</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <label>
              Username
              <input
                type="text"
                placeholder="Nhập username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>

            <label>
              Mật khẩu
              <input
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="auth-footer">
            <span>Chưa có tài khoản?</span>
            <button type="button" onClick={() => {
              setError('')
              setPage('register')
            }}>
              Đăng ký
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
          <div className="brand">
            <div className="brand-icon">C</div>
            <div>
              <h1>CloudChat</h1>
              <p>Chat trên nền tảng Cloud</p>
            </div>
          </div>

          <div className="auth-heading">
            <h2>Tạo tài khoản</h2>
            <p>Tham gia CloudChat ngay hôm nay</p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <label>
              Tên hiển thị (Tùy chọn)
              <input
                type="text"
                placeholder="Ví dụ: Duy Khang"
                value={registerDisplayName}
                onChange={(event) => setRegisterDisplayName(event.target.value)}
              />
            </label>

            <label>
              Username
              <input
                type="text"
                placeholder="Nhập username (3-30 ký tự)"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>

            <label>
              Mật khẩu
              <input
                type="password"
                placeholder="Ít nhất 6 ký tự"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label>
              Xác nhận mật khẩu
              <input
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </form>

          <div className="auth-footer">
            <span>Đã có tài khoản?</span>
            <button type="button" onClick={() => {
              setError('')
              setConfirmPassword('')
              setRegisterDisplayName('')
              setPage('login')
            }}>
              Đăng nhập
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
                  title="Xem hồ sơ cá nhân"
                >
                  <div className="tg-avatar sm">
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
                  <span>Settings</span>
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

        {/* Telegram Folders / Tabs Bar (Image 1) */}
        <div className="tg-folders-bar">
          <button
            className={`tg-folder-tab ${folderTab === 'all' ? 'active' : ''}`}
            onClick={() => setFolderTab('all')}
          >
            <span>All</span>
            <span className="tg-folder-badge">{friends.length}</span>
          </button>
          <button
            className={`tg-folder-tab ${folderTab === 'friends' ? 'active' : ''}`}
            onClick={() => setFolderTab('friends')}
          >
            <span>Bạn bè</span>
          </button>
        </div>

        {/* Telegram Chat List */}
        <div className="tg-chat-list">
          {filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => (
              <button
                className={`tg-chat-item ${activeChat?.id === friend.id ? 'active' : ''}`}
                key={friend.id}
                onClick={() => setActiveChat(friend)}
              >
                <div className="tg-avatar">
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
                    getFriendName(friend).charAt(0).toUpperCase()
                  )}
                  <div className="tg-online-dot" />
                </div>

                <div className="tg-chat-info">
                  <div className="tg-chat-top">
                    <span className="tg-chat-name">
                      {getFriendName(friend)}
                    </span>
                    <span className="tg-chat-time">
                      {friend.created_at ? formatTime(friend.created_at) : ''}
                    </span>
                  </div>
                  <div className="tg-chat-bottom">
                    <span className="tg-chat-preview">
                      {friend.bio || 'Nhấn để mở cuộc trò chuyện'}
                    </span>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="tg-empty-list">
              {friends.length === 0 ? (
                <div>
                  <p>Chưa có cuộc trò chuyện nào.</p>
                  <button
                    className="secondary-button"
                    style={{ marginTop: 10, fontSize: 12, padding: '7px 14px' }}
                    onClick={() => setShowAddFriendModal(true)}
                  >
                    + Thêm bạn bè để bắt đầu
                  </button>
                </div>
              ) : (
                <p>Không tìm thấy kết quả nào phù hợp.</p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Telegram Right Main Area: When no chat is clicked, shows wallpaper with centered pill */}
      <main className="tg-main-area">
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
                  <div className="tg-online-dot" />
                </div>
                <div className="tg-header-details">
                  <strong>{getFriendName(activeChat)}</strong>
                  <span>{activeChat.bio ? `${activeChat.bio}` : 'online'}</span>
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
            <div className="tg-messages-scroll">
              <div className="tg-bubble-date">Hôm nay</div>

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
                messages.map((item) => {
                  const isMine = Boolean(
                    currentUser?.id != null &&
                    String(item.sender_id) === String(currentUser.id)
                  )
                  const isCurrentMatch =
                    matchingMessageIds.length > 0 &&
                    matchingMessageIds[chatSearchIndex] === item.id

                  return (
                    <div
                      className={`tg-msg-row ${isMine ? 'mine' : 'theirs'}`}
                      id={`msg-${item.id}`}
                      key={item.id}
                    >
                      <div className={`tg-msg-bubble ${isCurrentMatch ? 'search-active-bubble' : ''}`}>
                        <div className="tg-msg-text">
                          {renderMessageContent(item.content, chatSearchQuery)}
                        </div>
                        <div className="tg-msg-meta">
                          <small>{formatTime(item.created_at)}</small>
                          {isMine && <span className="tg-msg-check">✓✓</span>}
                        </div>
                      </div>
                    </div>
                  )
                })
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
          <div className="tg-no-chat-selected">
            <div className="tg-no-chat-badge">
              Chọn một đoạn chat để bắt đầu nhắn tin
            </div>
          </div>
        )}
      </main>

      {/* Thông tin hội thoại Panel (Khớp với Ảnh 1 & Ảnh 2) */}
      {activeChat && showChatInfo && (
        <aside className="tg-info-panel">
          {/* Header */}
          <div className="tg-info-header">
            <h3>Thông tin hội thoại</h3>
            <button
              className="tg-icon-btn"
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

              {activeChat.bio && <p className="tg-info-bio">{activeChat.bio}</p>}
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
                        <a
                          href={file.url || '#'}
                          download={file.name}
                          className="tg-file-row"
                          key={idx}
                          title={`Bấm để tải về: ${file.name}`}
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          <div className="tg-file-icon">📄</div>
                          <div className="tg-file-info">
                            <strong>{file.name}</strong>
                            <span>{file.size} • {file.date}</span>
                          </div>
                        </a>
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
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                              </svg>
                            ) : link.iconType === 'meet' ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="2" y="5" width="13" height="14" rx="2" fill="#ffbb00"/>
                                <polygon points="17 9 22 6 22 18 17 15" fill="#f44336"/>
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
      )}

      {/* Lightbox Preview Modal cho Ảnh / Video */}
      {previewMediaUrl && (
        <div className="tg-lightbox-overlay" onClick={() => setPreviewMediaUrl(null)}>
          <div className="tg-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="tg-lightbox-close"
              onClick={() => setPreviewMediaUrl(null)}
              title="Đóng xem ảnh"
            >
              ✕
            </button>
            <img src={previewMediaUrl} alt="Preview" className="tg-lightbox-img" />
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
                        <div className="tg-online-dot" />
                      </div>
                      <div>
                        <strong>{friend.display_name || friend.username}</strong>
                        <span>@{friend.username}</span>
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

      {/* Add Friend Modal (Thêm tài khoản / bạn bè) */}
      {showAddFriendModal && (
        <div className="modal-overlay" onClick={() => setShowAddFriendModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon">➕</div>
                <div>
                  <h3>Thêm bạn bè / Tài khoản</h3>
                  <p>Tìm kiếm người dùng CloudChat theo username</p>
                </div>
              </div>
              <button
                className="modal-close-button"
                onClick={() => {
                  setShowAddFriendModal(false)
                  setSearchFriendResult(null)
                  setSearchFriendError('')
                  setSearchFriendSuccess('')
                }}
                title="Đóng"
              >
                ✕
              </button>
            </div>

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
              <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: '#0d1017', border: '1px solid #1e2432', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="tg-avatar sm">
                    {searchFriendResult.avatar_url ? (
                      <img src={searchFriendResult.avatar_url} alt="" className="avatar-img" />
                    ) : (
                      (searchFriendResult.display_name || searchFriendResult.username).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: '#f1f5f9', fontSize: 14 }}>
                      {searchFriendResult.display_name || searchFriendResult.username}
                    </strong>
                    <span style={{ display: 'block', color: '#6d7889', fontSize: 11 }}>
                      @{searchFriendResult.username}
                    </span>
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

            <div className="modal-footer" style={{ marginTop: 24 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowAddFriendModal(false)
                  setSearchFriendResult(null)
                  setSearchFriendError('')
                  setSearchFriendSuccess('')
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
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
                <div className="avatar-section">
                  <div className="avatar large-preview">
                    {profileAvatarUrl ? (
                      <img
                        src={profileAvatarUrl}
                        alt="Avatar preview"
                        className="avatar-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      (profileDisplayName || currentUser?.username || 'K').charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="avatar-picker">
                    <span className="picker-label">Chọn nhanh avatar đại diện:</span>
                    <div className="preset-avatars">
                      {PRESET_AVATARS.map((url, idx) => (
                        <button
                          type="button"
                          key={idx}
                          className={`preset-avatar-btn ${profileAvatarUrl === url ? 'selected' : ''}`}
                          onClick={() => setProfileAvatarUrl(url)}
                          title={`Avatar mẫu ${idx + 1}`}
                        >
                          <img src={url} alt={`Preset ${idx + 1}`} />
                        </button>
                      ))}
                      {profileAvatarUrl && (
                        <button
                          type="button"
                          className="preset-avatar-clear"
                          onClick={() => setProfileAvatarUrl('')}
                          title="Xóa avatar (dùng chữ cái)"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <label>
                  Link ảnh avatar (URL)
                  <input
                    type="url"
                    placeholder="https://... hoặc chọn ảnh mẫu ở trên"
                    value={profileAvatarUrl}
                    onChange={(e) => setProfileAvatarUrl(e.target.value)}
                  />
                </label>

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
    </div>
  )
}

export default App
