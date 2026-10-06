import { z } from 'zod'
import type { CursorPage } from './common'

/**
 * 文章模块契约
 *
 * 🎯 面试考点：单一事实来源（Single Source of Truth）
 * zod schema 同时承担：① 后端入参校验/响应类型；② 前端静态类型 + 运行时兜底；
 * 后端改字段 → 前端 tsc 立刻报错，杜绝"接口改了前端不知道"的联调事故。
 */

// ---------- 实体 ----------

export const postListItemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  summary: z.string(),
  author: z.string(),
  tags: z.array(z.string()),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
})
export type PostListItem = z.infer<typeof postListItemSchema>

export const postDetailSchema = postListItemSchema.extend({
  content: z.string(),
})
export type PostDetail = z.infer<typeof postDetailSchema>

export const commentSchema = z.object({
  id: z.number().int().positive(),
  postId: z.number().int().positive(),
  author: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
})
export type Comment = z.infer<typeof commentSchema>

// ---------- 请求参数 ----------

export const postListQuerySchema = z.object({
  cursor: z.string().optional(),
  keyword: z.string().trim().min(1).max(50).optional(),
  tag: z.string().trim().min(1).max(20).optional(),
  // query string 全是字符串，coerce 把 "20" 转成数字；default 兜底
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type PostListQuery = z.infer<typeof postListQuerySchema>

export const createCommentSchema = z.object({
  author: z.string().trim().min(1).max(50).default('游客'),
  content: z.string().trim().min(1).max(1000),
})
export type CreateCommentInput = z.infer<typeof createCommentSchema>

// ---------- 响应分页 ----------

export type PostListPage = CursorPage<PostListItem>
export type CommentListPage = CursorPage<Comment>
