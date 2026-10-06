import { Router } from 'express'
import { asyncHandler, errors } from '../../lib/errors.js'
import { tokenBucket } from '../../lib/rateLimit.js'
import { cacheGet, cacheDel } from '../../lib/cache.js'
import {
  postListQuerySchema,
  createCommentSchema,
} from '../../../../shared/contracts/post.schema.js'
import * as postsService from './posts.service.js'

export const postsRouter = Router()

/** 列表：游标分页 + 关键词搜索 + 标签过滤 */
postsRouter.get(
  '/posts',
  asyncHandler(async (req, res) => {
    const query = postListQuerySchema.parse(req.query)
    const page = await postsService.listPosts(query)
    res.json({ code: 0, message: 'ok', data: page })
  }),
)

/** 详情：cache-aside 缓存（30s 基础 TTL，带 jitter） */
postsRouter.get(
  '/posts/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw errors.badRequest('无效的文章 id')

    const post = await cacheGet(`post:${id}`, 30_000, async () => {
      try {
        return await postsService.getPost(id)
      } catch (e) {
        // 404 要透传给上层（不能缓存成 null），其他异常也抛出
        throw e
      }
    })
    if (!post) throw errors.notFound(`文章不存在: ${id}`)

    res.json({ code: 0, message: 'ok', data: post })
  }),
)

/** 评论列表 */
postsRouter.get(
  '/posts/:id/comments',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw errors.badRequest('无效的文章 id')
    const comments = await postsService.listComments(id)
    res.json({ code: 0, message: 'ok', data: { list: comments } })
  }),
)

/** 发表评论：限流 10s 内最多 5 条（防刷） */
postsRouter.post(
  '/posts/:id/comments',
  tokenBucket({ max: 5, refillMs: 2000 }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw errors.badRequest('无效的文章 id')
    const input = createCommentSchema.parse(req.body)
    const comment = await postsService.createComment(id, input.author, input.content)
    // 评论后失效详情缓存（comment_count 变了）
    cacheDel(`post:${id}`)
    res.status(201).json({ code: 0, message: 'ok', data: comment })
  }),
)

/**
 * 点赞：限流 1s 内最多 3 次 + 幂等（UNIQUE 键）
 *
 * 🎯 面试考点：为什么点赞接口限流这么严？
 * 点赞是典型的"高频写"接口，且前端容易因双击/重试重复发送。
 * 限流 + 幂等双重保障：限流挡住突发洪水，幂等保证重复请求结果一致。
 */
postsRouter.post(
  '/posts/:id/like',
  tokenBucket({ max: 3, refillMs: 333 }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw errors.badRequest('无效的文章 id')
    const result = await postsService.likePost(id)
    cacheDel(`post:${id}`)
    res.json({ code: 0, message: 'ok', data: result })
  }),
)
