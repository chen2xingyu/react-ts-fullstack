// 交易系统常量（与后端 server/config/trading.js 对齐）

/**
 * 🎯 面试考点：as const —— 把字面量对象收紧成字面量联合类型
 * 不加 as const：ORDER_STATUS.PENDING 的类型被推断为宽 number，传参处无法区分 0 和 99。
 * 加了 as const：每个值推断为字面量类型（0 | 1 | 2 | 3 | 4），相当于一枚枚枚举，
 *   使用处能获得更精确的类型检查与自动补全。
 * TS→JS：as const 编译后【完全擦除】，运行时 ORDER_STATUS 就是个普通对象，没有任何
 *   枚举运行时开销（对比 TS enum 会编译成真实的双向映射对象）。
 * 易错点：as const 对象的属性变成 readonly，不能再赋值 —— 符合「常量」语义。
 */
export const ORDER_STATUS = {
  PENDING: 0, // 待成交
  PARTIAL: 1, // 部分成交
  FILLED: 2, // 全部成交
  CANCELED: 3, // 已撤单
  REJECTED: 4, // 已拒绝
} as const

// Record<number, string> 是映射类型：索引为 number、值为 string，相当于
//   { [k: number]: string }。这里把状态码映射成中文标签，与 ORDER_STATUS 一一对应。
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
// 🎯 面试考点：`T | null`（可空）与 `T?`（可选）的区别 —— 高频易错
//   `price: number | null` 表示「后端这个 key 一定存在，只是值可能是 null」；
//   `website?: string` 表示「这个 key 可能根本不返回」。
//   对齐后端 JSON 时选错会导致解引用报错：实际是 null 却声明成可选，TS 不提醒你判空。
//   实体字段沿用 snake_case（user_id/created_at）对齐 DB，前端不做 camelCase 转换。
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
// 🎯 面试考点：这里 action/rule 用 string 是「能跑」的写法；更工程化的做法是可辨识联合
//   （Discriminated Union）：把 action 收紧成 `'order' | 'cancel'`，rule 收紧成
//   `'bad_side' | 'no_cash' | 'price_limit' | ...`，这样 switch(log.action) 时
//   TS 能做穷尽性检查，拼错字符串立刻报错。当前仅靠行注释约束，重构方向即在此。
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
