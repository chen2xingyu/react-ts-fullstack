// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest'
import '../load-env.js'
import { createV2App } from '../app.js'
import supertest from 'supertest'
import { notificationQueue, notificationEvents, closeNotificationQueue } from './notificationQueue.js'
import type { Job } from 'bullmq'

/**
 * 🎯 面试考点：批量等待任务完成的正确姿势
 * 30 个 job.waitUntilFinished() 会各自往 QueueEvents 挂监听器，
 * 并发时超过 Node EventEmitter 默认 10 个上限 → MaxListenersExceededWarning。
 * 正确做法：只挂一个 completed/failed 监听器，用 Set 收集完成进度。
 * 注意先查一轮状态兜底 —— 任务可能先于监听器挂载就已完成（竞态）。
 */
async function waitForJobs(jobs: Job[], timeout = 10000): Promise<void> {
  const pending = new Set(jobs.map((j) => j.id!))

  // 先剔除已完成的（竞态兜底）
  await Promise.all(
    jobs.map(async (j) => {
      if ((await j.getState()) === 'completed') pending.delete(j.id!)
    }),
  )
  if (pending.size === 0) return

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`等待超时，剩余 ${pending.size} 个任务未完成`))
    }, timeout)
    const onCompleted = ({ jobId }: { jobId: string }) => {
      pending.delete(jobId)
      if (pending.size === 0) {
        cleanup()
        resolve()
      }
    }
    const onFailed = ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      if (pending.has(jobId)) {
        cleanup()
        reject(new Error(`任务 ${jobId} 失败: ${failedReason}`))
      }
    }
    const cleanup = () => {
      clearTimeout(timer)
      notificationEvents.off('completed', onCompleted)
      notificationEvents.off('failed', onFailed)
    }
    notificationEvents.on('completed', onCompleted)
    notificationEvents.on('failed', onFailed)
  })
}

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

describe('高并发与幂等', () => {
  it('并发入队 30 条任务，Worker 全部消费完成', async () => {
    const count = 30
    const jobs = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        notificationQueue.add('burst-test', {
          commentId: 2000 + i,
          postId: 1,
          author: 'concurrent',
          content: `burst-${i}`,
        }),
      ),
    )

    // 等待所有任务完成（单任务几乎瞬时，30 条在 concurrency=5 下约 1-2s）
    await waitForJobs(jobs, 10000)

    const states = await Promise.all(jobs.map((j) => j.getState()))
    expect(states.every((s) => s === 'completed')).toBe(true)
  })

  it('相同 jobId 并发入队，队列幂等只保留一个任务', async () => {
    const jobId = `dup-${Date.now()}`
    const payload = { commentId: 9999, postId: 1, author: 'dup', content: 'dup' }

    // 同一时刻并发 add 3 次
    const [j1, j2, j3] = await Promise.all([
      notificationQueue.add('dup', payload, { jobId }),
      notificationQueue.add('dup', payload, { jobId }),
      notificationQueue.add('dup', payload, { jobId }),
    ])

    // BullMQ 对重复 jobId 去重，三次返回同一个实例
    expect(new Set([j1.id, j2.id, j3.id]).size).toBe(1)
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
