/**
 * 新统一入口（TS）
 *
 * 启动链路（import 顺序就是初始化顺序，勿调整）：
 *   1. load-env 加载 server/.env
 *   2. bootstrap-env 创建 v2 子应用并注入挂载槽
 *   3. 导入旧 app.js：旧中间件栈注册，其中 /api/v2 槽口转交到 TS 子应用
 *   4. startServer：连 MySQL、挂 WS、监听 3000、启动 Redis 消费者
 *
 * 🎯 面试考点：渐进式迁移（Strangler Pattern）
 * 老系统不停机、不重写，新功能用新栈落在版本化前缀 /api/v2 下，逐模块替换。
 *
 * 注意：server/package.json 是 CJS 模式，本文件不能用顶层 await，统一进 main()。
 */
import './ts/load-env.js'
import './ts/bootstrap-env.js'
import legacyApp from './app.js'
import { logger } from './ts/lib/logger.js'
import { gracefulShutdown } from './ts/jobs/shutdown.js'

async function main() {
  logger.info('🅣 /api/v2 (TypeScript) 子应用已注入挂载槽')
  await legacyApp.startServer()

  // 优雅关停信号
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT']
  for (const sig of signals) {
    process.on(sig, async () => {
      try {
        await gracefulShutdown()
        logger.info('👋 优雅关停完成')
        process.exit(0)
      } catch (err) {
        logger.error({ err }, '❌ 优雅关停失败')
        process.exit(1)
      }
    })
  }
}

main().catch((err) => {
  console.error('❌ 启动失败:', err)
  process.exit(1)
})
