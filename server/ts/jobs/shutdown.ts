import { notificationQueue, notificationWorker, notificationEvents } from './notificationQueue.js'
import { logger } from '../lib/logger.js'

/**
 * 🎯 面试考点：优雅关停（Graceful Shutdown）
 *
 * 收到 SIGTERM/SIGINT 时的正确顺序：
 * 1. 停止接受新连接（server.close）
 * 2. 停止 Worker 拉新任务（等待在途任务完成）
 * 3. 关闭 Queue / Events 连接
 * 4. 关闭 Redis / MySQL
 *
 * 如果直接 process.exit(0)，正在处理的评论会丢失一半写库。
 */
export async function gracefulShutdown() {
  logger.info('🛑 收到关停信号，开始优雅关停...')

  // 先停 Worker，避免在途任务被中断
  await notificationWorker.close()
  logger.info('✅ Worker 已停止')

  // 再关 QueueEvents 和 Queue
  await notificationEvents.close()
  await notificationQueue.close()
  logger.info('✅ 队列连接已关闭')

  // 注意：HTTP server、Redis、MySQL 的关闭由旧 app.js 里的 startServer 负责
  // 这里只负责 v2 新加的队列资源。旧系统已运行多年，不改动其关停逻辑。
}
