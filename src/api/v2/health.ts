import { http } from '@/api/request'
import { healthDataSchema, type HealthData } from '@shared/contracts/health.schema'

/**
 * v2 健康检查客户端
 *
 * 类型来自 shared zod schema 的 z.infer，收到响应后再 parse 一次：
 * 静态类型防写代码时出错，运行时 parse 防后端返回脏数据（边界处校验）。
 * TS→JS：z.infer 产出的是纯类型，编译后擦除；真正留在运行时的是 healthDataSchema
 *   这个 schema 对象本身，.parse() 依赖它做运行时校验。
 */
export async function getV2Health(): Promise<HealthData> {
  const res = await http.get<HealthData>('/v2/health')
  return healthDataSchema.parse(res.data)
}
