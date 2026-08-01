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

const RECONNECT_DELAYS = [1000, 2000, 3000, 5000]
const HEARTBEAT_INTERVAL = 25000

/**
 * 行情 WebSocket 客户端
 * - 自动带 JWT 鉴权（query token）
 * - 切换 symbol 自动退订/订阅
 * - 断线指数退避重连，重连后自动重订阅
 * - 25s 应用层心跳
 */
export function useMarketSocket(symbol: string | undefined): MarketSocketState {
  const [state, setState] = useState<MarketSocketState>({
    connected: false,
    tick: null,
    kline: null,
    depth: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const symbolRef = useRef(symbol)
  const reconnectAttempt = useRef(0)
  const reconnectTimer = useRef<number | null>(null)
  const heartbeatTimer = useRef<number | null>(null)

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

  // 建立连接（仅一次）
  useEffect(() => {
    let closedByUser = false

    const connect = () => {
      const token = getAccessToken()
      if (!token) return

      const ws = new WebSocket(`/ws?token=${encodeURIComponent(token)}`)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempt.current = 0
        setState((s) => ({ ...s, connected: true }))
        const sym = symbolRef.current
        if (sym) {
          ws.send(JSON.stringify({ type: 'subscribe', symbol: sym }))
        }
        heartbeatTimer.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, HEARTBEAT_INTERVAL)
      }

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
        }
      }

      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }))
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current)
          heartbeatTimer.current = null
        }
        if (closedByUser) return
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
