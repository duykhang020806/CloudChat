/**
 * CloudChat Media & Chat Engine (IndexedDB + RAM Cache)
 * Similar to Telegram Web & WhatsApp Web:
 * 1. Multi-chat in-memory cache for 0ms instant chat switching without re-downloading.
 * 2. High-capacity IndexedDB storage for persistent offline messages and images (no 5MB localStorage limit).
 * 3. Pre-decoded image registry to eliminate image blinking and reload flicker.
 */

// 1. In-Memory RAM Cache (fastest, 0ms latency)
const chatMemoryCache = new Map()
export const decodedImagesCache = new Set()

export function getMemoryCachedMessages(chatId) {
  if (!chatId) return null
  return chatMemoryCache.get(String(chatId)) || null
}

export function setMemoryCachedMessages(chatId, messages) {
  if (!chatId || !Array.isArray(messages)) return
  chatMemoryCache.set(String(chatId), messages)
}

export function clearMemoryCachedChat(chatId) {
  if (chatId) {
    chatMemoryCache.delete(String(chatId))
  } else {
    chatMemoryCache.clear()
  }
}

// 2. Pre-decode and register image in browser memory
export function registerDecodedImage(url) {
  if (url && typeof url === 'string') {
    decodedImagesCache.add(url)
  }
}

export function isImageDecoded(url) {
  if (!url || typeof url !== 'string') return false
  return decodedImagesCache.has(url)
}

export function preloadImage(url) {
  if (!url || typeof url !== 'string' || decodedImagesCache.has(url)) return
  const img = new Image()
  img.src = url
  if (img.decode) {
    img.decode().then(() => {
      decodedImagesCache.add(url)
    }).catch(() => {
      decodedImagesCache.add(url)
    })
  } else {
    img.onload = () => decodedImagesCache.add(url)
  }
}

// 3. Persistent IndexedDB Storage (Capacity: Gigabytes, non-blocking)
const DB_NAME = 'cloudchat_cache_db'
const DB_VERSION = 1
const STORE_CHATS = 'chat_messages'
const STORE_MEDIA = 'media_cache'

let dbPromise = null

function openDb() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null)
  }
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_CHATS)) {
          db.createObjectStore(STORE_CHATS, { keyPath: 'chatId' })
        }
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          db.createObjectStore(STORE_MEDIA, { keyPath: 'key' })
        }
      }

      request.onsuccess = (event) => {
        resolve(event.target.result)
      }

      request.onerror = (err) => {
        console.warn('IndexedDB open error, fallback to RAM cache:', err)
        resolve(null)
      }
    } catch (e) {
      console.warn('IndexedDB unavailable:', e)
      resolve(null)
    }
  })

  return dbPromise
}

// Save full messages (including images) to IndexedDB
export async function saveMessagesToDb(chatId, messages) {
  if (!chatId || !Array.isArray(messages)) return
  // Always update in-memory cache first for instant access
  setMemoryCachedMessages(chatId, messages)

  try {
    const db = await openDb()
    if (!db) return

    const tx = db.transaction(STORE_CHATS, 'readwrite')
    const store = tx.objectStore(STORE_CHATS)

    // Store up to 50 most recent messages in persistent IndexedDB
    const sliceToPersist = messages.slice(-50)
    store.put({
      chatId: String(chatId),
      messages: sliceToPersist,
      updatedAt: Date.now(),
    })
  } catch (err) {
    console.warn('Failed to save messages to IndexedDB:', err)
  }
}

// Get messages from IndexedDB (fallback if not in RAM cache)
export async function getMessagesFromDb(chatId) {
  if (!chatId) return null

  // Check RAM cache first
  const mem = getMemoryCachedMessages(chatId)
  if (mem && mem.length > 0) return mem

  try {
    const db = await openDb()
    if (!db) return null

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHATS, 'readonly')
      const store = tx.objectStore(STORE_CHATS)
      const req = store.get(String(chatId))

      req.onsuccess = () => {
        const result = req.result
        if (result && Array.isArray(result.messages) && result.messages.length > 0) {
          // Warm up RAM cache
          setMemoryCachedMessages(chatId, result.messages)
          resolve(result.messages)
        } else {
          resolve(null)
        }
      }

      req.onerror = () => resolve(null)
    })
  } catch (err) {
    console.warn('Failed to read messages from IndexedDB:', err)
    return null
  }
}

// Delete chat messages from IndexedDB (when clearing chat)
export async function deleteMessagesFromDb(chatId) {
  if (!chatId) return
  clearMemoryCachedChat(chatId)

  try {
    const db = await openDb()
    if (!db) return

    const tx = db.transaction(STORE_CHATS, 'readwrite')
    const store = tx.objectStore(STORE_CHATS)
    store.delete(String(chatId))
  } catch (err) {
    console.warn('Failed to delete messages from IndexedDB:', err)
  }
}
