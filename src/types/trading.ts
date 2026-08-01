// 交易系统常量（与后端 server/config/trading.js 对齐）

export const ORDER_STATUS = {
  PENDING: 0, // 待成交
  PARTIAL: 1, // 部分成交
  FILLED: 2, // 全部成交
  CANCELED: 3, // 已撤单
  REJECTED: 4, // 已拒绝
} as const

export const ORDER_STATUS_LABELS: Record<number, string> = {
  0: '待成交',
  1: '部分成交',
  2: '已成交',
  3: '已撤单',
  4: '已拒绝',
}

export const ORDER_SIDE = {
  BUY: 1,
  SELL: 2,
} as const

export const ORDER_SIDE_LABELS: Record<number, string> = {
  1: '买入',
  2: '卖出',
}

export const ORDER_TYPE = {
  LIMIT: 1, // 限价单
  MARKET: 2, // 市价单
} as const

// 实体类型
export interface Stock {
  id: number
  symbol: string
  name: string
  exchange: string
  prev_close: number
  price_limit_pct: number
  lot_size: number
  status: number
  listed_date: string | null
}

export interface Account {
  id: number
  user_id: number
  cash_total: number
  cash_available: number
  cash_frozen: number
  fee_rate: number
}

export interface Position {
  id: number
  user_id: number
  symbol: string
  quantity: number
  available_quantity: number
  frozen_quantity: number
  total_cost: number
  avg_cost: number
}

export interface Order {
  id: number
  user_id: number
  account_id: number
  symbol: string
  side: number
  order_type: number
  price: number | null
  quantity: number
  filled_quantity: number
  avg_fill_price: number
  status: number
  reject_reason: string | null
  client_order_id: string | null
  created_at: string
}

export interface Trade {
  id: number
  trade_no: string
  symbol: string
  buy_order_id: number | null
  sell_order_id: number | null
  buyer_id: number | null
  seller_id: number | null
  side: number
  price: number
  quantity: number
  amount: number
  trade_time: string
}

export interface Quote {
  symbol: string
  last_price: number
  open: number
  high: number
  low: number
  pre_close: number
  volume: number
  amount: number
  ts: string | null
}

export interface Kline {
  id: number
  symbol: string
  period: string
  ts: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  amount: number
}

// 风控日志（阶段 6）
export interface RiskLog {
  id: number
  user_id: number
  symbol: string | null
  action: string // 'order' | 'cancel'
  rule: string // bad_side / no_cash / price_limit ...
  detail: string | null
  created_at: string
}

export interface RiskLogSummary {
  rule: string
  cnt: number
}

// 风控规则中文标签（与后端 orderService rejectRisk rule 对齐）
export const RISK_RULE_LABELS: Record<string, string> = {
  bad_side: '方向无效',
  bad_type: '类型无效',
  bad_qty: '数量非法',
  bad_symbol: '标的不存在',
  lot_size: '手数不符',
  bad_price: '价格无效',
  price_limit: '涨跌停限制',
  no_cash: '资金不足',
  no_position: '持仓不足',
  duplicate: '重复提交',
  not_found: '委托不存在',
  bad_status: '状态不可撤',
}

export const RISK_ACTION_LABELS: Record<string, string> = {
  order: '下单',
  cancel: '撤单',
}
