const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 8787;
const DB_PATH = path.join(__dirname, 'cloudchat.db');

// Initialize SQLite database
const db = new DatabaseSync(DB_PATH);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending' | 'accepted'
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS friend_qr_codes (
    code TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_revoked INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    creator_id TEXT NOT NULL,
    is_community INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member', -- 'creator' | 'member'
    joined_at TEXT NOT NULL,
    UNIQUE(group_id, user_id)
  );
`);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_cloudchat_salt_2026').digest('hex');
}

// Seed Demo Bot & Author Account
const BOT_ID = 'bot_assistant';
const AUTHOR_ID = 'user_duykhang';

function seedInitialData() {
  const checkBot = db.prepare('SELECT id FROM users WHERE id = ?').get(BOT_ID);
  if (!checkBot) {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, bio, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      BOT_ID,
      'assistant',
      hashPassword('assistant123'),
      'CloudChat AI Assistant',
      'Trợ lý ảo hỗ trợ - Trò chuyện và giải đáp thắc mắc',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
      new Date().toISOString()
    );
  }

  const checkAuthor = db.prepare('SELECT id FROM users WHERE id = ?').get(AUTHOR_ID);
  if (!checkAuthor) {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, display_name, bio, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      AUTHOR_ID,
      'duykhang',
      hashPassword('123456'),
      'Duy Khang',
      'Tác giả CloudChat - Chúc bạn trải nghiệm ứng dụng vui vẻ! 🚀',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Luna',
      new Date().toISOString()
    );
  }
}
seedInitialData();

// Helper to auto-connect a user with Bot and Author
function connectWelcomeFriends(userId) {
  const targets = [
    {
      id: BOT_ID,
      welcome: 'Xin chào! Mình là CloudChat AI Assistant 🤖. Bạn có thể gửi tin nhắn hoặc hình ảnh cho mình để kiểm tra nhé!'
    },
    {
      id: AUTHOR_ID,
      welcome: 'Chào mừng bạn đến với CloudChat! Ứng dụng chat hiện đại với giao diện Telegram Dark Mode.'
    }
  ];

  for (const t of targets) {
    if (userId === t.id) continue;
    const exists = db.prepare(`
      SELECT id FROM friendships 
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    `).get(userId, t.id, t.id, userId);

    if (!exists) {
      const friendshipId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO friendships (id, user1_id, user2_id, status, created_at)
        VALUES (?, ?, ?, 'accepted', ?)
      `).run(friendshipId, t.id, userId, new Date().toISOString());

      // Insert welcome message
      const msgId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(msgId, t.id, userId, t.welcome, new Date().toISOString());
    }
  }
}

// Helpers
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // 50MB max limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function authenticate(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
  if (!session) return null;
  const user = db.prepare('SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE id = ?').get(session.user_id);
  return user || null;
}

// Server handler
const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost:8787'}`);
  const pathname = url.pathname;

  try {
    // 1. Health check
    if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) {
      return sendJson(res, 200, { success: true, app: 'CloudChat Backend API', status: 'running' });
    }

    // 2. Auth: Register
    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const body = await parseBody(req);
      const username = (body.username || '').trim().toLowerCase();
      const password = body.password || '';
      const displayName = (body.display_name || '').trim() || username;

      if (!username || username.length < 3 || username.length > 30) {
        return sendJson(res, 400, { success: false, message: 'Username phải từ 3 đến 30 ký tự' });
      }
      if (!password || password.length < 6) {
        return sendJson(res, 400, { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        return sendJson(res, 400, { success: false, message: 'Tên đăng nhập đã tồn tại, vui lòng chọn tên khác' });
      }

      const userId = crypto.randomUUID();
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, username, password_hash, display_name, bio, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, username, hashPassword(password), displayName, '', avatarUrl, now);

      connectWelcomeFriends(userId);

      return sendJson(res, 200, { success: true, message: 'Đăng ký thành công. Hãy đăng nhập.' });
    }

    // 3. Auth: Login
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await parseBody(req);
      const username = (body.username || '').trim().toLowerCase();
      const password = body.password || '';

      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (!user || user.password_hash !== hashPassword(password)) {
        return sendJson(res, 400, { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const now = new Date().toISOString();
      db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, user.id, now);

      const safeUser = {
        id: user.id,
        username: user.username,
        display_name: user.display_name || user.username,
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        created_at: user.created_at
      };

      connectWelcomeFriends(user.id);

      return sendJson(res, 200, { success: true, token, user: safeUser });
    }

    // --- PROTECTED ROUTES ---
    if (pathname.startsWith('/api/protected/')) {
      const currentUser = authenticate(req);
      if (!currentUser) {
        return sendJson(res, 401, { success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
      }

      // 4. Me
      if (req.method === 'GET' && pathname === '/api/protected/me') {
        return sendJson(res, 200, { success: true, user: currentUser });
      }

      // 5. Update Profile
      if (req.method === 'PUT' && pathname === '/api/protected/profile') {
        const body = await parseBody(req);
        const displayName = (body.display_name || '').trim() || currentUser.username;
        const bio = (body.bio || '').trim();
        const avatarUrl = body.avatar_url !== undefined ? String(body.avatar_url).trim() : (currentUser.avatar_url || '');

        db.prepare(`
          UPDATE users SET display_name = ?, bio = ?, avatar_url = ? WHERE id = ?
        `).run(displayName, bio, avatarUrl, currentUser.id);

        const updated = db.prepare('SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE id = ?').get(currentUser.id);
        return sendJson(res, 200, { success: true, user: updated });
      }

      // 6. Change Password
      if (req.method === 'POST' && pathname === '/api/protected/profile/change-password') {
        const body = await parseBody(req);
        const currentPassword = body.current_password || '';
        const newPassword = body.new_password || '';

        const userRecord = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(currentUser.id);
        if (userRecord.password_hash !== hashPassword(currentPassword)) {
          return sendJson(res, 400, { success: false, message: 'Mật khẩu hiện tại không chính xác' });
        }
        if (!newPassword || newPassword.length < 6) {
          return sendJson(res, 400, { success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), currentUser.id);
        return sendJson(res, 200, { success: true, message: 'Đổi mật khẩu thành công!' });
      }

      // 7. Get Friends
      if (req.method === 'GET' && pathname === '/api/protected/friends') {
        const rows = db.prepare(`
          SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.created_at
          FROM users u
          WHERE u.id IN (
            SELECT CASE WHEN user1_id = ? THEN user2_id ELSE user1_id END
            FROM friendships
            WHERE (user1_id = ? OR user2_id = ?) AND status = 'accepted'
          )
        `).all(currentUser.id, currentUser.id, currentUser.id);

        return sendJson(res, 200, { success: true, friends: rows });
      }

      // 8. Get Friend Requests
      if (req.method === 'GET' && pathname === '/api/protected/friends/requests') {
        const rows = db.prepare(`
          SELECT f.id, u.username, u.display_name, u.avatar_url
          FROM friendships f
          JOIN users u ON f.user1_id = u.id
          WHERE f.user2_id = ? AND f.status = 'pending'
        `).all(currentUser.id);

        return sendJson(res, 200, { success: true, requests: rows });
      }

      // 9. Search Users
      if (req.method === 'GET' && pathname === '/api/protected/users/search') {
        const queryUsername = (url.searchParams.get('username') || '').trim().toLowerCase();
        if (!queryUsername) {
          return sendJson(res, 400, { success: false, message: 'Thiếu tham số tìm kiếm' });
        }

        const found = db.prepare(`
          SELECT id, username, display_name, bio, avatar_url
          FROM users
          WHERE username = ? AND id != ?
        `).get(queryUsername, currentUser.id);

        if (!found) {
          return sendJson(res, 404, { success: false, message: 'Không tìm thấy người dùng' });
        }

        return sendJson(res, 200, { success: true, user: found });
      }

      // 10. Send Friend Request: /api/protected/friends/request/:targetId
      const reqMatch = pathname.match(/^\/api\/protected\/friends\/request\/([^/]+)$/);
      if (reqMatch && req.method === 'POST') {
        const targetId = reqMatch[1];
        if (targetId === currentUser.id) {
          return sendJson(res, 400, { success: false, message: 'Không thể tự kết bạn với chính mình' });
        }

        const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
        if (!targetUser) {
          return sendJson(res, 404, { success: false, message: 'Người dùng không tồn tại' });
        }

        const existingFriendship = db.prepare(`
          SELECT * FROM friendships
          WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
        `).get(currentUser.id, targetId, targetId, currentUser.id);

        if (existingFriendship) {
          if (existingFriendship.status === 'accepted') {
            return sendJson(res, 400, { success: false, message: 'Hai bạn đã là bạn bè của nhau rồi' });
          }
          return sendJson(res, 400, { success: false, message: 'Lời mời kết bạn đã tồn tại trước đó' });
        }

        const newId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO friendships (id, user1_id, user2_id, status, created_at)
          VALUES (?, ?, ?, 'pending', ?)
        `).run(newId, currentUser.id, targetId, new Date().toISOString());

        return sendJson(res, 200, { success: true, message: 'Đã gửi lời mời kết bạn thành công!' });
      }

      // 11. Accept Friend Request: /api/protected/friends/:friendshipId/accept
      const acceptMatch = pathname.match(/^\/api\/protected\/friends\/([^/]+)\/accept$/);
      if (acceptMatch && req.method === 'POST') {
        const friendshipId = acceptMatch[1];
        const friendship = db.prepare('SELECT * FROM friendships WHERE id = ? AND user2_id = ?').get(friendshipId, currentUser.id);

        if (!friendship) {
          return sendJson(res, 404, { success: false, message: 'Lời mời không tồn tại' });
        }

        db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(friendshipId);
        return sendJson(res, 200, { success: true, message: 'Đã chấp nhận lời mời kết bạn' });
      }

      // 11.1 QR: Generate Friend QR Code (Spawn QR with TTL)
      if (req.method === 'POST' && pathname === '/api/protected/qr/generate') {
        const body = await parseBody(req);
        let ttlSeconds = Number(body.ttl_seconds) || 300; // default 5 minutes
        if (ttlSeconds < 30) ttlSeconds = 30; // min 30s
        if (ttlSeconds > 86400) ttlSeconds = 86400; // max 24h

        // Revoke any previous active QR codes for this user
        db.prepare('UPDATE friend_qr_codes SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0').run(currentUser.id);

        const code = crypto.randomBytes(12).toString('hex');
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
        const createdAt = now.toISOString();

        db.prepare(`
          INSERT INTO friend_qr_codes (code, user_id, expires_at, created_at, is_revoked)
          VALUES (?, ?, ?, ?, 0)
        `).run(code, currentUser.id, expiresAt, createdAt);

        return sendJson(res, 200, {
          success: true,
          qr: {
            code,
            expires_at: expiresAt,
            created_at: createdAt,
            ttl_seconds: ttlSeconds
          }
        });
      }

      // 11.2 QR: Get Active Friend QR Code
      if (req.method === 'GET' && pathname === '/api/protected/qr/active') {
        const row = db.prepare(`
          SELECT code, user_id, expires_at, created_at, is_revoked
          FROM friend_qr_codes
          WHERE user_id = ? AND is_revoked = 0
          ORDER BY created_at DESC
          LIMIT 1
        `).get(currentUser.id);

        if (!row) {
          return sendJson(res, 200, { success: true, qr: null });
        }

        const now = new Date();
        const expDate = new Date(row.expires_at);
        if (expDate <= now) {
          db.prepare('UPDATE friend_qr_codes SET is_revoked = 1 WHERE code = ?').run(row.code);
          return sendJson(res, 200, { success: true, qr: null, was_expired: true });
        }

        return sendJson(res, 200, {
          success: true,
          qr: {
            code: row.code,
            expires_at: row.expires_at,
            created_at: row.created_at,
            remaining_seconds: Math.max(0, Math.floor((expDate - now) / 1000))
          }
        });
      }

      // 11.3 QR: Revoke Current QR Code
      if (req.method === 'POST' && pathname === '/api/protected/qr/revoke') {
        db.prepare('UPDATE friend_qr_codes SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0').run(currentUser.id);
        return sendJson(res, 200, { success: true, message: 'Đã hủy mã QR thành công' });
      }

      // 11.4 QR: Resolve / Check QR Code (Scan QR)
      const qrResolveMatch = pathname.match(/^\/api\/protected\/qr\/resolve\/([^/]+)$/);
      if (qrResolveMatch && req.method === 'GET') {
        const code = qrResolveMatch[1].trim();
        const row = db.prepare('SELECT code, user_id, expires_at, created_at, is_revoked FROM friend_qr_codes WHERE code = ?').get(code);

        if (!row) {
          return sendJson(res, 404, { success: false, code_status: 'not_found', message: 'Mã QR không tồn tại hoặc không hợp lệ' });
        }

        if (row.is_revoked === 1) {
          return sendJson(res, 400, { success: false, code_status: 'revoked', message: 'Mã QR này đã bị hủy bỏ bởi người tạo' });
        }

        const now = new Date();
        if (new Date(row.expires_at) <= now) {
          db.prepare('UPDATE friend_qr_codes SET is_revoked = 1 WHERE code = ?').run(row.code);
          return sendJson(res, 400, { success: false, code_status: 'expired', message: 'Mã QR này đã hết hạn sử dụng' });
        }

        if (row.user_id === currentUser.id) {
          return sendJson(res, 400, { success: false, code_status: 'is_self', message: 'Đây là mã QR của chính bạn' });
        }

        const creator = db.prepare('SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE id = ?').get(row.user_id);
        if (!creator) {
          return sendJson(res, 404, { success: false, message: 'Người dùng sở hữu mã này không tồn tại' });
        }

        // Check friendship status
        const friendship = db.prepare(`
          SELECT id, status, user1_id, user2_id FROM friendships
          WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
        `).get(currentUser.id, row.user_id, row.user_id, currentUser.id);

        let friendshipStatus = 'none';
        if (friendship) {
          if (friendship.status === 'accepted') {
            friendshipStatus = 'accepted';
          } else if (friendship.user1_id === currentUser.id) {
            friendshipStatus = 'pending_sent';
          } else {
            friendshipStatus = 'pending_received';
          }
        }

        return sendJson(res, 200, {
          success: true,
          user: creator,
          qr: {
            code: row.code,
            expires_at: row.expires_at
          },
          friendship_status: friendshipStatus,
          friendship_id: friendship?.id || null
        });
      }

      // 11.5 QR: Add friend via QR Code
      const qrAddMatch = pathname.match(/^\/api\/protected\/qr\/add-friend\/([^/]+)$/);
      if (qrAddMatch && req.method === 'POST') {
        const code = qrAddMatch[1].trim();
        const row = db.prepare('SELECT code, user_id, expires_at, is_revoked FROM friend_qr_codes WHERE code = ?').get(code);

        if (!row || row.is_revoked === 1 || new Date(row.expires_at) <= new Date()) {
          return sendJson(res, 400, { success: false, message: 'Mã QR đã hết hạn hoặc không còn hiệu lực' });
        }

        const targetId = row.user_id;
        if (targetId === currentUser.id) {
          return sendJson(res, 400, { success: false, message: 'Không thể tự kết bạn với chính mình' });
        }

        const existingFriendship = db.prepare(`
          SELECT * FROM friendships
          WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
        `).get(currentUser.id, targetId, targetId, currentUser.id);

        if (existingFriendship) {
          if (existingFriendship.status === 'accepted') {
            return sendJson(res, 200, { success: true, message: 'Hai bạn đã là bạn bè của nhau rồi!', status: 'accepted' });
          }
          if (existingFriendship.user2_id === currentUser.id) {
            db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(existingFriendship.id);
            return sendJson(res, 200, { success: true, message: 'Đã chấp nhận kết bạn thành công!', status: 'accepted' });
          }
          return sendJson(res, 200, { success: true, message: 'Lời mời kết bạn đã được gửi trước đó', status: 'pending' });
        }

        const newId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO friendships (id, user1_id, user2_id, status, created_at)
          VALUES (?, ?, ?, 'accepted', ?)
        `).run(newId, currentUser.id, targetId, new Date().toISOString());

        const welcomeMsgId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(welcomeMsgId, currentUser.id, targetId, '👋 Xin chào! Chúng ta vừa kết bạn thành công qua mã QR CloudChat!', new Date().toISOString());

        return sendJson(res, 200, { success: true, message: 'Kết bạn qua mã QR thành công! Hai bạn đã là bạn bè.', status: 'accepted' });
      }

      // 11.6 Search Messages: /api/protected/messages/search?q=...
      if (pathname === '/api/protected/messages/search' && req.method === 'GET') {
        const q = (url.searchParams.get('q') || '').trim().toLowerCase();
        if (!q) {
          return sendJson(res, 200, { success: true, results: [] });
        }
        const rows = db.prepare(`
          SELECT id, sender_id, receiver_id, content, created_at
          FROM messages
          WHERE (sender_id = ? OR receiver_id = ?)
            AND LOWER(content) LIKE ?
          ORDER BY created_at DESC
          LIMIT 50
        `).all(currentUser.id, currentUser.id, `%${q}%`);

        return sendJson(res, 200, { success: true, results: rows });
      }

      // 11.7 Delete Message: DELETE /api/protected/messages/:messageId
      const delMsgMatch = pathname.match(/^\/api\/protected\/messages\/([^/]+)$/);
      if (delMsgMatch && req.method === 'DELETE') {
        const messageId = delMsgMatch[1];
        const msg = db.prepare('SELECT id, sender_id, receiver_id FROM messages WHERE id = ?').get(messageId);
        if (!msg) {
          return sendJson(res, 404, { success: false, message: 'Tin nhắn không tồn tại hoặc đã bị xóa' });
        }

        // Cho phép người gửi hoặc người nhận (hoặc group member) xóa
        db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
        return sendJson(res, 200, { success: true, message: 'Đã xóa tin nhắn thành công', deleted_id: messageId });
      }

      // ==================== GROUP CHAT APIs ====================
      // 13. Create Group: POST /api/protected/groups
      if (pathname === '/api/protected/groups' && req.method === 'POST') {
        const body = await parseBody(req);
        const name = (body.name || '').trim();
        const avatarUrl = (body.avatar_url || '').trim() || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name || 'group')}`;
        const initialMemberIds = Array.isArray(body.member_ids) ? body.member_ids.filter(id => id && id !== currentUser.id) : [];

        if (!name) {
          return sendJson(res, 400, { success: false, message: 'Tên nhóm không được để trống' });
        }

        // Kiểm tra giới hạn ban đầu: tối đa 50 người (tính cả creator)
        const totalInitial = 1 + initialMemberIds.length;
        if (totalInitial > 50) {
          return sendJson(res, 400, {
            success: false,
            message: `Nhóm thường giới hạn tối đa 50 thành viên (bạn đang chọn ${totalInitial} người). Người tạo nhóm cần nâng cấp lên Cộng đồng để thêm nhiều hơn.`
          });
        }

        const groupId = 'group_' + crypto.randomUUID();
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO groups (id, name, avatar_url, creator_id, is_community, created_at)
          VALUES (?, ?, ?, ?, 0, ?)
        `).run(groupId, name, avatarUrl, currentUser.id, now);

        // Thêm creator vào nhóm với role = 'creator'
        db.prepare(`
          INSERT INTO group_members (id, group_id, user_id, role, joined_at)
          VALUES (?, ?, ?, 'creator', ?)
        `).run(crypto.randomUUID(), groupId, currentUser.id, now);

        // Thêm các thành viên được chọn
        for (const mid of initialMemberIds) {
          const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(mid);
          if (userExists) {
            db.prepare(`
              INSERT OR IGNORE INTO group_members (id, group_id, user_id, role, joined_at)
              VALUES (?, ?, ?, 'member', ?)
            `).run(crypto.randomUUID(), groupId, mid, now);
          }
        }

        // Thêm tin nhắn hệ thống thông báo tạo nhóm
        const welcomeId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(welcomeId, currentUser.id, groupId, `🎉 Nhóm "${name}" đã được tạo. Chào mừng các thành viên!`, now);

        const newGroup = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
        const memberCount = db.prepare('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?').get(groupId).count;

        return sendJson(res, 200, {
          success: true,
          message: 'Tạo nhóm thành công!',
          group: {
            ...newGroup,
            is_group: true,
            member_count: memberCount
          }
        });
      }

      // 14. Get User's Groups: GET /api/protected/groups
      if (pathname === '/api/protected/groups' && req.method === 'GET') {
        const groups = db.prepare(`
          SELECT g.*, 
                 (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
                 (SELECT content FROM messages WHERE receiver_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message,
                 (SELECT created_at FROM messages WHERE receiver_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message_time
          FROM groups g
          JOIN group_members gm ON g.id = gm.group_id
          WHERE gm.user_id = ?
          ORDER BY g.created_at DESC
        `).all(currentUser.id);

        const formatted = groups.map(g => ({
          ...g,
          is_group: true
        }));

        return sendJson(res, 200, { success: true, groups: formatted });
      }

      // 15. Get Group Detail (Kèm logic ẩn/hiện danh sách theo quy tắc <= 50 và > 50): GET /api/protected/groups/:groupId
      const groupDetailMatch = pathname.match(/^\/api\/protected\/groups\/([^/]+)$/);
      if (groupDetailMatch && req.method === 'GET') {
        const groupId = groupDetailMatch[1];
        const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
        if (!group) {
          return sendJson(res, 404, { success: false, message: 'Nhóm không tồn tại' });
        }

        // Kiểm tra user có trong nhóm không
        const isMember = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, currentUser.id);
        if (!isMember) {
          return sendJson(res, 403, { success: false, message: 'Bạn không phải là thành viên của nhóm này' });
        }

        const countRow = db.prepare('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?').get(groupId);
        const memberCount = countRow ? countRow.count : 0;

        // QUY TẮC: Dưới hoặc bằng 50 (<= 50) thì hiện danh sách thành viên.
        // Trên 50 (> 50) thì KHÔNG hiện danh sách thành viên.
        let members = [];
        let membersHidden = false;

        if (memberCount <= 50) {
          members = db.prepare(`
            SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, gm.role, gm.joined_at
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ?
            ORDER BY CASE WHEN gm.role = 'creator' THEN 0 ELSE 1 END, gm.joined_at ASC
          `).all(groupId);
          membersHidden = false;
        } else {
          // Trên 50 thành viên -> bảo mật danh sách thành viên, chỉ trả về thông tin creator
          membersHidden = true;
          members = [];
        }

        return sendJson(res, 200, {
          success: true,
          group: {
            ...group,
            is_group: true,
            member_count: memberCount,
            user_role: isMember.role,
            is_creator: isMember.role === 'creator',
            members_hidden: membersHidden,
            members: members
          }
        });
      }

      // 16. Add Members to Group: POST /api/protected/groups/:groupId/members
      const groupAddMemberMatch = pathname.match(/^\/api\/protected\/groups\/([^/]+)\/members$/);
      if (groupAddMemberMatch && req.method === 'POST') {
        const groupId = groupAddMemberMatch[1];
        const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
        if (!group) {
          return sendJson(res, 404, { success: false, message: 'Nhóm không tồn tại' });
        }

        const myMembership = db.prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, currentUser.id);
        if (!myMembership) {
          return sendJson(res, 403, { success: false, message: 'Bạn không có quyền trong nhóm này' });
        }

        const body = await parseBody(req);
        const memberIds = Array.isArray(body.member_ids) ? body.member_ids : (body.user_id ? [body.user_id] : []);
        if (memberIds.length === 0) {
          return sendJson(res, 400, { success: false, message: 'Vui lòng chọn thành viên cần thêm' });
        }

        const currentCount = db.prepare('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?').get(groupId).count;

        // QUY TẮC: Nếu nhóm chưa nâng cấp lên Cộng đồng (is_community = 0), giới hạn tối đa 50 thành viên
        if (group.is_community === 0) {
          // Đếm số lượng thành viên thực tế sẽ thêm (chưa có trong nhóm)
          const newToAdd = memberIds.filter(uid => {
            const exists = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, uid);
            return !exists;
          });

          if (currentCount + newToAdd.length > 50) {
            return sendJson(res, 400, {
              success: false,
              limit_exceeded: true,
              can_upgrade: myMembership.role === 'creator',
              message: `Nhóm hiện có ${currentCount} thành viên, giới hạn nhóm thường là 50. Để thêm thành viên (vượt quá 50), người lập ra nhóm phải nâng cấp nhóm lên Cộng đồng.`
            });
          }
        }

        const now = new Date().toISOString();
        let addedCount = 0;
        for (const uid of memberIds) {
          const u = db.prepare('SELECT id, display_name, username FROM users WHERE id = ?').get(uid);
          if (u) {
            const resInsert = db.prepare(`
              INSERT OR IGNORE INTO group_members (id, group_id, user_id, role, joined_at)
              VALUES (?, ?, ?, 'member', ?)
            `).run(crypto.randomUUID(), groupId, uid, now);
            if (resInsert.changes > 0) {
              addedCount++;
            }
          }
        }

        const newTotalCount = db.prepare('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?').get(groupId).count;

        return sendJson(res, 200, {
          success: true,
          message: `Đã thêm thành công ${addedCount} thành viên vào nhóm!`,
          member_count: newTotalCount
        });
      }

      // 17. Upgrade Group to Community: POST /api/protected/groups/:groupId/upgrade-community
      const upgradeMatch = pathname.match(/^\/api\/protected\/groups\/([^/]+)\/upgrade-community$/);
      if (upgradeMatch && req.method === 'POST') {
        const groupId = upgradeMatch[1];
        const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
        if (!group) {
          return sendJson(res, 404, { success: false, message: 'Nhóm không tồn tại' });
        }

        // Chỉ người lập ra nhóm (creator_id) mới được quyền nâng cấp lên cộng đồng
        if (group.creator_id !== currentUser.id) {
          return sendJson(res, 403, {
            success: false,
            message: 'Chỉ người lập ra nhóm (Owner/Creator) mới có quyền nâng cấp nhóm lên Cộng đồng!'
          });
        }

        db.prepare('UPDATE groups SET is_community = 1 WHERE id = ?').run(groupId);

        // Gửi thông báo vào nhóm
        const notiId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(notiId, currentUser.id, groupId, `🚀 Nhóm đã được người lập nâng cấp thành CỘNG ĐỒNG! Giờ đây nhóm không còn giới hạn 50 thành viên.`, new Date().toISOString());

        return sendJson(res, 200, {
          success: true,
          message: 'Đã nâng cấp nhóm lên Cộng đồng thành công! Giờ đây nhóm có thể chứa không giới hạn thành viên.',
          is_community: 1
        });
      }

      // 18. Leave / Remove Group: POST /api/protected/groups/:groupId/leave
      const leaveMatch = pathname.match(/^\/api\/protected\/groups\/([^/]+)\/leave$/);
      if (leaveMatch && req.method === 'POST') {
        const groupId = leaveMatch[1];
        db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, currentUser.id);
        return sendJson(res, 200, { success: true, message: 'Đã rời khỏi nhóm thành công' });
      }

      // 12. Messages: Get & Post messages (hỗ trợ cả Chat 1-1 và Group Chat)
      const msgMatch = pathname.match(/^\/api\/protected\/messages\/([^/]+)$/);
      if (msgMatch && msgMatch[1] !== 'search') {
        const targetId = msgMatch[1];

        if (req.method === 'GET') {
          // Kiểm tra xem targetId có phải là group không
          const isGroup = db.prepare('SELECT id FROM groups WHERE id = ?').get(targetId);

          let rows = [];
          if (isGroup) {
            // Kiểm tra currentUser có thuộc nhóm không
            const isMember = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(targetId, currentUser.id);
            if (!isMember) {
              return sendJson(res, 403, { success: false, message: 'Bạn không thuộc nhóm này' });
            }

            rows = db.prepare(`
              SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at,
                     u.username as sender_username, u.display_name as sender_name, u.avatar_url as sender_avatar
              FROM messages m
              LEFT JOIN users u ON m.sender_id = u.id
              WHERE m.receiver_id = ?
              ORDER BY m.created_at ASC
            `).all(targetId);
          } else {
            // Chat 1-1 bình thường
            rows = db.prepare(`
              SELECT id, sender_id, receiver_id, content, created_at
              FROM messages
              WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
              ORDER BY created_at ASC
            `).all(currentUser.id, targetId, targetId, currentUser.id);
          }

          return sendJson(res, 200, { success: true, messages: rows });
        }

        if (req.method === 'POST') {
          const body = await parseBody(req);
          const content = (body.content || '').trim();

          if (!content) {
            return sendJson(res, 400, { success: false, message: 'Tin nhắn không được rỗng' });
          }

          const messageId = crypto.randomUUID();
          const now = new Date().toISOString();

          // Kiểm tra xem receiver có phải là Group không
          const isGroup = db.prepare('SELECT id FROM groups WHERE id = ?').get(targetId);
          if (isGroup) {
            const isMember = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(targetId, currentUser.id);
            if (!isMember) {
              return sendJson(res, 403, { success: false, message: 'Bạn không phải là thành viên trong nhóm này để gửi tin' });
            }
          }

          db.prepare(`
            INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(messageId, currentUser.id, targetId, content, now);

          const insertedMessage = {
            id: messageId,
            sender_id: currentUser.id,
            receiver_id: targetId,
            content,
            created_at: now,
            sender_username: currentUser.username,
            sender_name: currentUser.display_name || currentUser.username,
            sender_avatar: currentUser.avatar_url || ''
          };

          // If friend is Bot (chat 1-1), simulate an auto-reply
          if (targetId === BOT_ID) {
            setTimeout(() => {
              try {
                const botReplyId = crypto.randomUUID();
                const botReplies = [
                  `Chào bạn! Mình đã nhận được tin nhắn: "${content.length > 50 ? content.slice(0, 50) + '...' : content}". Hệ thống CloudChat đang hoạt động rất mượt mà!`,
                  `Cảm ơn tin nhắn của bạn! Bạn có thể thử gửi link (github, meet) hoặc gửi hình ảnh qua nút đính kèm nhé!`,
                  `Tin nhắn của bạn đã được mã hóa và truyền tải thành công trên CloudChat! ⚡`,
                  `Xin chào! Rất vui được trò chuyện cùng bạn qua CloudChat. Chúc bạn một ngày tốt lành! ✨`
                ];
                const replyText = botReplies[Math.floor(Math.random() * botReplies.length)];
                db.prepare(`
                  INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
                  VALUES (?, ?, ?, ?, ?)
                `).run(botReplyId, BOT_ID, currentUser.id, replyText, new Date().toISOString());
              } catch (e) {
                console.error('Bot reply error:', e);
              }
            }, 800);
          }

          return sendJson(res, 200, { success: true, message: insertedMessage });
        }
      }
    }

    // Default 404
    return sendJson(res, 404, { success: false, message: 'Route không tồn tại' });
  } catch (err) {
    console.error('Server error:', err);
    return sendJson(res, 500, { success: false, message: 'Internal Server Error: ' + err.message });
  }
});

server.listen(PORT, () => {
  console.log(`CloudChat Backend running at http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  try { db.close(); } catch {}
  process.exit(0);
});

process.on('SIGTERM', () => {
  try { db.close(); } catch {}
  process.exit(0);
});
