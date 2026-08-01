const { redisSub } = require('../config/redis')
const { hub } = require('../ws/hub')

let started = false

/**
 * 订阅 Redis 行情 Pub/Sub，转发给已订阅的 WS 客户端
 * 通道格式：ch:market:{tick|kline|depth}:{symbol}
 * Redis 不可用时静默降级（不阻塞主服务），阶段 6 补断线重连
 */
function startMarketPublisher() {
  if (started) return
  started = true

  redisSub.psubscribe('ch:market:*').catch((e) => {
    console.warn('⚠️ 行情订阅失败（Redis 可能未启动）:', e.message)
  })

  redisSub.on('pmessage', (_pattern, channel, message) => {
    // channel: ch:market:tick:600519
    const parts = channel.split(':') // ['ch','market','tick','600519']
    if (parts.length < 4) return
    const kind = parts[2]
    const symbol = parts[3]
    let data
    try {
      data = JSON.parse(message)
    } catch {
      return
    }
    if (kind === 'tick') hub.broadcastTick(symbol, data)
    else if (kind === 'kline') hub.broadcastKline(symbol, data)
    else if (kind === 'depth') hub.broadcastDepth(symbol, data)
  })

  console.log('✅ 行情转发服务已启动（订阅 ch:market:*）')
}

module.exports = { startMarketPublisher }
