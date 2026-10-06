import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler, errors } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'

/**
 * 🎯 面试考点：性能指标接收与聚合
 *
 * 接收前端 sendBeacon 上报的 Web Vitals，按指标名聚合出 P75（第 75 百分位）。
 * 生产环境应写时序数据库（InfluxDB/Prometheus），这里用内存 Map 演示聚合逻辑。
 *
 * sendBeacon 特点：Content-Type 可能是 text/plain，需要 express.text() 解析。
 */

const vitalSchema = z.object({
  name: z.enum(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  unit: z.string(),
})

const reportSchema = z.object({
  vitals: z.array(vitalSchema),
  url: z.string(),
  ts: z.number(),
})

// 内存存储：{ LCP: [1200, 1500, 800, ...], INP: [...], ... }
const metricsStore = new Map<string, number[]>()

export const metricsRouter = Router()

/** 接收上报（POST /api/v2/metrics） */
metricsRouter.post(
  '/metrics',
  asyncHandler(async (req, res) => {
    // sendBeacon 的 Content-Type 是 text/plain，需要手动 JSON.parse
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        throw errors.badRequest('无效的 JSON')
      }
    }
    const report = reportSchema.parse(body)

    for (const vital of report.vitals) {
      const list = metricsStore.get(vital.name) ?? []
      list.push(vital.value)
      metricsStore.set(vital.name, list)
    }

    logger.info({ url: report.url, count: report.vitals.length }, '📊 收到性能指标上报')
    res.status(201).json({ code: 0, message: 'ok' })
  }),
)

/** 查询聚合结果（GET /api/v2/metrics/summary） */
metricsRouter.get(
  '/metrics/summary',
  asyncHandler(async (_req, res) => {
    const summary: Record<string, { count: number; p75: number; avg: number }> = {}
    for (const [name, values] of metricsStore.entries()) {
      const sorted = [...values].sort((a, b) => a - b)
      const p75Index = Math.ceil(sorted.length * 0.75) - 1
      summary[name] = {
        count: sorted.length,
        p75: sorted[p75Index] ?? 0,
        avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
      }
    }
    res.json({ code: 0, message: 'ok', data: summary })
  }),
)

/** 清空（测试用） */
metricsRouter.post('/metrics/reset', (_req, res) => {
  metricsStore.clear()
  res.json({ code: 0, message: 'ok' })
})
