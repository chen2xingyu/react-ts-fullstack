const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const config = require('./config')
const routes = require('./routes')
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')

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

    app.listen(config.port, () => {
      console.log(`🚀 服务启动: http://localhost:${config.port}`)
      console.log(`📡 API 文档: http://localhost:${config.port}/api/health`)
    })
  } catch (error) {
    console.error('❌ 启动失败:', error.message)
    process.exit(1)
  }
}

startServer()

module.exports = app
