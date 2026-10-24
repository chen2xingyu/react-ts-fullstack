/**
 * 🎯 面试考点：RESTful 接口封装与泛型解包
 * 约定：GET 查列表/详情、POST 新建动作、PUT 全量更新、DELETE 删除；路径用资源名复数
 * （/trading/orders），动态段用路径参数 `/orders/${id}/cancel`。
 * 统一写法 `http.get<Stock[]>('/x').then(r => r.data)`：
 *   http.get<T> 声明业务 data 的类型，.then(r => r.data) 把信封 ApiResponse<T>
 *   解包成 T —— 调用方拿到的直接是 Stock[]，不感知信封层。
 * 字段用 snake_case（created_at）是刻意对齐后端 DB 字段，前端不做转换，避免双向映射成本。
 */
import { http } from './request'
import type {
  Stock,
  Account,
  Position,
  Order,
  Trade,
  Quote,
  Kline,
  RiskLog,
  RiskLogSummary,
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

// 风控日志（阶段 6）：查询当前用户的风控拒绝记录
export function getRiskLogs(params?: {
  action?: string
  rule?: string
  page?: number
  pageSize?: number
}) {
  return http.get<RiskLog[]>('/trading/risk-logs', { params }).then((r) => r.data)
}

// 风控日志按 rule 聚合统计
export function getRiskLogsSummary() {
  return http.get<RiskLogSummary[]>('/trading/risk-logs/summary').then((r) => r.data)
}
