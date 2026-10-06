const http = require('http')
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const config = require('./config')
const routes = require('./routes')
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')
const { setupWS } = require('./ws')
const { refreshStockCache } = require('./services/stockCache')
const { startMarketPublisher } = require('./services/marketPublisher')
const { startTradeConsumer, startOrderStatusConsumer } = require('./services/tradeConsumer')

const app = express()

app.use(cors({ origin: config.cors.origin, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

if (config.env === 'development') {
  app.use(morgan('dev'))
}

app.get('/', (_req, res) => {
  res.json({
    message: 'React+TS 工程后端服务',
    version: '1.0.0',
    apiDoc: '/api/health',
  })
})

// 🎯 面试考点：Express 中间件严格按注册顺序执行。
// /api/v2 是 TS 子应用，必须赶在通用 /api 路由与 404 之前注册；
// TS 入口 (server/ts/bootstrap-env.ts) 启动时把子应用挂到 globalThis.__labV2App，
// 纯 node 旧入口下该全局不存在，直接 next()，行为与以前完全一致。
app.use('/api/v2', function v2MountSlot(req, res, next) {
  if (globalThis.__labV2App) return globalThis.__labV2App(req, res, next)
  next()
})

app.use('/api', routes)

app.use(notFoundHandler)
app.use(errorHandler)

const startServer = async () => {
  try {
    const pool = require('./config/db')
    await pool.getConnection()
    console.log('✅ 数据库连接成功')

    // HTTP + WebSocket 共用一个 server
    const server = http.createServer(app)
    setupWS(server)

    server.listen(config.port, () => {
      console.log(`🚀 服务启动: http://localhost:${config.port}`)
      console.log(`📡 API 文档: http://localhost:${config.port}/api/health`)
      console.log(`🔌 WebSocket: ws://localhost:${config.port}/ws`)

      // 行情相关服务：Redis 不可用时降级，不阻塞主服务
      refreshStockCache().catch((e) =>
        console.warn('⚠️ 股票缓存刷新失败（Redis 可能未启动）:', e.message)
      )
      startMarketPublisher()
      // 成交回报 / 订单状态消费者（阶段 4 撮合结算）
      startTradeConsumer()
      startOrderStatusConsumer()
    })
  } catch (error) {
    console.error('❌ 启动失败:', error.message)
    process.exit(1)
  }
}

// 🎯 面试考点：require.main === module 守卫
// 直接 `node app.js` 时正常启动；被 TS 新入口 (server/main.ts) import 时只导出 app，
// 端口监听 / WS / Redis 消费者统一由新入口挂载完 /api/v2 后再触发，避免重复监听。
if (require.main === module) {
  startServer()
}

module.exports = app
module.exports.startServer = startServer
