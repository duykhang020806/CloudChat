import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:8787'

function App() {
  const [page, setPage] = useState('loading')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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

        return nextFriends[0]
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

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
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
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || 'Đăng ký thất bại')
        return
      }

      setUsername('')
      setPassword('')
      setPage('login')
      setError('Đăng ký thành công. Hãy đăng nhập.')
    } catch {
      setError('Không thể kết nối đến CloudChat Backend')
    } finally {
      setLoading(false)
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

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(search.toLowerCase())
  )

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
                placeholder="Ít nhất 6 ký tự"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
    <div className="chat-app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand compact">
            <div className="brand-icon">C</div>
            <div>
              <h1>CloudChat</h1>
              <span>Online</span>
            </div>
          </div>

          <button className="icon-button" title="Tạo cuộc trò chuyện">
            +
          </button>
        </div>

        <div className="search-box">
          <span>⌕</span>
          <input
            type="text"
            placeholder="Tìm kiếm bạn bè"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="sidebar-section-title">
          <span>Cuộc trò chuyện</span>
          <span>{friends.length}</span>
        </div>

        <div className="chat-list">
          {filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => (
              <button
                className={`chat-item ${
                  activeChat?.id === friend.id ? 'active' : ''
                }`}
                key={friend.id}
                onClick={() => setActiveChat(friend)}
              >
                <div className="avatar">
                  {friend.username.charAt(0).toUpperCase()}
                </div>

                <div className="chat-info">
                  <div className="chat-name-row">
                    <strong>{friend.username}</strong>
                  </div>
                  <p>Nhấn để mở cuộc trò chuyện</p>
                </div>
              </button>
            ))
          ) : (
            <div className="empty-chat-list">
              {friends.length === 0
                ? 'Chưa có bạn bè. Hãy thêm bạn trước.'
                : 'Không tìm thấy người dùng.'}
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar small">
              {(currentUser?.username || 'K').charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{currentUser?.username || 'Khang'}</strong>
              <span>@{currentUser?.username || 'khang'}</span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
            title="Đăng xuất"
          >
            ↪
          </button>
        </div>
      </aside>

      <main className="chat-window">
        {activeChat ? (
          <>
            <header className="chat-header">
              <div className="avatar">
                {activeChat.username.charAt(0).toUpperCase()}
              </div>

              <div className="chat-header-info">
                <strong>{activeChat.username}</strong>
                <span>Cuộc trò chuyện 1-1</span>
              </div>

              <div className="chat-actions">
                <button title="Tìm kiếm">⌕</button>
                <button title="Thông tin">ⓘ</button>
              </div>
            </header>

            <section className="messages">
              <div className="conversation-date">Hôm nay</div>

              {chatLoading ? (
                <div className="empty-messages">
                  Đang tải tin nhắn...
                </div>
              ) : messages.length === 0 ? (
                <div className="welcome-message">
                  <div className="large-avatar">
                    {activeChat.username.charAt(0).toUpperCase()}
                  </div>
                  <h3>{activeChat.username}</h3>
                  <p>
                    Đây là cuộc trò chuyện 1-1. Hãy gửi tin nhắn đầu tiên.
                  </p>
                </div>
              ) : (
                messages.map((item) => {
                  const isMine = Boolean(
                    currentUser?.id != null &&
                    String(item.sender_id) === String(currentUser.id)
                  )

                  return (
                    <div
                      className={`message-row ${isMine ? 'mine' : ''}`}
                      key={item.id}
                    >
                      <div className="message-bubble">
                        <span>{item.content}</span>
                        <small>{formatTime(item.created_at)}</small>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </section>

            <div className="message-input-area">
              <button className="attachment-button" title="Gửi file">
                +
              </button>

              <input
                type="text"
                placeholder="Nhập tin nhắn..."
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
                className="send-button"
                onClick={handleSend}
                disabled={!message.trim() || chatLoading}
                title="Gửi"
              >
                ➤
              </button>
            </div>
          </>
        ) : (
          <div className="empty-chat">
            <div className="large-avatar">C</div>
            <h2>CloudChat</h2>
            <p>Chọn một người bạn để bắt đầu trò chuyện.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
