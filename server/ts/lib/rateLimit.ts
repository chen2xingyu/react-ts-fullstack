import type { Request, Response, NextFunction } from 'express'
import { errors } from './errors.js'

/**
 * 手写令牌桶限流中间件（内存版）
 *
 * 🎯 面试考点：限流算法对比
 * - 计数器：简单但有"临界突刺"（1秒末+2秒初各打满，瞬间2倍流量）
 * - 滑动窗口：平滑但实现复杂
 * - 令牌桶：以固定速率往桶里放令牌，请求取令牌；允许短时突发（桶满时）
 *   同时又限制了长期速率，是最常用的限流算法
 *
 * 这里实现令牌桶：每 capacity ms 补充 1 个令牌，桶容量 max。
 * 生产环境应改用 Redis（INCR + EXPIRE 或 Lua 脚本）做分布式限流，
 * 内存版仅适用于单实例演示。
 */

interface Bucket {
  tokens: number
  lastRefill: number
}

interface Options {
  /** 桶容量（允许的突发量） */
  max: number
  /** 补充 1 个令牌所需毫秒数（速率 = 1000/refillMs 次/秒） */
  refillMs: number
  /** 标识维度，默认按 IP */
  key?: (req: Request) => string
}

export function tokenBucket({ max, refillMs, key }: Options) {
  const buckets = new Map<string, Bucket>()

  return (req: Request, _res: Response, next: NextFunction) => {
    const k = key ? key(req) : req.ip || 'anonymous'
    const now = Date.now()
    const bucket = buckets.get(k) ?? { tokens: max, lastRefill: now }

    // 🎯 惰性补充：每次请求时根据时间差补令牌，不用定时器
    const elapsed = now - bucket.lastRefill
    const refill = Math.floor(elapsed / refillMs)
    if (refill > 0) {
      bucket.tokens = Math.min(max, bucket.tokens + refill)
      bucket.lastRefill = now // 只更新整数倍部分，余数保留（精确控制速率）
    }

    if (bucket.tokens <= 0) {
      next(errors.tooMany())
      return
    }
    bucket.tokens -= 1
    buckets.set(k, bucket)
    next()
  }
}
