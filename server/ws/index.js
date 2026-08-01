const http = require('http')
const url = require('url')
const { WebSocketServer } = require('ws')
const { verifyAccessToken } = require('../utils/jwt')
const { hub } = require('./hub')

const HEARTBEAT_INTERVAL = 30000 // 30s 探活

/**
 * 在 HTTP server 上挂载 WebSocket 服务（路径 /ws）
 * 鉴权：浏览器 WebSocket 无法设置 Header，故从 query string 取 token
 */
function setupWS(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    const { query } = url.parse(req.url, true)
    const token = query.token

    let userId
    try {
      const decoded = verifyAccessToken(token)
      userId = decoded.sub
    } catch (e) {
      ws.close(4001, '认证失败')
      return
    }

    hub.add(ws, userId)
    ws.isAlive = true

    ws.on('pong', () => {
      ws.isAlive = true
    })

    ws.on('message', (raw) => {
      let msg
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        return
      }
      const { type, symbol } = msg
      if (type === 'subscribe' && symbol) {
        hub.subscribe(ws, symbol)
        ws.send(JSON.stringify({ type: 'subscribed', symbol }))
      } else if (type === 'unsubscribe' && symbol) {
        hub.unsubscribe(ws, symbol)
      } else if (type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
    })

    ws.on('close', () => hub.remove(ws))
    ws.on('error', () => hub.remove(ws))
  })

  // 心跳：协议级 ping/pong，清理半开连接
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate()
      ws.isAlive = false
      ws.ping()
    })
  }, HEARTBEAT_INTERVAL)

  wss.on('close', () => clearInterval(interval))

  console.log('✅ WebSocket 服务已挂载 (/ws)')
  return wss
}

module.exports = { setupWS }
