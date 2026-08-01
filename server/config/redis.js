const Redis = require('ioredis')
const config = require('./index')

// 普通客户端（用于命令操作）
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  db: config.redis.db,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('❌ Redis 连接失败，请确认 Redis 已启动')
      return null
    }
    return Math.min(times * 500, 2000)
  },
})

// 订阅专用客户端（ioredis 订阅模式下不能发普通命令，需独立实例）
const redisSub = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  db: config.redis.db,
})

redis.on('connect', () => {
  console.log('✅ Redis 连接成功')
})

redis.on('error', (err) => {
  console.error('❌ Redis 错误:', err.message)
})

// 订阅客户端的 error 必须兜底，否则 Node 会因 unhandled 'error' 事件崩溃
redisSub.on('error', () => {
  // Redis 不可用时由主客户端统一告警，此处静默避免重复刷屏
})

module.exports = { redis, redisSub }
