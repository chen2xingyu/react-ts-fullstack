/**
 * 交易系统常量配置
 */

// 订单状态
const ORDER_STATUS = {
  PENDING: 0,    // 待成交
  PARTIAL: 1,    // 部分成交
  FILLED: 2,     // 全部成交
  CANCELED: 3,   // 已撤单
  REJECTED: 4,   // 已拒绝
}

const ORDER_STATUS_LABELS = {
  0: '待成交',
  1: '部分成交',
  2: '已成交',
  3: '已撤单',
  4: '已拒绝',
}

// 订单方向
const ORDER_SIDE = {
  BUY: 1,
  SELL: 2,
}

const ORDER_SIDE_LABELS = {
  1: '买入',
  2: '卖出',
}

// 订单类型
const ORDER_TYPE = {
  LIMIT: 1,   // 限价单
  MARKET: 2,  // 市价单
}

// Redis Stream / Pub/Sub 通道名
const CHANNELS = {
  STREAM_ORDERS_NEW: 'stream:orders:new',
  STREAM_ORDERS_CANCEL: 'stream:orders:cancel',
  STREAM_TRADES_DONE: 'stream:trades:done',
  STREAM_ORDERS_STATUS: 'stream:orders:status',
  PUB_MARKET_TICK: (symbol) => `ch:market:tick:${symbol}`,
  PUB_MARKET_KLINE: (symbol) => `ch:market:kline:${symbol}`,
  PUB_MARKET_DEPTH: (symbol) => `ch:market:depth:${symbol}`,
  PUB_USER_NOTIFY: (userId) => `ch:user:${userId}:notify`,
  HASH_QUOTE_TICK: (symbol) => `quote:tick:${symbol}`,
  HASH_STOCKS: 'trading:stocks',
  // 阶段 6 容灾：活跃限价单快照（撮合引擎重启重建簿用）
  SET_ORDERS_ACTIVE: 'orders:active', // SET：所有在簿活跃限价单 id
  HASH_ORDER_ACTIVE: (orderId) => `orders:active:${orderId}`, // 单单 Hash：重建所需的全部字段
}

// 消费者组
const CONSUMER_GROUPS = {
  MATCHERS: 'matchers',
  SETTLERS: 'settlers',
}

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_SIDE,
  ORDER_SIDE_LABELS,
  ORDER_TYPE,
  CHANNELS,
  CONSUMER_GROUPS,
}
