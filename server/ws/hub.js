/**
 * WebSocket 客户端管理中心
 * - 维护连接 → 用户映射
 * - symbol 房间订阅（行情按标的分发）
 * - 用户私有通道（成交/委托状态通知，阶段 4 用）
 */
class WsHub {
  constructor() {
    this.clients = new Map() // ws -> { userId, symbols: Set<string> }
  }

  add(ws, userId) {
    this.clients.set(ws, { userId, symbols: new Set() })
  }

  remove(ws) {
    this.clients.delete(ws)
  }

  subscribe(ws, symbol) {
    const c = this.clients.get(ws)
    if (c) c.symbols.add(symbol)
  }

  unsubscribe(ws, symbol) {
    const c = this.clients.get(ws)
    if (c) c.symbols.delete(symbol)
  }

  _send(ws, msg) {
    // 1 = OPEN
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg))
    }
  }

  /** 广播到某 symbol 的所有订阅者 */
  broadcast(symbol, type, data) {
    for (const [ws, c] of this.clients) {
      if (c.symbols.has(symbol)) {
        this._send(ws, { type, symbol, data })
      }
    }
  }

  broadcastTick(symbol, tick) {
    this.broadcast(symbol, 'tick', tick)
  }

  broadcastKline(symbol, kline) {
    this.broadcast(symbol, 'kline', kline)
  }

  broadcastDepth(symbol, depth) {
    this.broadcast(symbol, 'depth', depth)
  }

  /** 推送给指定用户（私有通知） */
  sendToUser(userId, msg) {
    for (const [ws, c] of this.clients) {
      if (c.userId === userId) {
        this._send(ws, msg)
      }
    }
  }
}

const hub = new WsHub()

module.exports = { hub, WsHub }
