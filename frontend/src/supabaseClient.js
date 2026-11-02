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
// AWS ALB CLOUD CHAT CLIENT (SUPABASE-COMPATIBLE ADAPTER)
// Chuyển toàn bộ truy vấn của Frontend tới AWS Application Load Balancer
// ============================================================================
export const supabase = {
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
                app_metadata: { provider: 'email' },
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
        currentSessionUser = user
        localStorage.setItem('cloudchat_current_user', JSON.stringify(user))
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
        currentSessionUser = user
        localStorage.setItem('cloudchat_current_user', JSON.stringify(user))
        initSocket(res.token)

        const session = {
          access_token: res.token,
          user: {
            id: user.id,
            email: user.email,
            user_metadata: { username: user.username, display_name: user.display_name },
            app_metadata: { provider: 'email' },
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
        currentSessionUser = user
        localStorage.setItem('cloudchat_current_user', JSON.stringify(user))
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
    let _selectCols = '*'
    let _filters = []
    let _orderCol = 'created_at'
    let _orderAsc = true
    let _limitNum = 50
    let _isSingle = false
    let _isMaybeSingle = false

    const queryBuilder = {
      select: (cols = '*') => {
        _selectCols = cols
        return queryBuilder
      },

      insert: (payload) => {
        const executeInsert = async () => {
          try {
            if (table === 'messages') {
              const res = await messagesApi.sendMessage({
                receiverId: payload.receiver_id,
                groupId: payload.group_id,
                content: payload.content,
                replyToId: payload.reply_to_id,
              })
              return { data: res.message, error: null }
            }

            if (table === 'groups') {
              const res = await groupsApi.createGroup({
                name: payload.name,
                avatar_url: payload.avatar_url,
                memberIds: payload.memberIds || [],
              })
              return { data: res.group, error: null }
            }

            if (table === 'friendships') {
              const res = await friendsApi.sendRequest(payload.friend_id)
              return { data: res.request, error: null }
            }

            if (table === 'group_members') {
              // Thêm thành viên
              if (Array.isArray(payload)) {
                const groupId = payload[0]?.group_id
                const uids = payload.map((p) => p.user_id)
                await groupsApi.addMembers(groupId, uids)
              }
              return { data: payload, error: null }
            }

            return { data: payload, error: null }
          } catch (err) {
            return { data: null, error: err }
          }
        }

        const promise = executeInsert()
        promise.select = () => ({
          single: async () => {
            const r = await executeInsert()
            return { data: r.data, error: r.error }
          },
        })
        return promise
      },

      update: (payload) => {
        const executeUpdate = async () => {
          try {
            if (table === 'messages') {
              if (payload.is_read) {
                const inFilter = _filters.find((f) => f.op === 'in' && f.col === 'id')
                const eqFilter = _filters.find((f) => f.op === 'eq' && f.col === 'id')
                const messageIds = inFilter ? inFilter.val : eqFilter ? [eqFilter.val] : []
                await messagesApi.markAsRead({ messageIds })
              }
              return { data: payload, error: null }
            }

            if (table === 'profiles' || table === 'users') {
              const res = await authApi.updateProfile(payload)
              return { data: res.user, error: null }
            }

            if (table === 'friendships') {
              const eqId = _filters.find((f) => f.op === 'eq' && f.col === 'id')?.val
              if (payload.status === 'accepted' && eqId) {
                await friendsApi.acceptRequest(eqId)
              }
              return { data: payload, error: null }
            }

            return { data: payload, error: null }
          } catch (err) {
            return { data: null, error: err }
          }
        }

        const promise = executeUpdate()
        promise.eq = (col, val) => {
          _filters.push({ col, op: 'eq', val })
          return executeUpdate()
        }
        promise.in = (col, val) => {
          _filters.push({ col, op: 'in', val })
          return executeUpdate()
        }
        return promise
      },

      delete: () => {
        const executeDelete = async () => {
          try {
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
          } catch (err) {
            return { data: null, error: err }
          }
        }

        const promise = executeDelete()
        promise.eq = (col, val) => {
          _filters.push({ col, op: 'eq', val })
          return queryBuilder
        }
        return queryBuilder
      },

      upsert: (payload) => {
        return queryBuilder.update(payload)
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

      // Cho phép cú pháp `await supabase.from(...).select(...)`
      then: (resolve, reject) => {
        const executeFetch = async () => {
          try {
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
              resultData = await friendsApi.getFriends()
            } else if (table === 'group_members') {
              const groupFilter = _filters.find((f) => f.col === 'group_id')
              if (groupFilter) {
                const detail = await groupsApi.getGroupDetail(groupFilter.val)
                resultData = detail?.members || []
              }
            } else if (table === 'profiles' || table === 'users') {
              const idInFilter = _filters.find((f) => f.col === 'id' && f.op === 'in')
              const idEqFilter = _filters.find((f) => f.col === 'id' && f.op === 'eq')
              const searchFilter = _filters.find((f) => f.col === 'username' || f.col === 'display_name')

              if (idEqFilter) {
                const me = await authApi.getMe()
                resultData = me.user ? [me.user] : []
              } else if (searchFilter) {
                const q = searchFilter.val.replace(/%/g, '')
                const res = await authApi.searchUsers(q)
                resultData = res.users || []
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

        executeFetch().then(resolve, reject)
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
        }

        if (filter?.table === 'group_members') {
          socket.on('group_updated', (g) => {
            callback({ eventType: 'UPDATE', new: g })
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
