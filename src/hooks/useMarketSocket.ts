import { useEffect, useRef, useState } from 'react'
import { getAccessToken } from '@/store/auth'
import type { Kline } from '@/types/trading'

export interface Tick {
  symbol: string
  price: number
  volume: number
  amount: number
  ts: string
}

export interface Depth {
  bids: [number, number][] // [price, qty]，bids[0] 最接近中间价
  asks: [number, number][] // asks[0] 最接近中间价
  ts: string
}

export interface MarketSocketState {
  connected: boolean
  tick: Tick | null
  kline: Kline | null
  depth: Depth | null
}

/** 用户私有通知（成交/订单状态变更），由后端 hub.sendToUser 推送 */
export type UserNotify =
  | { type: 'order_status'; data: { order_id: number; status: number; reason?: string } }
  | { type: 'trade'; side: number; data: Record<string, unknown> }

// 重连退避序列：每次断线依次等待 1/2/3/5 秒，封顶在最后一档（阶梯/指数退避）
const RECONNECT_DELAYS = [1000, 2000, 3000, 5000]
// 应用层心跳周期：小于常见网关 30-60s 的空闲断连阈值，定时 ping 保活
const HEARTBEAT_INTERVAL = 25000

/**
 * 🎯 面试考点：WebSocket 实时行情 Hook（连接 / 心跳 / 重连 / 竞态全套）
 *
 * 为什么用 WebSocket 而不是轮询 / SSE？
 *   - 轮询：客户端定时发 HTTP 请求，延迟高、空请求多，浪费带宽；
 *   - SSE(EventSource)：服务端→客户端单向推送、文本协议够简单，但客户端无法上行；
 *   - WebSocket：全双工、低延迟、文本/二进制皆可。行情既要收 tick/depth，又要发订阅/退订/心跳，
 *     必须双向，故选 WebSocket。
 *
 * 关键设计：
 *   1. 建立连接时机：放在空依赖（[]）只跑一次的 effect 里，挂载即连；
 *      JWT 拼在 query（/ws?token=xxx），握手时由服务端校验。
 *   2. 应用层心跳 ping/pong：网关常在 ~30-60s 无数据时断开空闲连接，
 *      这里每 25s 主动发 {type:'ping'} 保活，让连接"看起来很忙"。
 *   3. 断线重连（退避）：onclose 里按 RECONNECT_DELAYS 递增等待(1s→2s→3s→5s 封顶)，
 *      避免服务端崩溃后疯狂重连形成"重试风暴"把对方打挂。
 *   4. 切换 symbol：不重连，而是复用同一连接发 unsubscribe/订阅，省一次握手开销。
 *   5. 组件卸载：cleanup 置 closedByUser 阻止重连、清掉两个定时器、close socket。
 *
 * 竞态与闭包陷阱：
 *   - 旧连接回包：重连后把 wsRef 置空、旧实例 close，保证新消息只来自当前连接，旧回调不再写 state。
 *   - onNotify 闭包过期：直接在 onmessage 里调 onNotify 会抓到旧闭包；
 *     故用 notifyRef 始终指向最新回调（与 useInterval 的 savedCallback 同一套路），
 *     onNotify 变化不会触发重连。
 *   - symbol 同理用 symbolRef 在 onopen/回调里读最新值，避免 effect 闭包抓到旧 symbol。
 *
 * onNotify：接收用户私有通知（成交/撤单状态），用于即时刷新委托/资金/持仓。
 */
export function useMarketSocket(
  symbol: string | undefined,
  onNotify?: (n: UserNotify) => void,
): MarketSocketState {
  const [state, setState] = useState<MarketSocketState>({
    connected: false,
    tick: null,
    kline: null,
    depth: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const symbolRef = useRef(symbol)
  const notifyRef = useRef(onNotify)
  const reconnectAttempt = useRef(0)
  const reconnectTimer = useRef<number | null>(null)
  const heartbeatTimer = useRef<number | null>(null)

  // 始终保持最新回调引用，避免 onNotify 变化触发重连 effect
  useEffect(() => {
    notifyRef.current = onNotify
  }, [onNotify])

  // symbol 变化：更新引用 + 在已连接时退订旧/订阅新
  useEffect(() => {
    const prev = symbolRef.current
    symbolRef.current = symbol
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (prev && prev !== symbol) {
        ws.send(JSON.stringify({ type: 'unsubscribe', symbol: prev }))
      }
      if (symbol) {
        ws.send(JSON.stringify({ type: 'subscribe', symbol }))
      }
      // 切标的时清空旧行情
      setState((s) => ({ ...s, tick: null, kline: null, depth: null }))
    }
  }, [symbol])

  // 🎯 连接只建一次（空依赖）：symbol/onNotify 的变化走各自的 ref，不触发重连
  useEffect(() => {
    let closedByUser = false // 标记"我们主动关闭的"，卸载/登出时不再自动重连

    const connect = () => {
      const token = getAccessToken()
      if (!token) return // 未登录不建连（避免匿名连接被服务端秒断后无限重连）

      const ws = new WebSocket(`/ws?token=${encodeURIComponent(token)}`)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempt.current = 0 // 连上即重置退避计数，下次断线从最短延迟重来
        setState((s) => ({ ...s, connected: true }))
        const sym = symbolRef.current
        if (sym) {
          ws.send(JSON.stringify({ type: 'subscribe', symbol: sym }))
        }
        // 心跳：连接活着就定时发 ping；readyState 非 OPEN 不发（避免对已关闭连接 send 抛异常）
        heartbeatTimer.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, HEARTBEAT_INTERVAL)
      }

      // 消息分发：JSON.parse 失败（非法帧）直接丢弃，避免脏数据打断流程
      ws.onmessage = (ev) => {
        let msg: { type: string; data?: unknown }
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        if (msg.type === 'tick') {
          setState((s) => ({ ...s, tick: msg.data as Tick }))
        } else if (msg.type === 'kline') {
          setState((s) => ({ ...s, kline: msg.data as Kline }))
        } else if (msg.type === 'depth') {
          setState((s) => ({ ...s, depth: msg.data as Depth }))
        } else if (msg.type === 'order_status' || msg.type === 'trade') {
          // 用户私有通知：成交回报 / 撤单状态变更
          notifyRef.current?.(msg as UserNotify)
        }
      }

      ws.onclose = () => {
        // 断连先标记离线、清心跳；若非主动关闭，按退避延迟重连
        setState((s) => ({ ...s, connected: false }))
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current)
          heartbeatTimer.current = null
        }
        if (closedByUser) return // 卸载/登出主动关闭，不重连
        // 退避重连：取当前档位延迟（attempt 封顶在最后一档），随后 attempt 自增逐步拉长间隔
        const delay =
          RECONNECT_DELAYS[
            Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)
          ]
        reconnectAttempt.current += 1
        reconnectTimer.current = window.setTimeout(connect, delay)
      }

      ws.onerror = () => {
        // 由 onclose 接管重连
      }
    }

    connect()

    // 卸载清理：阻止重连 + 清两个定时器 + 关闭 socket，防止"卸载后 setState"与连接泄漏
    return () => {
      closedByUser = true
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current)
        heartbeatTimer.current = null
      }
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [])

  return state
}
