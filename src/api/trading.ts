import { http } from './request'
import type {
  Stock,
  Account,
  Position,
  Order,
  Trade,
  Quote,
  Kline,
} from '@/types/trading'

// 股票列表
export function getStocks() {
  return http.get<Stock[]>('/trading/stocks').then((r) => r.data)
}

// 资金账户
export function getAccount() {
  return http.get<Account>('/trading/account').then((r) => r.data)
}

// 持仓列表
export function getPositions() {
  return http.get<Position[]>('/trading/positions').then((r) => r.data)
}

// 委托列表（可按状态过滤）
export function getOrders(params?: {
  status?: number
  page?: number
  pageSize?: number
}) {
  return http.get<Order[]>('/trading/orders', { params }).then((r) => r.data)
}

// 下单（限价/市价 + 买入/卖出）
export function placeOrder(data: {
  symbol: string
  side: number // 1买入 2卖出
  order_type: number // 1限价 2市价
  price?: number | null
  quantity: number
  client_order_id?: string
}) {
  return http.post<Order>('/trading/orders', data).then((r) => r.data)
}

// 撤单（阶段 5）：投递撤单指令到撮合引擎，引擎权威产出 status 事件
export function cancelOrder(orderId: number) {
  return http
    .post<{ order_id: number; status: string }>(`/trading/orders/${orderId}/cancel`)
    .then((r) => r.data)
}

// 成交列表
export function getTrades() {
  return http.get<Trade[]>('/trading/trades').then((r) => r.data)
}

// 单只股票实时行情快照
export function getQuote(symbol: string) {
  return http.get<Quote>(`/trading/quotes/${symbol}`).then((r) => r.data)
}

// K线历史
export function getKlines(symbol: string, params?: { period?: string; limit?: number }) {
  return http.get<Kline[]>(`/trading/klines/${symbol}`, { params }).then((r) => r.data)
}
