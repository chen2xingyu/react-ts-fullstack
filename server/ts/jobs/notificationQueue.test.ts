// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest'
import '../load-env.js'
import { createV2App } from '../app.js'
import supertest from 'supertest'
import { notificationQueue, notificationEvents, closeNotificationQueue } from './notificationQueue.js'

/**
 * 🎯 面试考点：BullMQ 集成测试策略
 * - 真实 Redis + Worker + HTTP 全链路，不 mock
 * - 用 QueueEvents 监听完成/失败，实现异步断言
 * - 测试结束后清理队列、关闭连接，避免残留污染
 */

const app = createV2App()
const request = supertest(app)

describe('评论后通知队列', () => {
  it('评论成功时触发通知任务，最终状态为 completed', async () => {
    const postId = 1
    const content = `队列测试-${Date.now()}`

    const res = await request
      .post(`/posts/${postId}/comments`)
      .send({ author: 'tester', content })
      .expect(201)

    const commentId = res.body.data.id
    expect(commentId).toBeDefined()

    // 从响应数据里拿到 jobId（结构是 `comment-${commentId}`）
    // 但 response 不返回 jobId，我们去队列里查
    const job = await notificationQueue.getJob(`comment-${commentId}`)
    expect(job).not.toBeNull()

    // 等待任务完成（最多 5s）。用 waitUntilFinished 而不是手动 once('completed')，
    // 因为任务可能在监听器挂载前就已完成（先查状态再订阅事件）
    await job!.waitUntilFinished(notificationEvents, 5000)

    const state = await job!.getState()
    expect(state).toBe('completed')
    expect(job!.returnvalue.sent).toBe(true)
  })

  it('内容含 FAIL 时前两次失败，第三次重试成功', async () => {
    const content = `FAIL 队列测试-${Date.now()}`
    const res = await request
      .post('/posts/1/comments')
      .send({ author: 'tester', content })
      .expect(201)

    const commentId = res.body.data.id
    const job = await notificationQueue.getJob(`comment-${commentId}`)
    expect(job).not.toBeNull()

    // 等待 completed（最多 5s，重试两次约 1.5s）
    await job!.waitUntilFinished(notificationEvents, 5000)

    const fresh = await notificationQueue.getJob(`comment-${commentId}`)
    expect(fresh!.attemptsMade).toBeGreaterThanOrEqual(2)
    expect(fresh!.returnvalue.sent).toBe(true)
  })

  it('GET /jobs/:jobId 可查询任务状态', async () => {
    // 先清空队列确保状态干净
    await notificationQueue.obliterate({ force: true })
    const job = await notificationQueue.add('test', { commentId: 0, postId: 0, author: 'a', content: 'test' })

    // 立刻查询，状态可能是 waiting 或 completed（太快了）
    const res = await request.get(`/jobs/${job.id}`).expect(200)
    expect(res.body.data.id).toBe(job.id)
    expect(['waiting', 'active', 'completed']).toContain(res.body.data.state)
  })
})

describe('SQL 注入对照', () => {
  it('safe 接口用参数化查询，注入只返回空结果', async () => {
    const res = await request
      .get('/security/safe')
      .query({ author: "' OR '1'='1" })
      .expect(200)
    expect(res.body.data.rows).toHaveLength(0)
    expect(res.body.data.safe).toBe(true)
  })

  it('unsafe 接口用字符串拼接，注入可返回全表', async () => {
    const res = await request
      .get('/security/unsafe')
      .query({ author: "' OR '1'='1" })
      .expect(200)
    // 若 lab_comments 有数据，注入能读出所有行；没数据就空
    expect(res.body.data.safe).toBe(false)
    // 这里不断言数量（取决于是否有评论 seed），但和 safe 接口对比意义已足够
  })
})

afterAll(async () => {
  await notificationQueue.obliterate({ force: true })
  await closeNotificationQueue()
})
