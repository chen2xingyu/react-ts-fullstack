import pino from 'pino'

/**
 * 结构化日志（pino）
 *
 * 🎯 面试考点：为什么不用 console.log？
 * - JSON 行格式，生产可被 ELK / Loki 直接采集检索
 * - 日志级别可按环境变量开关，带时间戳、pid、requestId
 * - 性能远高于手工拼接字符串（延迟序列化）
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          // 开发态输出到 stdout；生产态输出纯 JSON（transport 在生产有额外开销）
          target: 'pino/file',
          options: { destination: 1 },
        },
})
