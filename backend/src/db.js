import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

// Khởi tạo PostgreSQL Connection Pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // tối đa 20 kết nối đồng thời từ mỗi backend instance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('connect', () => {
  // console.log('Connected to PostgreSQL Database')
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err)
})

// Client riêng biệt để lắng nghe sự kiện đồng bộ giữa các Backend Server (PostgreSQL LISTEN)
export const createListenerClient = async (channelName, onNotification) => {
  try {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    })
    await client.connect()
    await client.query(`LISTEN ${channelName}`)
    client.on('notification', (msg) => {
      try {
        const payload = JSON.parse(msg.payload)
        onNotification(payload)
      } catch (err) {
        console.error('Failed to parse notification payload', err)
      }
    })
    console.log(`[PostgreSQL LISTEN] Successfully subscribed to channel: ${channelName}`)
    return client
  } catch (err) {
    console.error(`[PostgreSQL LISTEN] Error subscribing to channel: ${channelName}`, err.message)
    return null
  }
}

// Hàm phát tín hiệu đồng bộ cho các server Backend khác (PostgreSQL NOTIFY an toàn chuẩn tham số)
export const broadcastNotification = async (channelName, data) => {
  try {
    await pool.query('SELECT pg_notify($1, $2)', [channelName, JSON.stringify(data)])
  } catch (err) {
    console.error(`[PostgreSQL NOTIFY] Error broadcasting on channel: ${channelName}`, err.message)
  }
}

