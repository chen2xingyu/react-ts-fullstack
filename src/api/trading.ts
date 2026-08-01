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
