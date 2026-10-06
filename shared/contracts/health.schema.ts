import { z } from 'zod'

/** v2 健康检查响应契约（前后端共用同一份 zod schema 与推导类型） */
export const healthDataSchema = z.object({
  service: z.string(),
  version: z.string(),
  requestId: z.string().optional(),
  ts: z.string().datetime(),
})

export type HealthData = z.infer<typeof healthDataSchema>
