/**
 * 🎯 面试考点：TS 模块扩展（Declaration Merging / Module Augmentation）
 *
 * 场景：Express 的 Request 类型没有 requestId 属性，但我们的中间件会挂上它。
 * 通过 declare module 'express' + interface Request 扩展，让 req.requestId
 * 在全项目都有类型提示，而不是到处写 (req as any).requestId。
 *
 * 关键点：
 * 1. 文件名必须以 .d.ts 结尾，且被 tsconfig 的 include 覆盖
 * 2. 使用 `declare module 'express'`（包名），不是相对路径
 * 3. 可选属性 `requestId?: string` 避免破坏已有中间件类型
 */

declare module 'express' {
  interface Request {
    /** 由 requestContext 中间件注入的链路追踪 id */
    requestId?: string
    /** 由 JWT 鉴权中间件注入的用户信息 */
    user?: {
      id: string
      email: string
    }
  }
}

export {}
