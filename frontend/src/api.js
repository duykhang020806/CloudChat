import { io } from 'socket.io-client'

// Địa chỉ Application Load Balancer trên AWS (Tự động tránh lỗi Mixed Content trên HTTPS)
const rawApiUrl = import.meta.env.VITE_API_URL || ''
export const API_BASE_URL =
  typeof window !== 'undefined' && window.location.protocol === 'https:' && (rawApiUrl.startsWith('http://') || !rawApiUrl)
    ? '' // Chạy qua Cloudflare Worker Reverse Proxy trên cùng domain HTTPS để tránh bị trình duyệt chặn
    : (rawApiUrl || 'http://alb-cloudchat-1765117084.us-east-1.elb.amazonaws.com')

// Quản lý Token trong localStorage
export const getToken = () => {
  try {
    return localStorage.getItem('cloudchat_token') || ''
  } catch {
    return ''
  }
}

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem('cloudchat_token', token)
    else localStorage.removeItem('cloudchat_token')
  } catch { }
}

// Hàm gửi request HTTP tổng quát có gắn kèm Bearer JWT Token
export const request = async (endpoint, options = {}) => {
  const token = getToken()
  const headers = {
    ...(options.headers || {}),
  }

  // Nếu không phải là FormData thì tự động gán Content-Type: application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const response = await fetch(url, {
    ...options,
    headers,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Lỗi HTTP ${response.status}`
    throw new Error(errorMsg)
  }

  return data
}

// ============================================================================
// 1. DỊCH VỤ XÁC THỰC (AUTH API)
// ============================================================================
export const authApi = {
  login: async (login, password) => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    })
    if (res.token) setToken(res.token)
    return res
  },

  googleLogin: async (authPayload) => {
    const payload = typeof authPayload === 'string' ? { credential: authPayload } : authPayload
    const res = await request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (res.token) setToken(res.token)
    return res
  },

  register: async (email, username, password, display_name) => {
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, display_name }),
    })
    if (res.token) setToken(res.token)
    return res
  },

  getMe: async () => {
    return await request('/api/auth/me')
  },

  updateProfile: async (profileData) => {
    return await request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  },

  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' })
    } catch { }
    setToken(null)
    disconnectSocket()
  },

  searchUsers: async (query) => {
    return await request(`/api/auth/search?q=${encodeURIComponent(query)}`)
  },

  getUsersByIds: async (ids) => {
    return await request('/api/auth/by-ids', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  getProfilesByIds: async (ids) => {
    return await request('/api/auth/by-ids', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  heartbeat: async () => {
    return await request('/api/auth/heartbeat', { method: 'POST' }).catch(() => {})
  },
}

// ============================================================================
// 2. DỊCH VỤ BẠN BÈ (FRIENDS API)
// ============================================================================
export const friendsApi = {
  getFriends: async () => {
    const res = await request('/api/friends')
    return res.friends || []
  },

  getFriendRequests: async () => {
    const res = await request('/api/friends/requests')
    return res.requests || []
  },

  getSentFriendRequests: async () => {
    const res = await request('/api/friends/sent-requests')
    return res.requests || []
  },

  sendRequest: async (targetUserId) => {
    return await request('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    })
  },

  acceptRequest: async (requestId) => {
    return await request(`/api/friends/accept/${requestId}`, {
      method: 'PUT',
    })
  },

  rejectRequest: async (requestId) => {
    return await request(`/api/friends/reject/${requestId}`, {
      method: 'PUT',
    })
  },
}

// ============================================================================
// 3. DỊCH VỤ NHÓM CHAT (GROUPS API)
// ============================================================================
export const groupsApi = {
  getGroups: async () => {
    const res = await request('/api/groups')
    return res.groups || []
  },

  createGroup: async ({ name, avatar_url, memberIds }) => {
    return await request('/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name, avatar_url, memberIds }),
    })
  },

  getGroupDetail: async (groupId) => {
    return await request(`/api/groups/${groupId}`)
  },

  addMembers: async (groupId, userIds) => {
    return await request(`/api/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    })
  },

  removeMember: async (groupId, userId) => {
    return await request(`/api/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    })
  },
}

// ============================================================================
// 4. DỊCH VỤ TIN NHẮN (MESSAGES API)
// ============================================================================
export const messagesApi = {
  getMessages: async ({ receiverId, groupId, limit = 50, before }) => {
    const params = new URLSearchParams()
    if (receiverId) params.append('receiverId', receiverId)
    if (groupId) params.append('groupId', groupId)
    if (limit) params.append('limit', limit)
    if (before) params.append('before', before)

    const res = await request(`/api/messages?${params.toString()}`)
    return res.messages || []
  },

  sendMessage: async ({ receiverId, groupId, content, replyToId }) => {
    return await request('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, groupId, content, replyToId }),
    })
  },

  deleteMessage: async (messageId) => {
    return await request(`/api/messages/${messageId}`, {
      method: 'DELETE',
    })
  },

  markAsRead: async ({ messageIds, senderId }) => {
    return await request('/api/messages/read', {
      method: 'PUT',
      body: JSON.stringify({ messageIds, senderId }),
    })
  },
}

// ============================================================================
// 5. DỊCH VỤ TẢI LÊN TỆP TIN / MEDIA (UPLOAD API)
// ============================================================================
export const uploadApi = {
  uploadFile: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return await request('/api/upload', {
      method: 'POST',
      body: formData,
    })
  },
}

// ============================================================================
// 6. REALTIME WEBSOCKET (SOCKET.IO CLIENT)
// ============================================================================
let socketInstance = null

export const initSocket = (token) => {
  const authToken = token || getToken()
  if (!authToken) return null

  if (socketInstance && socketInstance.connected) {
    return socketInstance
  }

  socketInstance = io(API_BASE_URL, {
    auth: { token: authToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })

  socketInstance.on('connect', () => {
    console.log('[Socket] Connected to AWS ALB:', socketInstance.id)
  })

  socketInstance.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message)
  })

  return socketInstance
}

export const getSocket = () => socketInstance

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}

