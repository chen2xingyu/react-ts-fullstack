import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

/**
 * 请求级上下文（AsyncLocalStorage）
 *
 * 🎯 面试考点：一次请求会穿过 中间件 → service → model 很多层，
 * 如何让深层函数打日志时自动带上 requestId，而不必层层传参？
 * Node 官方方案 AsyncLocalStorage：基于异步链路上下文隔离，
 * 同类问题还有"数据库连接 / 租户 id / 鉴权用户"的隐式透传。
 */
const requestStore = new AsyncLocalStorage<{ requestId: string }>()

export function getRequestId(): string | undefined {
  return requestStore.getStore()?.requestId
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  // 客户端/网关若带了 x-request-id 就沿用（链路追踪跨服务串联）
  const incoming = req.header('x-request-id')
  const requestId = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID()
  res.setHeader('x-request-id', requestId)
  requestStore.run({ requestId }, next)
}
