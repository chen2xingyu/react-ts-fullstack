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
    })
  } catch (error) {
    console.error('❌ 启动失败:', error.message)
    process.exit(1)
  }
}

startServer()

module.exports = app
