import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { randomUUID } from 'node:crypto'
import { logger } from './lib/logger.js'
import { requestContext } from './lib/requestContext.js'
import { AppError, v2ErrorHandler } from './lib/errors.js'
import { healthRouter } from './resources/health/routes.js'
import { postsRouter } from './resources/posts/routes.js'
import { securityRouter } from './resources/security/routes.js'
import { metricsRouter } from './resources/metrics/routes.js'

/**
 * 构建 v2 子应用（TS 与 JS 共用 server/node_modules，故 TS 源码放在 server/ts/ 下）
 *
 * 为什么用独立子应用而不是改旧 app：
 * - 旧 JS 交易接口零影响；v2 有独立的中间件栈（安全头 / 结构化日志 / 校验规范）
 * - 挂载点 /api/v2 天然形成版本隔离，未来做破坏性升级时前缀就是分界线
 */
export function createV2App() {
  const app = express()

  // 安全响应头（防点击劫持、MIME 嗅探等）
  app.use(helmet())
  app.use(express.json({ limit: '1mb' }))
  // sendBeacon 上报的 Content-Type 是 text/plain，需要 text 解析后再手动 JSON.parse
  app.use(express.text({ type: 'text/plain', limit: '64kb' }))

  // 链路上下文 → 结构化 HTTP 日志
  app.use(requestContext)
  app.use(
    pinoHttp({
      logger,
      // 复用 requestContext 生成的 id，保证日志与响应头一致
      genReqId: (req) => req.res?.getHeader('x-request-id')?.toString() || randomUUID(),
    }),
  )

  // 业务路由
  app.use('/', healthRouter)
  app.use('/', postsRouter)
  app.use('/security', securityRouter)
  app.use('/', metricsRouter)

  // v2 内 404
  app.use((req, _res, next) => {
    next(new AppError(404, `v2 路由不存在: ${req.method} ${req.originalUrl}`))
  })

  // 统一错误处理（必须最后注册，4 个参数一个都不能少，Express 靠参数个数识别）
  app.use(v2ErrorHandler)

  return app
}
