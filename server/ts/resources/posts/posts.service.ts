import { pool } from '../../config/db.js'
import { errors } from '../../lib/errors.js'
import { encodeCursor, decodeCursor } from '../../../../shared/contracts/common.js'
import type { PostListItem, PostDetail, Comment } from '../../../../shared/contracts/post.schema.js'

/**
 * 文章 Service 层
 *
 * 🎯 面试考点：分层架构
 * routes（HTTP 解析/校验）→ service（业务）→ model/db（SQL）。
 * 这里 service 直接调用 pool（演示项目省略 model 层），
 * 但 service 不感知 req/res，可被 REST / RPC / 定时任务复用。
 */

interface PostRow {
  id: number
  title: string
  summary: string
  content: string
  author: string
  tags: unknown // mysql2 对 JSON 列会自动反序列化，可能是数组/对象/字符串
  like_count: number
  comment_count: number
  created_at: Date | string
}

interface CommentRow {
  id: number
  post_id: number
  author: string
  content: string
  created_at: Date | string
}

/** 统一把 DB 行映射成契约对象（dateStrings:false 下 created_at 是 Date） */
function rowToPost(row: PostRow): PostListItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    author: row.author,
    // 兼容 seed 数据：tags 可能是 JSON 数组 ["React","Hooks"]，
    // 也可能是逗号分隔字符串 "React,性能优化,Hooks"
    tags: parseTags(row.tags),
    likeCount: row.like_count,
    commentCount: row.comment_count,
    createdAt: toIso(row.created_at),
  }
}

function parseTags(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  // mysql2 可能把 JSON 列自动解析成对象/字符串
  if (typeof raw === 'object') return Object.values(raw as object).map(String)
  if (typeof raw !== 'string') return [String(raw)]
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
  } catch {
    // 非 JSON → 按逗号分隔
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    author: row.author,
    content: row.content,
    createdAt: toIso(row.created_at),
  }
}

function toIso(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString()
}

// ----------------------------------------------------------------------------
// 游标分页
// ----------------------------------------------------------------------------

export interface ListPostsParams {
  cursor?: string
  keyword?: string
  tag?: string
  limit: number
}

/**
 * 游标分页：取 limit+1 条，第 limit+1 条的游标即 nextCursor。
 *
 * 🎯 面试考点：游标分页 vs offset 分页
 * - offset 越深越慢（MySQL 要扫描 offset 行再丢弃），百万级数据翻到第 1000 页延迟爆炸
 * - 游标基于索引定位，翻页深度不影响性能；缺点是不能跳页（feed 场景本来就不需要）
 *
 * 复合排序 (created_at DESC, id DESC) 必须用复合条件：
 *   WHERE (created_at < ?) OR (created_at = ? AND id < ?)
 * 仅用 id < ? 会在同毫秒插入多条时漏数据；仅用 created_at 会重复。
 */
export async function listPosts({ cursor, keyword, tag, limit }: ListPostsParams) {
  const conditions: string[] = []
  const params: unknown[] = []

  if (keyword) {
    conditions.push('(title LIKE ? OR summary LIKE ?)')
    const kw = `%${keyword}%`
    params.push(kw, kw)
  }
  if (tag) {
    // JSON_CONTAINS(tags, '"react"') 匹配字符串数组元素
    conditions.push('JSON_CONTAINS(tags, JSON_QUOTE(?))')
    params.push(tag)
  }

  const cur = cursor ? decodeCursor(cursor) : null
  if (cur) {
    conditions.push('(created_at < ? OR (created_at = ? AND id < ?))')
    params.push(cur.createdAt, cur.createdAt, cur.id)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  // 多取 1 条用于判断 hasMore；不需要 COUNT(*)（feed 场景不显示总页数）
  const sql = `
    SELECT id, title, summary, author, tags, like_count, comment_count, created_at
    FROM lab_posts
    ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `
  params.push(limit + 1)

  const [rows] = await pool.query(sql, params) as unknown as [PostRow[]]
  const list = rows.slice(0, limit).map(rowToPost)
  const hasMore = rows.length > limit
  const nextCursor = hasMore
    ? encodeCursor(rows[limit - 1].created_at, rows[limit - 1].id)
    : null

  return { list, nextCursor, hasMore }
}

// ----------------------------------------------------------------------------
// 详情
// ----------------------------------------------------------------------------

export async function getPost(id: number): Promise<PostDetail> {
  const sql = `SELECT * FROM lab_posts WHERE id = ?`
  const [rows] = await pool.query(sql, [id]) as unknown as [PostRow[]]
  const row = rows[0]
  if (!row) throw errors.notFound(`文章不存在: ${id}`)
  const { content } = row
  return { ...rowToPost(row), content }
}

// ----------------------------------------------------------------------------
// 评论（事务：写评论 + 更新计数）
// ----------------------------------------------------------------------------

export async function createComment(
  postId: number,
  author: string,
  content: string,
): Promise<Comment> {
  // 先确认文章存在，避免孤儿评论
  await getPost(postId)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [result] = await conn.query(
      'INSERT INTO lab_comments (post_id, author, content) VALUES (?, ?, ?)',
      [postId, author, content],
    ) as unknown as [{ insertId: number }]
    await conn.query(
      'UPDATE lab_posts SET comment_count = comment_count + 1 WHERE id = ?',
      [postId],
    )
    await conn.commit()
    return {
      id: result.insertId,
      postId,
      author,
      content,
      createdAt: new Date().toISOString(),
    }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

export async function listComments(postId: number): Promise<Comment[]> {
  const [rows] = await pool.query(
    'SELECT id, post_id, author, content, created_at FROM lab_comments WHERE post_id = ? ORDER BY id DESC LIMIT 100',
    [postId],
  ) as unknown as [CommentRow[]]
  return rows.map(rowToComment)
}

// ----------------------------------------------------------------------------
// 点赞（幂等：UNIQUE 键 + INSERT IGNORE）
// ----------------------------------------------------------------------------

export interface LikeResult {
  liked: boolean // true=本次新点赞，false=已经点过（幂等返回）
  likeCount: number
}

/**
 * 幂等点赞：
 * - lab_post_likes 有 UNIQUE(post_id, user_id)，INSERT IGNORE 重复时影响行数 0
 * - 只在首次点赞时 +1 like_count，重复点赞不重复计数（幂等核心）
 * - 演示期 user_id 固定 0（游客），接入鉴权后从上下文取真实用户
 *
 * 🎯 面试考点：幂等设计
 * 前端可能因网络重试重复发送点赞请求，后端必须保证结果一致。
 * 方案：唯一键 + INSERT IGNORE，比"先查再插"的竞态安全得多。
 */
export async function likePost(postId: number, userId = 0): Promise<LikeResult> {
  await getPost(postId)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [result] = await conn.query(
      'INSERT IGNORE INTO lab_post_likes (post_id, user_id) VALUES (?, ?)',
      [postId, userId],
    ) as unknown as [{ affectedRows: number }]
    const isNew = result.affectedRows > 0
    if (isNew) {
      await conn.query(
        'UPDATE lab_posts SET like_count = like_count + 1 WHERE id = ?',
        [postId],
      )
    }
    const [rows] = await conn.query('SELECT like_count FROM lab_posts WHERE id = ?', [postId]) as unknown as [{ like_count: number }[]]
    await conn.commit()
    return { liked: isNew, likeCount: rows[0].like_count }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
