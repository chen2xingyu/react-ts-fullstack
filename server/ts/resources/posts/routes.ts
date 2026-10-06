import { Router } from 'express'
import { asyncHandler, errors } from '../../lib/errors.js'
import { tokenBucket } from '../../lib/rateLimit.js'
import { cacheGet, cacheDel } from '../../lib/cache.js'
import {
  postListQuerySchema,
  createCommentSchema,
} from '../../../../shared/contracts/post.schema.js'
import * as postsService from './posts.service.js'
import { notificationQueue } from '../../jobs/notificationQueue.js'

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
    /**
     * 🎯 面试考点：非关键路径异步化
     * 发通知丢进队列立即返回，不阻塞评论接口 RT。
     * jobId 用 comment 主键 → BullMQ 对相同 jobId 去重，天然幂等防重复入队。
     */
    await notificationQueue.add(
      'comment-notification',
      { commentId: comment.id, postId: id, author: comment.author, content: comment.content },
      { jobId: `comment-${comment.id}` },
    )
    res.status(201).json({ code: 0, message: 'ok', data: comment })
  }),
)

/** 查询队列任务状态（演示：任务生命周期可追溯） */
postsRouter.get(
  '/jobs/:jobId',
  asyncHandler(async (req, res) => {
    const job = await notificationQueue.getJob(req.params.jobId)
    if (!job) throw errors.notFound(`任务不存在: ${req.params.jobId}`)
    const state = await job.getState()
    res.json({
      code: 0,
      message: 'ok',
      data: {
        id: job.id,
        state, // waiting / active / completed / failed
        attemptsMade: job.attemptsMade,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
      },
    })
  }),
)

/** 队列事件流（演示：QueueEvents 实时感知完成/失败） */
postsRouter.get('/jobs-events/wait', (_req, res) => {
  // 简化演示：真实场景可用 SSE 推送 QueueEvents 的 completed/failed 事件
  res.json({ code: 0, message: 'ok', data: { listening: true } })
})

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
