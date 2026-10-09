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

  // Extract media, files and links from messages + seeded items matching Image 2
  const { chatMediaItems, chatFileItems, chatLinkItems } = useMemo(() => {
    const defaultMedia = [
      { id: 'm1', type: 'image', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop' },
      { id: 'm2', type: 'image', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop' },
      { id: 'm3', type: 'image', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop' },
      { id: 'm4', type: 'image', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=400&fit=crop' },
      { id: 'm5', type: 'image', url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&h=400&fit=crop' },
      { id: 'm6', type: 'image', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=400&fit=crop' },
      { id: 'm7', type: 'image', url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&h=400&fit=crop' },
      { id: 'm8', type: 'image', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=400&fit=crop' },
    ]

    const defaultLinks = [
      {
        url: 'https://github.com/duykhang020806/CloudChat',
        title: 'GitHub - duykhang020806/CloudChat: Web application chat on cloud',
        domain: 'github.com',
        iconType: 'github',
        date: 'Hôm nay',
      },
      {
        url: 'https://meet.google.com/abc-defg-hij',
        title: 'Meet',
        domain: 'meet.google.com',
        iconType: 'meet',
        date: 'Hôm nay',
      },
      {
        url: 'http://localhost:8787/api/auth/login',
        title: 'http://localhost:8787/api/auth/login',
        domain: 'localhost',
        iconType: 'generic',
        date: 'Hôm qua',
      },
    ]

    const foundMedia = []
    const foundFiles = []
    const foundLinks = []

    messages.forEach((m) => {
      if (!m.content) return
      const text = m.content

      // Check media
      const imgMatch = text.match(/(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg))|(data:image\/[a-z]+;base64,[^\s]+)/gi)
      if (imgMatch) {
        imgMatch.forEach((url) => {
          foundMedia.unshift({ id: m.id, type: 'image', url })
        })
      }

      // Check video
      const vidMatch = text.match(/https?:\/\/[^\s]+?\.(?:mp4|webm|mov|ogg)/gi)
      if (vidMatch) {
        vidMatch.forEach((url) => {
          foundMedia.unshift({ id: m.id, type: 'video', url })
        })
      }

      // Check files
      const fileMatch = text.match(/https?:\/\/[^\s]+?\.(?:pdf|docx?|xlsx?|zip|rar|txt|csv)/gi)
      if (fileMatch || m.type === 'file') {
        foundFiles.unshift({
          id: m.id,
          name: text.split('/').pop() || 'Tài liệu chia sẻ',
          size: '1.2 MB',
          date: formatTime(m.created_at) || 'Hôm nay',
        })
      }

      // Check general links
      const linkMatch = text.match(/https?:\/\/[^\s]+/gi)
      if (linkMatch) {
        linkMatch.forEach((url) => {
          let domain = 'web'
          let iconType = 'generic'
          try {
            const u = new URL(url)
            domain = u.hostname
            if (domain.includes('github.com')) iconType = 'github'
            else if (domain.includes('meet.google.com')) iconType = 'meet'
          } catch {}

          foundLinks.unshift({
            url,
            title: url,
            domain,
            iconType,
            date: formatTime(m.created_at) || 'Hôm nay',
          })
        })
      }
    })

    return {
      chatMediaItems: foundMedia.length > 0 ? foundMedia : defaultMedia,
      chatFileItems: foundFiles,
      chatLinkItems: foundLinks.length > 0 ? foundLinks : defaultLinks,
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

  // Render message content with highlights and clickable links
  const renderMessageContent = (content, highlightQuery) => {
    if (!content) return null

    // Check if whole content is image
    const isImage =
      content.startsWith('data:image/') ||
      /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(content)
    if (isImage) {
      return (
        <img
          src={content}
          alt="attachment"
          style={{
            maxWidth: '100%',
            maxHeight: 280,
            borderRadius: 12,
            display: 'block',
            cursor: 'pointer',
          }}
          onClick={() => setPreviewMediaUrl(content)}
        />
      )
    }

    // Check if whole content is video
    const isVideo =
      content.startsWith('data:video/') ||
      /\.(mp4|webm|mov|ogg)($|\?)/i.test(content)
    if (isVideo) {
      return (
        <video
          controls
          src={content}
          style={{ maxWidth: '100%', borderRadius: 12, display: 'block' }}
        />
      )
    }

    // If search highlight query is active
    const q = highlightQuery.trim()
    if (q) {
      const parts = content.split(
        new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      )
      return (
        <span>
          {parts.map((part, index) =>
            part.toLowerCase() === q.toLowerCase() ? (
              <mark key={index} className="search-highlight">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </span>
      )
    }

    // Make links clickable
    const urlRegex = /(https?:\/\/[^\s]+)/gi
    const parts = content.split(urlRegex)
    return (
      <span>
        {parts.map((part, index) =>
          urlRegex.test(part) ? (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#93c5fd', textDecoration: 'underline' }}
            >
              {part}
            </a>
          ) : (
            part
          )
        )}
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
        if (current && nextFriends.some((friend) => friend.id === current.id)) {
          return current
        }

        // Do not auto-select: user must click on a chat to open it
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
          prev[prev.length - 1]?.id === incoming[incoming.length - 1]?.id
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

  const formatDate = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
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

  const formatTime = (value) => {
    if (!value) return ''

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })
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

                {/* + Add Account */}
                <button
                  className="tg-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    setShowAddFriendModal(true)
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </span>
                  <span>Add Account</span>
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
                  <span>My Profile</span>
                </button>

                {/* 🔖 Saved Messages */}
                <button
                  className="tg-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    alert('Saved Messages: Không gian lưu trữ đám mây và tin nhắn cá nhân của bạn trên CloudChat!')
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </span>
                  <span>Saved Messages</span>
                </button>

                {/* 👥 Contacts */}
                <button
                  className="tg-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    loadFriendRequests()
                    setShowContactsModal(true)
                  }}
                >
                  <span className="tg-menu-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </span>
                  <span>Contacts</span>
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
                  <span>Log Out</span>
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
                    (friend.display_name || friend.username).charAt(0).toUpperCase()
                  )}
                  <div className="tg-online-dot" />
                </div>

                <div className="tg-chat-info">
                  <div className="tg-chat-top">
                    <span className="tg-chat-name">
                      {friend.display_name || friend.username}
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
              <div className="tg-chat-header-left">
                <button
                  className="tg-icon-btn tg-back-btn"
                  onClick={() => setActiveChat(null)}
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
                    (activeChat.display_name || activeChat.username).charAt(0).toUpperCase()
                  )}
                  <div className="tg-online-dot" />
                </div>
                <div className="tg-header-details">
                  <strong>{activeChat.display_name || activeChat.username}</strong>
                  <span>{activeChat.bio ? `${activeChat.bio}` : 'online'}</span>
                </div>
              </div>

              <div className="tg-header-actions">
                <button className="tg-icon-btn" title="Tìm kiếm tin nhắn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
                <button
                  className="tg-icon-btn"
                  title="Thông tin người dùng"
                  onClick={handleOpenProfileModal}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </button>
              </div>
            </header>

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
                      (activeChat.display_name || activeChat.username).charAt(0).toUpperCase()
                    )}
                  </div>
                  <h3>{activeChat.display_name || activeChat.username}</h3>
                  <p>Chưa có tin nhắn nào ở đây. Hãy gửi lời chào đầu tiên!</p>
                </div>
              ) : (
                messages.map((item) => {
                  const isMine = Boolean(
                    currentUser?.id != null &&
                    String(item.sender_id) === String(currentUser.id)
                  )

                  return (
                    <div
                      className={`tg-msg-row ${isMine ? 'mine' : 'theirs'}`}
                      key={item.id}
                    >
                      <div className="tg-msg-bubble">
                        <span className="tg-msg-text">{item.content}</span>
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

            {/* Telegram Message Input Pill */}
            <div className="tg-input-area">
              <button className="tg-icon-btn tg-attach-btn" title="Đính kèm tệp">
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
    </div>
  )
}

export default App
