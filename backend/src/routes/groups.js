import express from 'express'
import { pool, broadcastNotification } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// 1. Lấy danh sách nhóm chat của người dùng
router.get('/', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id

    const groupsQuery = await pool.query(
      `SELECT g.id, g.name, g.avatar_url, g.created_by, g.is_community, g.created_at,
              gm.role as my_role,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id)::int as member_count
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [currentUserId]
    )

    const groups = groupsQuery.rows

    if (groups.length === 0) {
      return res.json({ groups: [] })
    }

    const groupIds = groups.map((g) => g.id)

    // Lấy tin nhắn cuối cùng của toàn bộ nhóm chỉ bằng 1 câu truy vấn SQL (Chống N+1 DoS Query)
    const lastMsgsQuery = await pool.query(
      `SELECT DISTINCT ON (group_id)
         id, sender_id, group_id, content, created_at
       FROM messages
       WHERE group_id = ANY($1::uuid[])
       ORDER BY group_id, created_at DESC`,
      [groupIds]
    )

    const lastMsgMap = new Map()
    for (const msg of lastMsgsQuery.rows) {
      lastMsgMap.set(String(msg.group_id), msg)
    }

    const groupsWithLastMsg = groups.map((grp) => {
      const lastMsg = lastMsgMap.get(String(grp.id))
      return {
        ...grp,
        is_group: true,
        last_message: lastMsg ? lastMsg.content : null,
        last_message_time: lastMsg ? lastMsg.created_at : null,
        last_message_sender_id: lastMsg ? lastMsg.sender_id : null,
      }
    })

    res.json({ groups: groupsWithLastMsg })
  } catch (err) {
    console.error('Get groups error:', err)
    res.status(500).json({ error: 'Lỗi tải danh sách nhóm' })
  }
})

// 2. Tạo nhóm chat mới
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, avatar_url, memberIds } = req.body
    const currentUserId = req.user.id

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên nhóm không được để trống' })
    }

    // 1. Tạo nhóm
    const groupInsert = await pool.query(
      `INSERT INTO groups (name, avatar_url, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), avatar_url || null, currentUserId]
    )

    const newGroup = groupInsert.rows[0]

    // 2. Thêm người tạo làm admin/creator
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'creator')`,
      [newGroup.id, currentUserId]
    )

    // 3. Thêm các thành viên được chọn
    const validMemberIds = Array.isArray(memberIds)
      ? memberIds.filter((id) => id && id !== currentUserId)
      : []

    for (const mId of validMemberIds) {
      await pool.query(
        `INSERT INTO group_members (group_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT DO NOTHING`,
        [newGroup.id, mId]
      )
    }

    // 4. Tạo tin nhắn hệ thống thông báo tạo nhóm
    const sysMsg = await pool.query(
      `INSERT INTO messages (sender_id, group_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [currentUserId, newGroup.id, `Đã tạo nhóm "${newGroup.name}"`]
    )

    // Phát tín hiệu thông báo tạo nhóm cho các backend
    broadcastNotification('group_created', {
      groupId: newGroup.id,
      creatorId: currentUserId,
      memberIds: [currentUserId, ...validMemberIds],
    })

    res.status(201).json({
      group: {
        ...newGroup,
        is_group: true,
        member_count: validMemberIds.length + 1,
        last_message: sysMsg.rows[0].content,
        last_message_time: sysMsg.rows[0].created_at,
      },
      message: 'Tạo nhóm thành công',
    })
  } catch (err) {
    console.error('Create group error:', err)
    res.status(500).json({ error: 'Lỗi tạo nhóm' })
  }
})

// 3. Lấy chi tiết nhóm và danh sách thành viên
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id
    const currentUserId = req.user.id

    // Kiểm tra xem user có phải thành viên nhóm không
    const membership = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, currentUserId]
    )

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'Bạn không phải thành viên của nhóm này' })
    }

    const groupResult = await pool.query('SELECT * FROM groups WHERE id = $1', [groupId])
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhóm' })
    }

    const group = groupResult.rows[0]

    // Lấy danh sách thành viên
    const membersResult = await pool.query(
      `SELECT gm.id, gm.role, gm.joined_at, u.id as user_id, u.username, u.display_name, u.avatar_url, u.is_online, u.last_seen
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY CASE WHEN gm.role = 'creator' THEN 1 WHEN gm.role = 'admin' THEN 2 ELSE 3 END, u.display_name ASC`,
      [groupId]
    )

    res.json({
      group: {
        ...group,
        is_creator: group.created_by === currentUserId,
        my_role: membership.rows[0].role,
      },
      members: membersResult.rows,
    })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải thông tin nhóm' })
  }
})

// 4. Thêm thành viên vào nhóm
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id
    const { userIds } = req.body
    const currentUserId = req.user.id

    // Kiểm tra quyền: Người yêu cầu phải là thành viên trong nhóm
    const memberCheck = await pool.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, currentUserId]
    )
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Bạn không phải thành viên của nhóm này' })
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Danh sách thành viên không hợp lệ' })
    }

    for (const uid of userIds) {
      await pool.query(
        `INSERT INTO group_members (group_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT DO NOTHING`,
        [groupId, uid]
      )
    }

    broadcastNotification('group_updated', { groupId, action: 'members_added', userIds })

    res.json({ message: 'Đã thêm thành viên vào nhóm' })
  } catch (err) {
    console.error('Add member error:', err)
    res.status(500).json({ error: 'Lỗi thêm thành viên' })
  }
})

// 5. Rời khỏi nhóm hoặc xóa thành viên
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id
    const targetUserId = req.params.userId
    const currentUserId = req.user.id

    // Người dùng tự rời nhóm HOẶC người tạo nhóm xóa thành viên khác
    const groupCheck = await pool.query('SELECT created_by FROM groups WHERE id = $1', [groupId])
    if (groupCheck.rows.length === 0) return res.status(404).json({ error: 'Nhóm không tồn tại' })

    const isCreator = groupCheck.rows[0].created_by === currentUserId

    if (currentUserId !== targetUserId && !isCreator) {
      return res.status(403).json({ error: 'Chỉ trưởng nhóm mới có quyền xóa thành viên' })
    }

    await pool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, targetUserId]
    )

    broadcastNotification('group_updated', { groupId, action: 'member_removed', userId: targetUserId })

    res.json({ message: 'Đã xóa thành viên khỏi nhóm' })
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa thành viên' })
  }
})

export default router

