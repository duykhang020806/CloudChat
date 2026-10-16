import { Hono } from "hono";
import { cors } from "hono/cors";
import { sign } from "hono/jwt";
import { jwt } from "hono/jwt";

import {
  hashPassword,
  verifyPassword,
} from "./lib/password";

interface Env {
  cloudchat: D1Database;
  MY_DURABLE_OBJECT: DurableObjectNamespace;
  JWT_SECRET: string;
}

interface Variables {
  jwtPayload: {
    sub: string;
    username: string;
  };
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      return origin;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// JWT authentication middleware
app.use("/api/protected/*", async (c, next) => {
  const middleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: "HS256",
  });

  await middleware(c, async () => {
    try {
      const payload = c.get("jwtPayload");
      if (payload && payload.sub) {
        c.env.cloudchat
          .prepare("UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(Number(payload.sub))
          .run()
          .catch(() => {});
      }
    } catch {}
    await next();
  });
});

// Protected get current user API
app.get("/api/protected/me", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);

    const user = await c.env.cloudchat
      .prepare(
        "SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE id = ?"
      )
      .bind(currentUserId)
      .first<{
        id: number;
        username: string;
        display_name: string | null;
        bio: string | null;
        avatar_url: string | null;
        created_at: string;
      }>();

    if (!user) {
      return c.json(
        {
          success: false,
          message: "Người dùng không tồn tại",
        },
        404
      );
    }

    return c.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    return c.json(
      {
        success: false,
        message: "Lỗi khi lấy thông tin người dùng",
      },
      500
    );
  }
});

// Update personal information
app.put("/api/protected/profile", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);

    const body = await c.req.json<{
      display_name?: string;
      bio?: string;
      avatar_url?: string;
    }>();

    const displayName =
      body.display_name !== undefined ? body.display_name.trim() : undefined;
    const bio = body.bio !== undefined ? body.bio.trim() : undefined;
    const avatarUrl =
      body.avatar_url !== undefined ? body.avatar_url.trim() : undefined;

    if (displayName !== undefined && displayName.length > 50) {
      return c.json(
        {
          success: false,
          message: "Tên hiển thị tối đa 50 ký tự",
        },
        400
      );
    }

    if (bio !== undefined && bio.length > 200) {
      return c.json(
        {
          success: false,
          message: "Tiểu sử tối đa 200 ký tự",
        },
        400
      );
    }

    // Get current values to handle partial updates cleanly
    const existing = await c.env.cloudchat
      .prepare("SELECT display_name, bio, avatar_url FROM users WHERE id = ?")
      .bind(currentUserId)
      .first<{
        display_name: string | null;
        bio: string | null;
        avatar_url: string | null;
      }>();

    if (!existing) {
      return c.json({ success: false, message: "Người dùng không tồn tại" }, 404);
    }

    const newDisplayName = displayName !== undefined ? displayName : existing.display_name;
    const newBio = bio !== undefined ? bio : existing.bio;
    const newAvatarUrl = avatarUrl !== undefined ? avatarUrl : existing.avatar_url;

    await c.env.cloudchat
      .prepare(
        `UPDATE users
         SET display_name = ?,
             bio = ?,
             avatar_url = ?
         WHERE id = ?`
      )
      .bind(newDisplayName || null, newBio || null, newAvatarUrl || null, currentUserId)
      .run();

    const updatedUser = await c.env.cloudchat
      .prepare(
        "SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE id = ?"
      )
      .bind(currentUserId)
      .first<{
        id: number;
        username: string;
        display_name: string | null;
        bio: string | null;
        avatar_url: string | null;
        created_at: string;
      }>();

    return c.json({
      success: true,
      message: "Cập nhật thông tin cá nhân thành công",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return c.json(
      {
        success: false,
        message: "Có lỗi xảy ra khi cập nhật thông tin cá nhân",
      },
      500
    );
  }
});

// Change password
app.post("/api/protected/profile/change-password", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);

    const body = await c.req.json<{
      current_password?: string;
      new_password?: string;
    }>();

    const currentPassword = body.current_password;
    const newPassword = body.new_password;

    if (!currentPassword || !newPassword) {
      return c.json(
        {
          success: false,
          message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới",
        },
        400
      );
    }

    if (newPassword.length < 6) {
      return c.json(
        {
          success: false,
          message: "Mật khẩu mới phải có ít nhất 6 ký tự",
        },
        400
      );
    }

    const user = await c.env.cloudchat
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .bind(currentUserId)
      .first<{ password_hash: string }>();

    if (!user) {
      return c.json(
        {
          success: false,
          message: "Người dùng không tồn tại",
        },
        404
      );
    }

    const passwordCorrect = await verifyPassword(
      currentPassword,
      user.password_hash
    );

    if (!passwordCorrect) {
      return c.json(
        {
          success: false,
          message: "Mật khẩu hiện tại không chính xác",
        },
        400
      );
    }

    const newHash = await hashPassword(newPassword);

    await c.env.cloudchat
      .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .bind(newHash, currentUserId)
      .run();

    return c.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    console.error(error);
    return c.json(
      {
        success: false,
        message: "Có lỗi xảy ra khi đổi mật khẩu",
      },
      500
    );
  }
});

// Search user by username
app.get("/api/protected/users/search", async (c) => {
  const username = c.req.query("username")?.trim();

  if (!username) {
    return c.json(
      {
        success: false,
        message: "Vui lòng nhập username",
      },
      400
    );
  }

  const payload = c.get("jwtPayload");
  const currentUserId = Number(payload.sub);

  const user = await c.env.cloudchat
    .prepare(
      "SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE username = ? AND id != ?"
    )
    .bind(username, currentUserId)
    .first<{
      id: number;
      username: string;
      display_name: string | null;
      bio: string | null;
      avatar_url: string | null;
      created_at: string;
    }>();

  if (!user) {
    return c.json(
      {
        success: false,
        message: "Không tìm thấy user",
      },
      404
    );
  }

  return c.json({
    success: true,
    user,
  });
});
// Send friend request
app.post("/api/protected/friends/request/:friendId", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);

    const friendId = Number(c.req.param("friendId"));

    if (!Number.isInteger(friendId) || friendId <= 0) {
      return c.json(
        {
          success: false,
          message: "ID người dùng không hợp lệ",
        },
        400
      );
    }

    if (currentUserId === friendId) {
      return c.json(
        {
          success: false,
          message: "Không thể kết bạn với chính mình",
        },
        400
      );
    }

    // Check target user
    const targetUser = await c.env.cloudchat
      .prepare("SELECT id, username FROM users WHERE id = ?")
      .bind(friendId)
      .first<{
        id: number;
        username: string;
      }>();

    if (!targetUser) {
      return c.json(
        {
          success: false,
          message: "Không tìm thấy người dùng",
        },
        404
      );
    }

    // Check existing relationship
    const existing = await c.env.cloudchat
      .prepare(
        `SELECT id, user_id, friend_id, status
         FROM friendships
         WHERE
           (user_id = ? AND friend_id = ?)
           OR
           (user_id = ? AND friend_id = ?)
         LIMIT 1`
      )
      .bind(
        currentUserId,
        friendId,
        friendId,
        currentUserId
      )
      .first<{
        id: number;
        user_id: number;
        friend_id: number;
        status: "pending" | "accepted" | "rejected";
      }>();

    if (existing) {
      if (existing.status === "accepted") {
        return c.json(
          {
            success: false,
            message: "Hai người đã là bạn bè",
          },
          409
        );
      }

      if (existing.status === "pending") {
        return c.json(
          {
            success: false,
            message: "Lời mời kết bạn đã tồn tại",
          },
          409
        );
      }

      // Nếu lời mời cũ đã bị rejected thì cho phép gửi lại
      await c.env.cloudchat
        .prepare(
          `UPDATE friendships
           SET user_id = ?, friend_id = ?, status = 'pending'
           WHERE id = ?`
        )
        .bind(currentUserId, friendId, existing.id)
        .run();

      return c.json({
        success: true,
        message: "Đã gửi lại lời mời kết bạn",
        friendship: {
          id: existing.id,
          user_id: currentUserId,
          friend_id: friendId,
          status: "pending",
        },
      });
    }

    // Create new friend request
    const result = await c.env.cloudchat
      .prepare(
        `INSERT INTO friendships
         (user_id, friend_id, status)
         VALUES (?, ?, 'pending')`
      )
      .bind(currentUserId, friendId)
      .run();

    return c.json(
      {
        success: true,
        message: "Đã gửi lời mời kết bạn",
        friendship: {
          id: result.meta.last_row_id,
          user_id: currentUserId,
          friend_id: friendId,
          status: "pending",
        },
      },
      201
    );
  } catch (error) {
    console.error(error);

    return c.json(
      {
        success: false,
        message: "Có lỗi xảy ra khi gửi lời mời kết bạn",
      },
      500
    );
  }
});

app.get("/api/protected/friends/requests", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);

    const requests = await c.env.cloudchat
      .prepare(
        `SELECT
          f.id,
          f.user_id,
          f.friend_id,
          f.status,
          f.created_at,
          u.username,
          u.display_name,
          u.avatar_url,
          u.bio
         FROM friendships f
         JOIN users u ON u.id = f.user_id
         WHERE f.friend_id = ?
           AND f.status = 'pending'
         ORDER BY f.created_at DESC`
      )
      .bind(currentUserId)
      .all();

    return c.json({
      success: true,
      requests: requests.results,
    });
  } catch (error) {
    console.error(error);

    return c.json(
      {
        success: false,
        message: "Không thể lấy lời mời kết bạn",
      },
      500
    );
  }
});

app.get("/api/protected/friends/requests/sent", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);

    const requests = await c.env.cloudchat
      .prepare(
        `SELECT
          f.id,
          f.user_id,
          f.friend_id,
          f.status,
          f.created_at,
          u.username,
          u.display_name,
          u.avatar_url,
          u.bio
         FROM friendships f
         JOIN users u ON u.id = f.friend_id
         WHERE f.user_id = ?
           AND f.status = 'pending'
         ORDER BY f.created_at DESC`
      )
      .bind(currentUserId)
      .all();

    return c.json({
      success: true,
      requests: requests.results,
    });
  } catch (error) {
    console.error(error);

    return c.json(
      {
        success: false,
        message: "Không thể lấy lời mời đã gửi",
      },
      500
    );
  }
});

app.post("/api/protected/friends/:friendshipId/cancel", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const friendshipId = Number(c.req.param("friendshipId"));

    if (!Number.isInteger(friendshipId) || friendshipId <= 0) {
      return c.json(
        {
          success: false,
          message: "ID lời mời không hợp lệ",
        },
        400
      );
    }

    const friendship = await c.env.cloudchat
      .prepare(
        `SELECT id, user_id, friend_id, status
         FROM friendships
         WHERE id = ?
           AND user_id = ?
         LIMIT 1`
      )
      .bind(friendshipId, currentUserId)
      .first<{
        id: number;
        user_id: number;
        friend_id: number;
        status: string;
      }>();

    if (!friendship) {
      return c.json(
        {
          success: false,
          message: "Không tìm thấy lời mời đã gửi",
        },
        404
      );
    }

    if (friendship.status !== "pending") {
      return c.json(
        {
          success: false,
          message: "Lời mời này đã được chấp nhận hoặc không còn khả dụng",
        },
        400
      );
    }

    await c.env.cloudchat
      .prepare(`DELETE FROM friendships WHERE id = ?`)
      .bind(friendshipId)
      .run();

    return c.json({
      success: true,
      message: "Đã thu hồi lời mời kết bạn",
    });
  } catch (error) {
    console.error(error);

    return c.json(
      {
        success: false,
        message: "Không thể thu hồi lời mời kết bạn",
      },
      500
    );
  }
});

app.post("/api/protected/friends/:friendshipId/reject", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const friendshipId = Number(c.req.param("friendshipId"));

    if (!Number.isInteger(friendshipId) || friendshipId <= 0) {
      return c.json(
        {
          success: false,
          message: "ID lời mời không hợp lệ",
        },
        400
      );
    }

    const friendship = await c.env.cloudchat
      .prepare(
        `SELECT id, user_id, friend_id, status
         FROM friendships
         WHERE id = ?
           AND friend_id = ?
         LIMIT 1`
      )
      .bind(friendshipId, currentUserId)
      .first<{
        id: number;
        user_id: number;
        friend_id: number;
        status: string;
      }>();

    if (!friendship) {
      return c.json(
        {
          success: false,
          message: "Không tìm thấy lời mời",
        },
        404
      );
    }

    await c.env.cloudchat
      .prepare(`DELETE FROM friendships WHERE id = ?`)
      .bind(friendshipId)
      .run();

    return c.json({
      success: true,
      message: "Đã từ chối lời mời kết bạn",
    });
  } catch (error) {
    console.error(error);

    return c.json(
      {
        success: false,
        message: "Không thể từ chối lời mời",
      },
      500
    );
  }
});
app.post("/api/protected/friends/:friendshipId/accept", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const friendshipId = Number(c.req.param("friendshipId"));

    if (!Number.isInteger(friendshipId) || friendshipId <= 0) {
      return c.json(
        {
          success: false,
          message: "ID lời mời không hợp lệ",
        },
        400
      );
    }

    const friendship = await c.env.cloudchat
      .prepare(
        `SELECT id, user_id, friend_id, status
         FROM friendships
         WHERE id = ?
           AND friend_id = ?
         LIMIT 1`
      )
      .bind(friendshipId, currentUserId)
      .first<{
        id: number;
        user_id: number;
        friend_id: number;
        status: string;
      }>();

    if (!friendship) {
      return c.json(
        {
          success: false,
          message: "Không tìm thấy lời mời",
        },
        404
      );
    }

    if (friendship.status !== "pending") {
      return c.json(
        {
          success: false,
          message: "Lời mời này không còn ở trạng thái chờ",
        },
        409
      );
    }

    await c.env.cloudchat
      .prepare(
        `UPDATE friendships
         SET status = 'accepted'
         WHERE id = ?`
      )
      .bind(friendshipId)
      .run();

    return c.json({
      success: true,
      message: "Đã chấp nhận lời mời kết bạn",
    });
  } catch (error) {
    console.error(error);

    return c.json(
      {
        success: false,
        message: "Không thể chấp nhận lời mời",
      },
      500
    );
  }
});
app.get("/api/protected/friends", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);

    const friends = await c.env.cloudchat
      .prepare(
        `SELECT
          u.id,
          u.username,
          u.display_name,
          u.bio,
          u.avatar_url,
          u.last_seen,
          CASE
            WHEN u.last_seen IS NOT NULL AND (strftime('%s', 'now') - strftime('%s', u.last_seen)) <= 120 THEN 1
            ELSE 0
          END AS is_online,
          f.id AS friendship_id,
          f.created_at,
          (
            SELECT m.content
            FROM messages m
            WHERE (m.sender_id = ? AND m.receiver_id = u.id)
               OR (m.sender_id = u.id AND m.receiver_id = ?)
            ORDER BY m.id DESC
            LIMIT 1
          ) AS last_message,
          (
            SELECT m.created_at
            FROM messages m
            WHERE (m.sender_id = ? AND m.receiver_id = u.id)
               OR (m.sender_id = u.id AND m.receiver_id = ?)
            ORDER BY m.id DESC
            LIMIT 1
          ) AS last_message_time,
          (
            SELECT m.sender_id
            FROM messages m
            WHERE (m.sender_id = ? AND m.receiver_id = u.id)
               OR (m.sender_id = u.id AND m.receiver_id = ?)
            ORDER BY m.id DESC
            LIMIT 1
          ) AS last_message_sender_id,
          (
            SELECT m.is_read
            FROM messages m
            WHERE (m.sender_id = ? AND m.receiver_id = u.id)
               OR (m.sender_id = u.id AND m.receiver_id = ?)
            ORDER BY m.id DESC
            LIMIT 1
          ) AS last_message_is_read
         FROM friendships f
         JOIN users u
           ON u.id = CASE
             WHEN f.user_id = ? THEN f.friend_id
             ELSE f.user_id
           END
         WHERE
           (f.user_id = ? OR f.friend_id = ?)
           AND f.status = 'accepted'
         ORDER BY
           COALESCE(
             (SELECT m.id FROM messages m WHERE (m.sender_id = ? AND m.receiver_id = u.id) OR (m.sender_id = u.id AND m.receiver_id = ?) ORDER BY m.id DESC LIMIT 1),
             0
           ) DESC,
           f.created_at DESC`
      )
      .bind(...Array(13).fill(currentUserId))
      .all();

    return c.json({
      success: true,
      friends: friends.results,
    });
  } catch (error) {
    console.error(error);

    return c.json(
      {
        success: false,
        message: "Không thể lấy danh sách bạn bè",
      },
      500
    );
  }
});

// 11.6 Search Messages & Users & Groups & Suggestions
app.get("/api/protected/messages/search", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const q = (c.req.query("q") || "").trim();
    const qLower = q.toLowerCase();

    if (!q) {
      return c.json({ success: true, results: [], users: [], groups: [], suggestions: [] });
    }

    // 1. Tìm người dùng khớp username hoặc display_name
    const matchedUsers = await c.env.cloudchat
      .prepare(
        `SELECT id, username, display_name, bio, avatar_url
         FROM users
         WHERE id != ? AND (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?)
         LIMIT 10`
      )
      .bind(currentUserId, `%${qLower}%`, `%${qLower}%`)
      .all<{ id: number; username: string; display_name: string; bio: string; avatar_url: string }>();

    const userResults = await Promise.all(
      (matchedUsers.results || []).map(async (u) => {
        const isFriend = await c.env.cloudchat
          .prepare(
            `SELECT id FROM friendships
             WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
               AND status = 'accepted'
             LIMIT 1`
          )
          .bind(currentUserId, u.id, u.id, currentUserId)
          .first();

        return {
          ...u,
          is_friend: Boolean(isFriend),
          is_user: true,
        };
      })
    );

    // 2. Tìm nhóm chat mà user tham gia khớp tên nhóm
    const matchedGroups = await c.env.cloudchat
      .prepare(
        `SELECT g.id, g.name, g.avatar_url, g.is_community,
                (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
         FROM groups g
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ? AND LOWER(g.name) LIKE ?
         LIMIT 10`
      )
      .bind(currentUserId, `%${qLower}%`)
      .all();

    const groupResults = (matchedGroups.results || []).map((g) => ({
      ...g,
      is_group: true,
    }));

    // 3. Tìm tin nhắn 1-1 khớp từ khóa
    const directMsgs = await c.env.cloudchat
      .prepare(
        `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at,
                u.id AS friend_id, u.username, u.display_name, u.avatar_url
         FROM messages m
         JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
         WHERE (m.sender_id = ? OR m.receiver_id = ?) AND LOWER(m.content) LIKE ?
         ORDER BY m.created_at DESC
         LIMIT 50`
      )
      .bind(currentUserId, currentUserId, currentUserId, `%${qLower}%`)
      .all<{
        id: number;
        sender_id: number;
        receiver_id: number;
        content: string;
        created_at: string;
        friend_id: number;
        username: string;
        display_name: string;
        avatar_url: string;
      }>();

    // Tìm tin nhắn nhóm khớp từ khóa
    const grpMsgs = await c.env.cloudchat
      .prepare(
        `SELECT gm_msg.id, gm_msg.sender_id, gm_msg.group_id AS receiver_id, gm_msg.content, gm_msg.created_at,
                g.id AS friend_id, g.name AS username, g.name AS display_name, g.avatar_url, 1 AS is_group
         FROM group_messages gm_msg
         JOIN groups g ON g.id = gm_msg.group_id
         JOIN group_members mem ON mem.group_id = gm_msg.group_id AND mem.user_id = ?
         WHERE LOWER(gm_msg.content) LIKE ?
         ORDER BY gm_msg.created_at DESC
         LIMIT 50`
      )
      .bind(currentUserId, `%${qLower}%`)
      .all<{
        id: number;
        sender_id: number;
        receiver_id: string;
        content: string;
        created_at: string;
        friend_id: string;
        username: string;
        display_name: string;
        avatar_url: string;
        is_group: number;
      }>();

    const combinedMsgs = [
      ...(directMsgs.results || []).map((m) => ({ ...m, is_group: false })),
      ...(grpMsgs.results || []).map((m) => ({ ...m, is_group: true })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);

    // 4. Trích xuất từ khóa gợi ý
    const suggestionsSet = new Set<string>();
    for (const m of combinedMsgs) {
      if (!m.content || m.content.startsWith("data:") || m.content.startsWith("{")) continue;
      const contentText = m.content.replace(/\s+/g, " ");
      const lowerText = contentText.toLowerCase();
      let pos = lowerText.indexOf(qLower);
      let count = 0;
      while (pos !== -1 && count < 3) {
        const startIdx = Math.max(0, pos - 20);
        const endIdx = Math.min(contentText.length, pos + qLower.length + 25);
        let phrase = contentText.slice(startIdx, endIdx).trim();
        phrase = phrase.replace(/^[^\w\s\u00C0-\u1EF9]+|[^\w\s\u00C0-\u1EF9]+$/g, "").trim();
        if (phrase && phrase.toLowerCase() !== qLower && phrase.length >= qLower.length) {
          suggestionsSet.add(phrase);
        }
        pos = lowerText.indexOf(qLower, pos + qLower.length + 1);
        count++;
      }
      if (suggestionsSet.size >= 8) break;
    }

    return c.json({
      success: true,
      results: combinedMsgs,
      users: userResults,
      groups: groupResults,
      suggestions: Array.from(suggestionsSet).slice(0, 6),
    });
  } catch (error) {
    console.error(error);
    return c.json(
      { success: false, message: "Lỗi tìm kiếm tin nhắn", results: [], users: [], groups: [], suggestions: [] },
      500
    );
  }
});

// 11.7 Delete Message
app.delete("/api/protected/messages/:messageId", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const messageId = c.req.param("messageId");

    // 1. Kiểm tra bảng tin nhắn 1-1
    const msg = await c.env.cloudchat
      .prepare("SELECT id, sender_id, receiver_id FROM messages WHERE id = ?")
      .bind(messageId)
      .first<{ id: number; sender_id: number; receiver_id: number }>();

    if (msg) {
      if (msg.sender_id === currentUserId || msg.receiver_id === currentUserId) {
        await c.env.cloudchat
          .prepare("DELETE FROM messages WHERE id = ?")
          .bind(messageId)
          .run();
        return c.json({ success: true, message: "Đã xóa tin nhắn thành công", deleted_id: messageId });
      }
      return c.json({ success: false, message: "Bạn không có quyền xóa tin nhắn này" }, 403);
    }

    // 2. Kiểm tra bảng group_messages
    const grpMsg = await c.env.cloudchat
      .prepare("SELECT id, group_id, sender_id FROM group_messages WHERE id = ?")
      .bind(messageId)
      .first<{ id: number; group_id: string; sender_id: number }>();

    if (grpMsg) {
      const membership = await c.env.cloudchat
        .prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?")
        .bind(grpMsg.group_id, currentUserId)
        .first<{ role: string }>();

      if (membership) {
        await c.env.cloudchat
          .prepare("DELETE FROM group_messages WHERE id = ?")
          .bind(messageId)
          .run();
        return c.json({ success: true, message: "Đã xóa tin nhắn thành công", deleted_id: messageId });
      }
      return c.json({ success: false, message: "Bạn không thuộc nhóm này" }, 403);
    }

    return c.json({ success: false, message: "Tin nhắn không tồn tại hoặc đã bị xóa" }, 404);
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Lỗi xóa tin nhắn" }, 500);
  }
});

// ==================== GROUP CHAT APIs ====================
// 13. Create Group
app.post("/api/protected/groups", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const body = await c.req.json<{
      name?: string;
      avatar_url?: string;
      member_ids?: number[];
    }>();

    const name = (body.name || "").trim();
    const avatarUrl =
      (body.avatar_url || "").trim() ||
      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name || "group")}`;
    const initialMemberIds = Array.isArray(body.member_ids)
      ? body.member_ids.filter((id) => id && Number(id) !== currentUserId)
      : [];

    if (!name) {
      return c.json({ success: false, message: "Tên nhóm không được để trống" }, 400);
    }

    const totalInitial = 1 + initialMemberIds.length;
    if (totalInitial > 50) {
      return c.json(
        {
          success: false,
          message: `Nhóm thường giới hạn tối đa 50 thành viên (bạn đang chọn ${totalInitial} người). Người tạo nhóm cần nâng cấp lên Cộng đồng để thêm nhiều hơn.`,
        },
        400
      );
    }

    const groupId = "group_" + crypto.randomUUID();

    await c.env.cloudchat
      .prepare(
        `INSERT INTO groups (id, name, avatar_url, creator_id, is_community)
         VALUES (?, ?, ?, ?, 0)`
      )
      .bind(groupId, name, avatarUrl, currentUserId)
      .run();

    await c.env.cloudchat
      .prepare(
        `INSERT INTO group_members (id, group_id, user_id, role)
         VALUES (?, ?, ?, 'creator')`
      )
      .bind(crypto.randomUUID(), groupId, currentUserId)
      .run();

    for (const mid of initialMemberIds) {
      const userExists = await c.env.cloudchat
        .prepare("SELECT id FROM users WHERE id = ?")
        .bind(Number(mid))
        .first();
      if (userExists) {
        await c.env.cloudchat
          .prepare(
            `INSERT OR IGNORE INTO group_members (id, group_id, user_id, role)
             VALUES (?, ?, ?, 'member')`
          )
          .bind(crypto.randomUUID(), groupId, Number(mid))
          .run();
      }
    }

    await c.env.cloudchat
      .prepare(
        `INSERT INTO group_messages (group_id, sender_id, content)
         VALUES (?, ?, ?)`
      )
      .bind(groupId, currentUserId, `🎉 Nhóm "${name}" đã được tạo. Chào mừng các thành viên!`)
      .run();

    const newGroup = await c.env.cloudchat
      .prepare("SELECT * FROM groups WHERE id = ?")
      .bind(groupId)
      .first();

    const countRow = await c.env.cloudchat
      .prepare("SELECT COUNT(*) AS count FROM group_members WHERE group_id = ?")
      .bind(groupId)
      .first<{ count: number }>();

    return c.json({
      success: true,
      message: "Tạo nhóm thành công!",
      group: {
        ...newGroup,
        is_group: true,
        member_count: countRow?.count || 1,
      },
    });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Không thể tạo nhóm" }, 500);
  }
});

// 14. Get User's Groups
app.get("/api/protected/groups", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);

    const groups = await c.env.cloudchat
      .prepare(
        `SELECT g.*,
                (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
                (SELECT content FROM group_messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT created_at FROM group_messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) AS last_message_time
         FROM groups g
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ?
         ORDER BY g.created_at DESC`
      )
      .bind(currentUserId)
      .all();

    const formatted = (groups.results || []).map((g) => ({
      ...g,
      is_group: true,
    }));

    return c.json({ success: true, groups: formatted });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Không thể lấy danh sách nhóm" }, 500);
  }
});

// 15. Get Group Detail
app.get("/api/protected/groups/:groupId", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const groupId = c.req.param("groupId");

    const group = await c.env.cloudchat
      .prepare("SELECT * FROM groups WHERE id = ?")
      .bind(groupId)
      .first<{ id: string; name: string; avatar_url: string; creator_id: number; is_community: number; created_at: string }>();

    if (!group) {
      return c.json({ success: false, message: "Nhóm không tồn tại" }, 404);
    }

    const isMember = await c.env.cloudchat
      .prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?")
      .bind(groupId, currentUserId)
      .first<{ role: string }>();

    if (!isMember) {
      return c.json({ success: false, message: "Bạn không phải là thành viên của nhóm này" }, 403);
    }

    const countRow = await c.env.cloudchat
      .prepare("SELECT COUNT(*) AS count FROM group_members WHERE group_id = ?")
      .bind(groupId)
      .first<{ count: number }>();
    const memberCount = countRow?.count || 0;

    let members: any[] = [];
    let membersHidden = false;

    if (memberCount <= 50) {
      const rows = await c.env.cloudchat
        .prepare(
          `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, gm.role, gm.joined_at
           FROM group_members gm
           JOIN users u ON gm.user_id = u.id
           WHERE gm.group_id = ?
           ORDER BY CASE WHEN gm.role = 'creator' THEN 0 ELSE 1 END, gm.joined_at ASC`
        )
        .bind(groupId)
        .all();
      members = rows.results || [];
      membersHidden = false;
    } else {
      membersHidden = true;
      members = [];
    }

    return c.json({
      success: true,
      group: {
        ...group,
        is_group: true,
        member_count: memberCount,
        user_role: isMember.role,
        is_creator: isMember.role === "creator",
        members_hidden: membersHidden,
        members,
      },
    });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Không thể lấy thông tin nhóm" }, 500);
  }
});

// 16. Add Members to Group
app.post("/api/protected/groups/:groupId/members", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const groupId = c.req.param("groupId");

    const group = await c.env.cloudchat
      .prepare("SELECT * FROM groups WHERE id = ?")
      .bind(groupId)
      .first<{ id: string; name: string; is_community: number }>();

    if (!group) {
      return c.json({ success: false, message: "Nhóm không tồn tại" }, 404);
    }

    const myMembership = await c.env.cloudchat
      .prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?")
      .bind(groupId, currentUserId)
      .first<{ role: string }>();

    if (!myMembership) {
      return c.json({ success: false, message: "Bạn không có quyền trong nhóm này" }, 403);
    }

    const body = await c.req.json<{ member_ids?: number[]; user_id?: number }>();
    const memberIds = Array.isArray(body.member_ids)
      ? body.member_ids
      : body.user_id
      ? [body.user_id]
      : [];

    if (memberIds.length === 0) {
      return c.json({ success: false, message: "Vui lòng chọn thành viên cần thêm" }, 400);
    }

    const currentCountRow = await c.env.cloudchat
      .prepare("SELECT COUNT(*) AS count FROM group_members WHERE group_id = ?")
      .bind(groupId)
      .first<{ count: number }>();
    const currentCount = currentCountRow?.count || 0;

    if (group.is_community === 0) {
      if (currentCount + memberIds.length > 50) {
        return c.json(
          {
            success: false,
            limit_exceeded: true,
            can_upgrade: myMembership.role === "creator",
            message: `Nhóm hiện có ${currentCount} thành viên, giới hạn nhóm thường là 50. Để thêm thành viên (vượt quá 50), người lập ra nhóm phải nâng cấp nhóm lên Cộng đồng.`,
          },
          400
        );
      }
    }

    let addedCount = 0;
    for (const uid of memberIds) {
      const u = await c.env.cloudchat
        .prepare("SELECT id FROM users WHERE id = ?")
        .bind(Number(uid))
        .first();
      if (u) {
        const resInsert = await c.env.cloudchat
          .prepare(
            `INSERT OR IGNORE INTO group_members (id, group_id, user_id, role)
             VALUES (?, ?, ?, 'member')`
          )
          .bind(crypto.randomUUID(), groupId, Number(uid))
          .run();
        if (resInsert.meta.changes > 0) {
          addedCount++;
        }
      }
    }

    const newTotalRow = await c.env.cloudchat
      .prepare("SELECT COUNT(*) AS count FROM group_members WHERE group_id = ?")
      .bind(groupId)
      .first<{ count: number }>();

    return c.json({
      success: true,
      message: `Đã thêm thành công ${addedCount} thành viên vào nhóm!`,
      member_count: newTotalRow?.count || currentCount,
    });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Không thể thêm thành viên" }, 500);
  }
});

// 17. Upgrade Group to Community
app.post("/api/protected/groups/:groupId/upgrade-community", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const groupId = c.req.param("groupId");

    const group = await c.env.cloudchat
      .prepare("SELECT * FROM groups WHERE id = ?")
      .bind(groupId)
      .first<{ id: string; creator_id: number }>();

    if (!group) {
      return c.json({ success: false, message: "Nhóm không tồn tại" }, 404);
    }

    if (group.creator_id !== currentUserId) {
      return c.json(
        {
          success: false,
          message: "Chỉ người lập ra nhóm (Owner/Creator) mới có quyền nâng cấp nhóm lên Cộng đồng!",
        },
        403
      );
    }

    await c.env.cloudchat
      .prepare("UPDATE groups SET is_community = 1 WHERE id = ?")
      .bind(groupId)
      .run();

    await c.env.cloudchat
      .prepare("INSERT INTO group_messages (group_id, sender_id, content) VALUES (?, ?, ?)")
      .bind(
        groupId,
        currentUserId,
        "🚀 Nhóm đã được người lập nâng cấp thành CỘNG ĐỒNG! Giờ đây nhóm không còn giới hạn 50 thành viên."
      )
      .run();

    return c.json({
      success: true,
      message: "Đã nâng cấp nhóm lên Cộng đồng thành công! Giờ đây nhóm có thể chứa không giới hạn thành viên.",
      is_community: 1,
    });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Không thể nâng cấp nhóm" }, 500);
  }
});

// 18. Leave Group
app.post("/api/protected/groups/:groupId/leave", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const groupId = c.req.param("groupId");

    await c.env.cloudchat
      .prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?")
      .bind(groupId, currentUserId)
      .run();

    return c.json({ success: true, message: "Đã rời khỏi nhóm thành công" });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Không thể rời khỏi nhóm" }, 500);
  }
});

// ==================== QR CODE APIs ====================
// 11.1 Generate QR
app.post("/api/protected/qr/generate", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const body = await c.req.json<{ ttl_seconds?: number }>().catch(() => ({ ttl_seconds: 300 }));
    let ttlSeconds = Number(body.ttl_seconds) || 300;
    if (ttlSeconds < 30) ttlSeconds = 30;
    if (ttlSeconds > 86400) ttlSeconds = 86400;

    await c.env.cloudchat
      .prepare("UPDATE friend_qr_codes SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0")
      .bind(currentUserId)
      .run();

    const code = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    const createdAt = now.toISOString();

    await c.env.cloudchat
      .prepare(
        `INSERT INTO friend_qr_codes (code, user_id, expires_at, created_at, is_revoked)
         VALUES (?, ?, ?, ?, 0)`
      )
      .bind(code, currentUserId, expiresAt, createdAt)
      .run();

    return c.json({
      success: true,
      qr: {
        code,
        expires_at: expiresAt,
        created_at: createdAt,
        ttl_seconds: ttlSeconds,
      },
    });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Không thể tạo mã QR" }, 500);
  }
});

// 11.2 Active QR
app.get("/api/protected/qr/active", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);

    const row = await c.env.cloudchat
      .prepare(
        `SELECT code, user_id, expires_at, created_at, is_revoked
         FROM friend_qr_codes
         WHERE user_id = ? AND is_revoked = 0
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .bind(currentUserId)
      .first<{ code: string; user_id: number; expires_at: string; created_at: string; is_revoked: number }>();

    if (!row) {
      return c.json({ success: true, qr: null });
    }

    const now = new Date();
    const expDate = new Date(row.expires_at);
    if (expDate <= now) {
      await c.env.cloudchat
        .prepare("UPDATE friend_qr_codes SET is_revoked = 1 WHERE code = ?")
        .bind(row.code)
        .run();
      return c.json({ success: true, qr: null, was_expired: true });
    }

    return c.json({
      success: true,
      qr: {
        code: row.code,
        expires_at: row.expires_at,
        created_at: row.created_at,
        remaining_seconds: Math.max(0, Math.floor((expDate.getTime() - now.getTime()) / 1000)),
      },
    });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Lỗi lấy mã QR" }, 500);
  }
});

// 11.3 Revoke QR
app.post("/api/protected/qr/revoke", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);

    await c.env.cloudchat
      .prepare("UPDATE friend_qr_codes SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0")
      .bind(currentUserId)
      .run();

    return c.json({ success: true, message: "Đã hủy mã QR thành công" });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Lỗi hủy mã QR" }, 500);
  }
});

// 11.4 Resolve QR
app.get("/api/protected/qr/resolve/:code", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const code = c.req.param("code").trim();

    const row = await c.env.cloudchat
      .prepare("SELECT code, user_id, expires_at, created_at, is_revoked FROM friend_qr_codes WHERE code = ?")
      .bind(code)
      .first<{ code: string; user_id: number; expires_at: string; created_at: string; is_revoked: number }>();

    if (!row) {
      return c.json({ success: false, code_status: "not_found", message: "Mã QR không tồn tại hoặc không hợp lệ" }, 404);
    }

    if (row.is_revoked === 1) {
      return c.json({ success: false, code_status: "revoked", message: "Mã QR này đã bị hủy bỏ bởi người tạo" }, 400);
    }

    const now = new Date();
    if (new Date(row.expires_at) <= now) {
      await c.env.cloudchat
        .prepare("UPDATE friend_qr_codes SET is_revoked = 1 WHERE code = ?")
        .bind(row.code)
        .run();
      return c.json({ success: false, code_status: "expired", message: "Mã QR này đã hết hạn sử dụng" }, 400);
    }

    if (row.user_id === currentUserId) {
      return c.json({ success: false, code_status: "is_self", message: "Đây là mã QR của chính bạn" }, 400);
    }

    const creator = await c.env.cloudchat
      .prepare("SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE id = ?")
      .bind(row.user_id)
      .first();

    if (!creator) {
      return c.json({ success: false, message: "Người dùng sở hữu mã này không tồn tại" }, 404);
    }

    const friendship = await c.env.cloudchat
      .prepare(
        `SELECT id, status, user_id, friend_id FROM friendships
         WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
         LIMIT 1`
      )
      .bind(currentUserId, row.user_id, row.user_id, currentUserId)
      .first<{ id: number; status: string; user_id: number; friend_id: number }>();

    let friendshipStatus = "none";
    if (friendship) {
      if (friendship.status === "accepted") {
        friendshipStatus = "accepted";
      } else if (friendship.user_id === currentUserId) {
        friendshipStatus = "pending_sent";
      } else {
        friendshipStatus = "pending_received";
      }
    }

    return c.json({
      success: true,
      user: creator,
      qr: {
        code: row.code,
        expires_at: row.expires_at,
      },
      friendship_status: friendshipStatus,
      friendship_id: friendship?.id || null,
    });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Lỗi kiểm tra mã QR" }, 500);
  }
});

// 11.5 Add Friend via QR
app.post("/api/protected/qr/add-friend/:code", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const code = c.req.param("code").trim();

    const row = await c.env.cloudchat
      .prepare("SELECT code, user_id, expires_at, is_revoked FROM friend_qr_codes WHERE code = ?")
      .bind(code)
      .first<{ code: string; user_id: number; expires_at: string; is_revoked: number }>();

    if (!row || row.is_revoked === 1 || new Date(row.expires_at) <= new Date()) {
      return c.json({ success: false, message: "Mã QR đã hết hạn hoặc không còn hiệu lực" }, 400);
    }

    const targetId = row.user_id;
    if (targetId === currentUserId) {
      return c.json({ success: false, message: "Không thể tự kết bạn với chính mình" }, 400);
    }

    const existingFriendship = await c.env.cloudchat
      .prepare(
        `SELECT * FROM friendships
         WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
         LIMIT 1`
      )
      .bind(currentUserId, targetId, targetId, currentUserId)
      .first<{ id: number; status: string; user_id: number; friend_id: number }>();

    if (existingFriendship) {
      if (existingFriendship.status === "accepted") {
        return c.json({ success: true, message: "Hai bạn đã là bạn bè của nhau rồi!", status: "accepted" });
      }
      if (existingFriendship.friend_id === currentUserId) {
        await c.env.cloudchat
          .prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?")
          .bind(existingFriendship.id)
          .run();
        return c.json({ success: true, message: "Đã chấp nhận kết bạn thành công!", status: "accepted" });
      }
      return c.json({ success: true, message: "Lời mời kết bạn đã được gửi trước đó", status: "pending" });
    }

    await c.env.cloudchat
      .prepare("INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted')")
      .bind(currentUserId, targetId)
      .run();

    await c.env.cloudchat
      .prepare("INSERT INTO messages (sender_id, receiver_id, content, type) VALUES (?, ?, ?, 'text')")
      .bind(currentUserId, targetId, "👋 Xin chào! Chúng ta vừa kết bạn thành công qua mã QR CloudChat!")
      .run();

    return c.json({
      success: true,
      message: "Kết bạn qua mã QR thành công! Hai bạn đã là bạn bè.",
      status: "accepted",
    });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Không thể kết bạn qua mã QR" }, 500);
  }
});

// ==================== MESSAGES GET & POST ====================
app.get("/api/protected/messages/:targetId", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const targetParam = c.req.param("targetId");

    // 1. Kiểm tra nếu là Group
    if (targetParam.startsWith("group_")) {
      const isMember = await c.env.cloudchat
        .prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? LIMIT 1")
        .bind(targetParam, currentUserId)
        .first();

      if (!isMember) {
        return c.json({ success: false, message: "Bạn không thuộc nhóm này" }, 403);
      }

      const rows = await c.env.cloudchat
        .prepare(
          `SELECT gm.id, gm.sender_id, gm.group_id AS receiver_id, gm.content, gm.created_at,
                  u.username AS sender_username, u.display_name AS sender_name, u.avatar_url AS sender_avatar
           FROM group_messages gm
           LEFT JOIN users u ON gm.sender_id = u.id
           WHERE gm.group_id = ?
           ORDER BY gm.created_at ASC, gm.id ASC`
        )
        .bind(targetParam)
        .all();

      return c.json({ success: true, messages: rows.results || [] });
    }

    // 2. Chat 1-1
    const friendId = Number(targetParam);
    if (!Number.isInteger(friendId) || friendId <= 0) {
      return c.json({ success: false, message: "ID người dùng không hợp lệ" }, 400);
    }

    const friendship = await c.env.cloudchat
      .prepare(
        `SELECT id FROM friendships
         WHERE status = 'accepted'
           AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
         LIMIT 1`
      )
      .bind(currentUserId, friendId, friendId, currentUserId)
      .first();

    if (!friendship) {
      return c.json({ success: false, message: "Hai người chưa kết bạn" }, 403);
    }

    // Mark as read
    await c.env.cloudchat
      .prepare(`UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`)
      .bind(friendId, currentUserId)
      .run()
      .catch(() => {});

    const messages = await c.env.cloudchat
      .prepare(
        `SELECT
          m.id,
          m.sender_id,
          m.receiver_id,
          m.content,
          m.type,
          m.is_read,
          m.reply_to_id,
          m.created_at,
          r.content AS reply_content,
          r.sender_id AS reply_sender_id,
          ru.display_name AS reply_sender_name,
          ru.username AS reply_sender_username,
          u.username AS sender_username,
          u.display_name AS sender_name,
          u.avatar_url AS sender_avatar
         FROM messages m
         LEFT JOIN messages r ON m.reply_to_id = r.id
         LEFT JOIN users ru ON r.sender_id = ru.id
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
         ORDER BY m.created_at ASC, m.id ASC`
      )
      .bind(currentUserId, friendId, friendId, currentUserId)
      .all();

    return c.json({ success: true, messages: messages.results || [] });
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Không thể lấy lịch sử tin nhắn" }, 500);
  }
});

app.post("/api/protected/messages/:targetId", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const currentUserId = Number(payload.sub);
    const targetParam = c.req.param("targetId");

    const body = await c.req.json<{
      content?: string;
      reply_to_id?: number | null;
    }>();

    const content = body.content?.trim();
    if (!content) {
      return c.json({ success: false, message: "Tin nhắn không được để trống" }, 400);
    }

    const replyToId =
      body.reply_to_id && Number.isInteger(Number(body.reply_to_id)) && Number(body.reply_to_id) > 0
        ? Number(body.reply_to_id)
        : null;

    // Gửi vào Group
    if (targetParam.startsWith("group_")) {
      const isMember = await c.env.cloudchat
        .prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? LIMIT 1")
        .bind(targetParam, currentUserId)
        .first();

      if (!isMember) {
        return c.json({ success: false, message: "Bạn không phải là thành viên trong nhóm này" }, 403);
      }

      const res = await c.env.cloudchat
        .prepare(`INSERT INTO group_messages (group_id, sender_id, content) VALUES (?, ?, ?)`)
        .bind(targetParam, currentUserId, content)
        .run();

      const newMsgId = res.meta.last_row_id;
      const createdRow = await c.env.cloudchat
        .prepare(
          `SELECT gm.id, gm.sender_id, gm.group_id AS receiver_id, gm.content, gm.created_at,
                  u.username AS sender_username, u.display_name AS sender_name, u.avatar_url AS sender_avatar
           FROM group_messages gm
           LEFT JOIN users u ON gm.sender_id = u.id
           WHERE gm.id = ?`
        )
        .bind(newMsgId)
        .first();

      return c.json({ success: true, message: createdRow }, 201);
    }

    // Chat 1-1
    const friendId = Number(targetParam);
    if (!Number.isInteger(friendId) || friendId <= 0) {
      return c.json({ success: false, message: "ID người dùng không hợp lệ" }, 400);
    }

    const friendship = await c.env.cloudchat
      .prepare(
        `SELECT id FROM friendships
         WHERE status = 'accepted'
           AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
         LIMIT 1`
      )
      .bind(currentUserId, friendId, friendId, currentUserId)
      .first();

    if (!friendship) {
      return c.json({ success: false, message: "Hai người chưa kết bạn" }, 403);
    }

    const result = await c.env.cloudchat
      .prepare(
        `INSERT INTO messages (sender_id, receiver_id, content, type, is_read, reply_to_id)
         VALUES (?, ?, ?, 'text', 0, ?)`
      )
      .bind(currentUserId, friendId, content, replyToId)
      .run();

    const message = await c.env.cloudchat
      .prepare(
        `SELECT
          m.id,
          m.sender_id,
          m.receiver_id,
          m.content,
          m.type,
          m.is_read,
          m.reply_to_id,
          m.created_at,
          r.content AS reply_content,
          r.sender_id AS reply_sender_id,
          ru.display_name AS reply_sender_name,
          ru.username AS reply_sender_username,
          u.username AS sender_username,
          u.display_name AS sender_name,
          u.avatar_url AS sender_avatar
         FROM messages m
         LEFT JOIN messages r ON m.reply_to_id = r.id
         LEFT JOIN users ru ON r.sender_id = ru.id
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE m.id = ?`
      )
      .bind(result.meta.last_row_id)
      .first();

    return c.json({ success: true, message }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ success: false, message: "Không thể gửi tin nhắn" }, 500);
  }
});

// Test API
app.get("/api/health", async (c) => {
  const result = await c.env.cloudchat
    .prepare("SELECT COUNT(*) AS count FROM users")
    .first();

  return c.json({
    success: true,
    message: "CloudChat API is running",
    users: result?.count ?? 0,
  });
});

// Root
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "CloudChat Backend",
  });
});
app.post("/api/auth/register", async (c) => {
  try {
    const body = await c.req.json<{
      username?: string;
      password?: string;
      display_name?: string;
    }>();

    const username = body.username?.trim();
    const password = body.password;
    const displayName = body.display_name?.trim() || username;

    if (!username || !password) {
      return c.json(
        {
          success: false,
          message: "Username và password không được để trống",
        },
        400
      );
    }

    if (username.length < 3 || username.length > 30) {
      return c.json(
        {
          success: false,
          message: "Username phải từ 3 đến 30 ký tự",
        },
        400
      );
    }

    if (password.length < 6) {
      return c.json(
        {
          success: false,
          message: "Password phải có ít nhất 6 ký tự",
        },
        400
      );
    }

    const existingUser = await c.env.cloudchat
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(username)
      .first();

    if (existingUser) {
      return c.json(
        {
          success: false,
          message: "Username đã tồn tại",
        },
        409
      );
    }

    const passwordHash = await hashPassword(password);

    const result = await c.env.cloudchat
      .prepare(
        "INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)"
      )
      .bind(username, passwordHash, displayName)
      .run();

    return c.json(
      {
        success: true,
        message: "Đăng ký thành công",
        user: {
          id: result.meta.last_row_id,
          username,
          display_name: displayName,
        },
      },
      201
    );
  } catch (error) {
    console.error(error);

    return c.json(
      {
        success: false,
        message: "Có lỗi xảy ra khi đăng ký",
      },
      500
    );
  }
});
app.post("/api/auth/login", async (c) => {
  try {
    const body = await c.req.json<{
      username?: string;
      password?: string;
    }>();

    const username = body.username?.trim();
    const password = body.password;

    if (!username || !password) {
      return c.json(
        {
          success: false,
          message: "Username và password không được để trống",
        },
        400
      );
    }

    const user = await c.env.cloudchat
      .prepare(
        "SELECT id, username, display_name, bio, avatar_url, created_at, password_hash FROM users WHERE username = ?"
      )
      .bind(username)
      .first<{
        id: number;
        username: string;
        display_name: string | null;
        bio: string | null;
        avatar_url: string | null;
        created_at: string;
        password_hash: string;
      }>();

    if (!user) {
      return c.json(
        {
          success: false,
          message: "Username hoặc password không đúng",
        },
        401
      );
    }

    const passwordCorrect = await verifyPassword(
      password,
      user.password_hash
    );

    if (!passwordCorrect) {
      return c.json(
        {
          success: false,
          message: "Username hoặc password không đúng",
        },
        401
      );
    }

    const token = await sign(
      {
        sub: String(user.id),
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      },
      c.env.JWT_SECRET
    );

    return c.json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error(error);

    return c.json(
      {
        success: false,
        message: "Có lỗi xảy ra khi đăng nhập",
      },
      500
    );
  }
});
export class MyDurableObject {
  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    return new Response("Durable Object is working!");
  }
}

export default app;