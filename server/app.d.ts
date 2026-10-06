// 旧 CJS 入口 app.js 的类型声明：TS 侧拿到带类型的 Express 实例
import type { Express } from 'express'

interface LegacyApp extends Express {
  /** 启动 HTTP(含 WS) + MySQL 连通性检查 + Redis 后台服务 */
  startServer: () => Promise<void>
}

declare const app: LegacyApp
export default app
