import { Queue, Worker, QueueEvents, type Job } from 'bullmq'
import { logger } from '../lib/logger.js'

/**
 * 🎯 面试考点：消息队列（BullMQ）解决什么问题？
 *
 * 评论成功后「发通知」不是主流程必须同步等待的（用户不关心通知是否 0ms 送达），
 * 同步做会拖慢接口 RT。队列化后：
 * 1. 接口立即返回，通知异步发送（削峰）
 * 2. 失败自动重试（attempts + backoff），主流程不被通知服务故障拖垮（解耦/容错）
 * 3. Worker 可水平扩展、限流消费（concurrency）
 *
 * ⚠️ 面试必答「重复消费」：队列保证 at-least-once，不是 exactly-once。
 * 消费者必须幂等（这里用 notification_log 唯一键 / 或业务上去重）。
 *
 * BullMQ 连接注意：Worker 的 connection 必须 `maxRetriesPerRequest: null`，
 * 否则阻塞式拉取任务时会报错。
 */

export interface NotificationJob {
  commentId: number
  postId: number
  author: string
  content: string
}

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  db: Number(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: null, // BullMQ Worker 要求
}

export const NOTIFICATION_QUEUE = 'lab-notifications'

export const notificationQueue = new Queue<NotificationJob>(NOTIFICATION_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3, // 🎯 失败重试 3 次
    backoff: { type: 'exponential', delay: 500 }, // 指数退避 500ms → 1000ms
    removeOnComplete: 100, // 只保留最近 100 条完成记录，防 Redis 膨胀
    removeOnFail: 200,
  },
})

/**
 * 处理器：模拟发送通知。
 * 演示约定：content 含 "FAIL" 时前两次数抛错，第三次成功 —— 用于演示重试。
 */
async function processNotification(job: Job<NotificationJob>) {
  const { commentId, author, content } = job.data
  logger.info({ jobId: job.id, attempt: job.attemptsMade + 1, commentId }, '📨 发送通知')

  if (content.includes('FAIL') && job.attemptsMade < 2) {
    throw new Error('模拟通知服务故障（演示指数退避重试）')
  }
  // 真实场景：写 notification 表 / 调第三方推送；这里打印模拟落库
  return { sent: true, commentId, to: author }
}

export const notificationWorker = new Worker<NotificationJob>(NOTIFICATION_QUEUE, processNotification, {
  connection,
  concurrency: 5, // 🎯 并发消费 5 个任务
})

// QueueEvents：独立的「事件监听」连接，用于测试和状态查询时等待完成/失败
export const notificationEvents = new QueueEvents(NOTIFICATION_QUEUE, { connection })

/** 优雅关停：先停 Worker（不再拉新任务、等在途完成），再关队列 */
export async function closeNotificationQueue() {
  await notificationWorker.close()
  await notificationEvents.close()
  await notificationQueue.close()
}
