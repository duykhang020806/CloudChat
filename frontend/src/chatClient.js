import {
  API_BASE_URL,
  authApi,
  friendsApi,
  groupsApi,
  messagesApi,
  uploadApi,
  initSocket,
  getSocket,
  disconnectSocket,
  getToken,
  setToken,
} from './api.js'

// Lưu trạng thái đăng nhập cục bộ
let currentSessionUser = null
try {
  const saved = localStorage.getItem('cloudchat_current_user')
  if (saved) currentSessionUser = JSON.parse(saved)
} catch { }

const authStateListeners = new Set()

const notifyAuthChange = (event, session) => {
  authStateListeners.forEach((listener) => {
    try {
      listener(event, session)
    } catch (e) {
      console.warn('Auth state listener error:', e)
    }
  })
}

// Khởi tạo Socket.io ngay nếu đã có token đăng nhập
if (getToken()) {
  initSocket()
}

// ============================================================================
// CLOUDCHAT API & REALTIME CLIENT
// Chuyển toàn bộ truy vấn của Frontend tới AWS Application Load Balancer
// ============================================================================
export const chatClient = {
  auth: {
    getSession: async () => {
      const token = getToken()
      if (!token) {
        return { data: { session: null }, error: null }
      }
      try {
        let user = currentSessionUser
        if (!user) {
          const res = await authApi.getMe()
          user = res.user
          currentSessionUser = user
          localStorage.setItem('cloudchat_current_user', JSON.stringify(user))
        }
        initSocket(token)
        const savedProvider = localStorage.getItem('cloudchat_auth_provider') || user?.provider || (user?.is_oauth ? 'google' : 'email')
        const isOAuth = savedProvider !== 'email'
        if (user) {
          user.provider = savedProvider
          user.is_oauth = isOAuth
        }
        return {
          data: {
            session: {
              access_token: token,
              user: {
                id: user.id,
                email: user.email,
                user_metadata: {
                  username: user.username,
                  display_name: user.display_name,
                },
                app_metadata: { provider: savedProvider },
                provider: savedProvider,
                is_oauth: isOAuth,
              },
            },
          },
          error: null,
        }
      } catch (err) {
        return { data: { session: null }, error: err }
      }
    },

    signInWithPassword: async ({ email, password }) => {
      try {
        const res = await authApi.login(email, password)
        const user = res.user
        user.provider = 'email'
        user.is_oauth = false
        currentSessionUser = user
        localStorage.setItem('cloudchat_current_user', JSON.stringify(user))
        localStorage.setItem('cloudchat_auth_provider', 'email')
        initSocket(res.token)

        const session = {
          access_token: res.token,
          user: {
            id: user.id,
            email: user.email,
            user_metadata: {
              username: user.username,
              display_name: user.display_name,
            },
            app_metadata: { provider: 'email' },
            provider: 'email',
            is_oauth: false,
          },
        }

        notifyAuthChange('SIGNED_IN', session)
        return { data: { user: session.user, session }, error: null }
      } catch (err) {
        return { data: { user: null, session: null }, error: err }
      }
    },

    signUp: async ({ email, password, options }) => {
      try {
        const username = options?.data?.username || email.split('@')[0]
        const displayName = options?.data?.display_name || username

        const res = await authApi.register(email, username, password, displayName)
        const user = res.user
        user.provider = 'email'
        user.is_oauth = false
        currentSessionUser = user
        localStorage.setItem('cloudchat_current_user', JSON.stringify(user))
        localStorage.setItem('cloudchat_auth_provider', 'email')
        initSocket(res.token)

        const session = {
          access_token: res.token,
          user: {
            id: user.id,
            email: user.email,
            user_metadata: { username: user.username, display_name: user.display_name },
            app_metadata: { provider: 'email' },
            provider: 'email',
            is_oauth: false,
          },
        }

        notifyAuthChange('SIGNED_IN', session)
        return { data: { user: session.user, session }, error: null }
      } catch (err) {
        return { data: { user: null, session: null }, error: err }
      }
    },

    signOut: async () => {
      try {
        await authApi.logout()
      } catch { }
      currentSessionUser = null
      try {
        localStorage.removeItem('cloudchat_auth_provider')
        localStorage.removeItem('cloudchat_current_user')
        localStorage.removeItem('cloudchat_token')
      } catch { }
      notifyAuthChange('SIGNED_OUT', null)
      return { error: null }
    },

    onAuthStateChange: (callback) => {
      authStateListeners.add(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => authStateListeners.delete(callback),
          },
        },
      }
    },

    updateUser: async (updates) => {
      try {
        const res = await authApi.updateProfile(updates?.data || updates)
        currentSessionUser = res.user
        localStorage.setItem('cloudchat_current_user', JSON.stringify(res.user))
        return { data: { user: res.user }, error: null }
      } catch (err) {
        return { data: null, error: err }
      }
    },

    signInWithOAuth: async () => {
      alert('Vui lòng sử dụng tính năng Đăng nhập với Google bên dưới hoặc email/mật khẩu trực tiếp.')
      return { error: null }
    },

    signInWithGoogleCredential: async (credential) => {
      try {
        const res = await authApi.googleLogin(credential)
        const user = res.user
        user.provider = 'google'
        user.is_oauth = true
        currentSessionUser = user
        localStorage.setItem('cloudchat_current_user', JSON.stringify(user))
        localStorage.setItem('cloudchat_auth_provider', 'google')
        initSocket(res.token)

        const session = {
          access_token: res.token,
          user: {
            id: user.id,
            email: user.email,
            user_metadata: {
              username: user.username,
              display_name: user.display_name,
              avatar_url: user.avatar_url,
            },
            app_metadata: { provider: 'google' },
            provider: 'google',
            is_oauth: true,
          },
        }

        notifyAuthChange('SIGNED_IN', session)
        return { data: { user: session.user, session }, error: null }
      } catch (err) {
        return { data: { user: null, session: null }, error: err }
      }
    },
  },

  // ==========================================================================
  // QUERY BUILDER: BẢNG CƠ SỞ DỮ LIỆU
  // ==========================================================================
  from: (table) => {
    let _operation = 'select' // 'select' | 'insert' | 'update' | 'delete'
    let _selectCols = '*'
    let _filters = []
    let _orderCol = 'created_at'
    let _orderAsc = true
    let _limitNum = 50
    let _isSingle = false
    let _isMaybeSingle = false
    let _insertPayload = null
    let _updatePayload = null

    const queryBuilder = {
      select: (cols = '*') => {
        if (_operation !== 'insert' && _operation !== 'update' && _operation !== 'delete') {
          _operation = 'select'
        }
        _selectCols = cols
        return queryBuilder
      },

      insert: (payload) => {
        _operation = 'insert'
        _insertPayload = payload
        return queryBuilder
      },

      update: (payload) => {
        _operation = 'update'
        _updatePayload = payload
        return queryBuilder
      },

      delete: () => {
        _operation = 'delete'
        return queryBuilder
      },

      upsert: (payload) => {
        _operation = 'update'
        _updatePayload = payload
        return queryBuilder
      },

      eq: (col, val) => {
        _filters.push({ col, op: 'eq', val })
        return queryBuilder
      },

      neq: (col, val) => {
        _filters.push({ col, op: 'neq', val })
        return queryBuilder
      },

      in: (col, val) => {
        _filters.push({ col, op: 'in', val })
        return queryBuilder
      },

      or: (val) => {
        _filters.push({ col: '$or', op: 'or', val })
        return queryBuilder
      },

      is: (col, val) => {
        _filters.push({ col, op: 'is', val })
        return queryBuilder
      },

      ilike: (col, val) => {
        _filters.push({ col, op: 'ilike', val })
        return queryBuilder
      },

      order: (col, { ascending = true } = {}) => {
        _orderCol = col
        _orderAsc = ascending
        return queryBuilder
      },

      limit: (n) => {
        _limitNum = n
        return queryBuilder
      },

      single: () => {
        _isSingle = true
        return queryBuilder
      },

      maybeSingle: () => {
        _isMaybeSingle = true
        return queryBuilder
      },

      // Cho phép cú pháp `await supabase.from(...)...`
      then: (resolve, reject) => {
        const execute = async () => {
          try {
            // 1. Xử lý INSERT
            if (_operation === 'insert') {
              if (table === 'messages') {
                const res = await messagesApi.sendMessage({
                  receiverId: _insertPayload.receiver_id,
                  groupId: _insertPayload.group_id,
                  content: _insertPayload.content,
                  replyToId: _insertPayload.reply_to_id,
                })
                return { data: res.message, error: null }
              }

              if (table === 'groups') {
                const res = await groupsApi.createGroup({
                  name: _insertPayload.name,
                  avatar_url: _insertPayload.avatar_url,
                  memberIds: _insertPayload.memberIds || [],
                })
                return { data: res.group, error: null }
              }

              if (table === 'friendships') {
                const targetId = _insertPayload.friend_id || _insertPayload.targetUserId
                const res = await friendsApi.sendRequest(targetId)
                return { data: res.request, error: null }
              }

              if (table === 'group_members') {
                if (Array.isArray(_insertPayload)) {
                  const groupId = _insertPayload[0]?.group_id
                  const uids = _insertPayload.map((p) => p.user_id)
                  await groupsApi.addMembers(groupId, uids)
                }
                return { data: _insertPayload, error: null }
              }

              return { data: _insertPayload, error: null }
            }

            // 2. Xử lý UPDATE
            if (_operation === 'update') {
              if (table === 'messages') {
                if (_updatePayload?.is_read) {
                  const inFilter = _filters.find((f) => f.op === 'in' && f.col === 'id')
                  const eqFilter = _filters.find((f) => f.op === 'eq' && f.col === 'id')
                  const messageIds = inFilter ? inFilter.val : eqFilter ? [eqFilter.val] : []
                  await messagesApi.markAsRead({ messageIds })
                } else if (_updatePayload?.content === '__REVOKED__') {
                  const eqId = _filters.find((f) => f.op === 'eq' && f.col === 'id')?.val
                  if (eqId) {
                    await messagesApi.deleteMessage(eqId)
                  }
                }
                return { data: _updatePayload, error: null }
              }

              if (table === 'profiles' || table === 'users') {
                const res = await authApi.updateProfile(_updatePayload)
                return { data: res.user, error: null }
              }

              if (table === 'friendships') {
                const eqId = _filters.find((f) => f.op === 'eq' && f.col === 'id')?.val
                if (_updatePayload?.status === 'accepted' && eqId) {
                  const res = await friendsApi.acceptRequest(eqId)
                  return { data: res.friendship, error: null }
                }
                return { data: _updatePayload, error: null }
              }

              return { data: _updatePayload, error: null }
            }

            // 3. Xử lý DELETE
            if (_operation === 'delete') {
              if (table === 'messages') {
                const eqId = _filters.find((f) => f.col === 'id')?.val
                if (eqId) {
                  await messagesApi.deleteMessage(eqId)
                }
                return { data: null, error: null }
              }

              if (table === 'friendships') {
                const eqId = _filters.find((f) => f.col === 'id')?.val
                if (eqId) {
                  await friendsApi.rejectRequest(eqId)
                }
                return { data: null, error: null }
              }

              if (table === 'group_members') {
                const grpId = _filters.find((f) => f.col === 'group_id')?.val
                const uId = _filters.find((f) => f.col === 'user_id')?.val
                if (grpId && uId) {
                  await groupsApi.removeMember(grpId, uId)
                }
                return { data: null, error: null }
              }

              return { data: null, error: null }
            }

            // 4. Xử lý SELECT
            let resultData = []

            if (table === 'messages') {
              const groupFilter = _filters.find((f) => f.col === 'group_id' && f.op === 'eq')
              if (groupFilter) {
                resultData = await messagesApi.getMessages({ groupId: groupFilter.val, limit: _limitNum })
              } else {
                // 1-1 chat
                const orFilter = _filters.find((f) => f.col === '$or')
                let receiverId = null
                if (orFilter) {
                  const match = orFilter.val.match(/receiver_id\.eq\.([a-zA-Z0-9_-]+)/)
                  if (match) receiverId = match[1]
                }
                resultData = await messagesApi.getMessages({ receiverId, limit: _limitNum })
              }
            } else if (table === 'groups') {
              resultData = await groupsApi.getGroups()
            } else if (table === 'friendships') {
              const statusFilter = _filters.find((f) => f.col === 'status')
              const userIdFilter = _filters.find((f) => f.col === 'user_id')
              const orFilter = _filters.find((f) => f.col === '$or' || f.op === 'or')
              const currentUid = currentSessionUser?.id

              if (statusFilter?.val === 'pending') {
                if (userIdFilter && String(userIdFilter.val) === String(currentUid)) {
                  // Danh sách lời mời đã gửi (outgoing)
                  const sentList = await friendsApi.getSentFriendRequests()
                  resultData = (sentList || []).map((r) => ({
                    id: r.id,
                    user_id: r.user_id,
                    friend_id: r.friend_id,
                    status: 'pending',
                    created_at: r.created_at,
                    username: r.username,
                    display_name: r.display_name,
                    avatar_url: r.avatar_url,
                    bio: r.bio,
                  }))
                } else {
                  // Danh sách lời mời nhận được (incoming)
                  const reqList = await friendsApi.getFriendRequests()
                  resultData = (reqList || []).map((r) => ({
                    id: r.id,
                    user_id: r.user_id,
                    friend_id: currentUid,
                    status: 'pending',
                    created_at: r.created_at,
                    username: r.username,
                    display_name: r.display_name,
                    avatar_url: r.avatar_url,
                    bio: r.bio,
                  }))
                }
              } else if (orFilter) {
                // Kiểm tra quan hệ bạn bè cụ thể với targetId
                const orVal = String(orFilter.val)
                const ids = Array.from(orVal.matchAll(/(?:user_id|friend_id)\.eq\.([a-zA-Z0-9_-]+)/g)).map((m) => m[1])
                const targetId = ids.find((id) => String(id) !== String(currentUid)) || ids[0]

                if (targetId) {
                  const friendsList = await friendsApi.getFriends()
                  const foundFriend = (friendsList || []).find((f) => String(f.id) === String(targetId))
                  if (foundFriend) {
                    resultData = [{
                      id: foundFriend.friendship_id || foundFriend.id,
                      user_id: currentUid,
                      friend_id: targetId,
                      status: 'accepted',
                      created_at: foundFriend.friendship_date || new Date().toISOString(),
                    }]
                  } else {
                    const sentList = await friendsApi.getSentFriendRequests().catch(() => [])
                    const foundSent = (sentList || []).find((r) => String(r.friend_id) === String(targetId) || String(r.id) === String(targetId))
                    if (foundSent) {
                      resultData = [{
                        id: foundSent.id,
                        user_id: currentUid,
                        friend_id: targetId,
                        status: 'pending',
                        created_at: foundSent.created_at,
                      }]
                    } else {
                      const reqList = await friendsApi.getFriendRequests().catch(() => [])
                      const foundIncoming = (reqList || []).find((r) => String(r.user_id) === String(targetId) || String(r.id) === String(targetId))
                      if (foundIncoming) {
                        resultData = [{
                          id: foundIncoming.id,
                          user_id: targetId,
                          friend_id: currentUid,
                          status: 'pending',
                          created_at: foundIncoming.created_at,
                        }]
                      } else {
                        resultData = []
                      }
                    }
                  }
                } else {
                  resultData = []
                }
              } else {
                // Lấy danh sách bạn bè đã chấp nhận
                const friendsList = await friendsApi.getFriends()
                resultData = (friendsList || []).map((f) => ({
                  id: f.friendship_id || f.id,
                  user_id: currentSessionUser?.id || '',
                  friend_id: f.id,
                  status: 'accepted',
                  created_at: f.friendship_date || f.created_at || new Date().toISOString(),
                  ...f,
                }))
              }
            } else if (table === 'group_members') {
              const groupFilter = _filters.find((f) => f.col === 'group_id')
              if (groupFilter) {
                const detail = await groupsApi.getGroupDetail(groupFilter.val)
                resultData = detail?.members || []
              }
            } else if (table === 'profiles' || table === 'users') {
              const idInFilter = _filters.find((f) => f.col === 'id' && f.op === 'in')
              const idEqFilter = _filters.find((f) => f.col === 'id' && f.op === 'eq')
              const searchFilter = _filters.find((f) => f.col === 'username' || f.col === 'display_name' || f.col === 'email')
              const orFilter = _filters.find((f) => f.op === 'or' || f.col === '$or')

              if (idEqFilter) {
                const me = await authApi.getMe()
                resultData = me.user ? [me.user] : []
              } else if (idInFilter) {
                const rawVal = idInFilter.val
                const ids = Array.isArray(rawVal)
                  ? rawVal
                  : String(rawVal).replace(/[()]/g, '').split(',').map((s) => s.trim()).filter(Boolean)
                const res = await authApi.getUsersByIds(ids)
                resultData = res.users || []
              } else if (searchFilter) {
                const q = String(searchFilter.val || '').replace(/%/g, '').trim()
                const res = await authApi.searchUsers(q)
                resultData = res.users || []
              } else if (orFilter) {
                let q = ''
                const valStr = String(orFilter.val || '')
                const match = valStr.match(/%([^%,]+)%/)
                if (match) {
                  q = match[1]
                } else {
                  const parts = valStr.split(',')
                  for (const part of parts) {
                    if (part.includes('ilike.')) {
                      q = part.split('ilike.')[1].replace(/%/g, '')
                      break
                    }
                  }
                }
                q = q.trim()
                if (q) {
                  const res = await authApi.searchUsers(q)
                  resultData = res.users || []
                } else {
                  resultData = []
                }
              } else {
                resultData = []
              }
            }

            if (_isSingle || _isMaybeSingle) {
              return { data: resultData[0] || null, error: null }
            }

            return { data: resultData, error: null }
          } catch (err) {
            return { data: null, error: err }
          }
        }

        execute().then(resolve, reject)
      },
    }

    return queryBuilder
  },

  // ==========================================================================
  // REALTIME WEBSOCKET CHANNELS (CHUYỂN TIẾP TỚI SOCKET.IO)
  // ==========================================================================
  channel: (channelName) => {
    const socket = getSocket() || initSocket()

    const channelObj = {
      on: (eventType, filter, callback) => {
        if (!socket) return channelObj

        if (filter?.table === 'messages') {
          socket.on('new_message', (msg) => {
            callback({ eventType: 'INSERT', new: msg })
          })
          socket.on('message_revoked', (msg) => {
            callback({ eventType: 'UPDATE', new: msg })
          })
        }

        if (filter?.table === 'friendships') {
          socket.on('incoming_friend_request', (req) => {
            callback({ eventType: 'INSERT', new: req })
          })
          socket.on('friendship_updated', (f) => {
            callback({ eventType: 'UPDATE', new: f })
          })
          socket.on('block_updated', (b) => {
            callback({ eventType: 'UPDATE', new: b })
          })
        }

        if (filter?.table === 'group_members') {
          socket.on('group_updated', (g) => {
            callback({ eventType: 'UPDATE', new: g })
          })
        }

        if (filter?.table === 'users' || filter?.table === 'profiles') {
          socket.on('user_status_changed', (status) => {
            callback({
              eventType: 'UPDATE',
              new: {
                id: status.userId,
                userId: status.userId,
                is_online: Boolean(status.isOnline),
                isOnline: Boolean(status.isOnline),
                last_seen: status.lastSeen,
                lastSeen: status.lastSeen,
              },
            })
          })
        }

        return channelObj
      },

      subscribe: () => {
        return channelObj
      },
    }

    return channelObj
  },

  removeChannel: (channel) => {
    // Không cần hủy socket connection, chỉ unbind listeners
  },
}

// Giữ alias supabase để tương thích ngược mượt mà
export const supabase = chatClient
export default chatClient
