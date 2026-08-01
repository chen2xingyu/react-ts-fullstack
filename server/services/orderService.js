const pool = require('../config/db')
const { redis } = require('../config/redis')
const config = require('../config')
const StockModel = require('../models/stockModel')
const PositionModel = require('../models/positionModel')
const OrderModel = require('../models/orderModel')
const activeSnapshot = require('./activeOrderSnapshot')
const {
  ORDER_SIDE,
  ORDER_TYPE,
  ORDER_STATUS,
  CHANNELS,
} = require('../config/trading')

/**
 * 风控拒绝（业务错误，非 5xx）
 * controller 据此返回 code=1，前端拦截器 reject(message)
 */
class RiskError extends Error {
  constructor(rule, message) {
    super(message)
    this.name = 'RiskError'
    this.rule = rule
    this.isRisk = true
  }
}

/**
 * 取最新价：Redis 快照优先，回落昨收
 */
async function getLatestPrice(symbol, prevClose) {
  try {
    const last = await redis.hget(CHANNELS.HASH_QUOTE_TICK(symbol), 'last_price')
    if (last) return Number(last)
  } catch {
    // Redis 不可用时回落昨收
  }
  return prevClose
}

/**
 * 写风控日志（best-effort，不阻断主流程）
 * action: 'order' | 'cancel' —— 区分下单风控与撤单风控
 */
async function logRisk(userId, symbol, action, rule, detail) {
  try {
    await pool.query(
      'INSERT INTO risk_logs (user_id, symbol, action, rule, detail) VALUES (?, ?, ?, ?, ?)',
      [userId, symbol || null, action, rule, detail]
    )
  } catch {
    // 风控日志失败不影响下单
  }
}

/**
 * 风控拒绝统一出口：先记 risk_logs，再抛 RiskError
 * 用此函数集中所有风控拒绝，保证“每一笔拒绝都留痕可查”。
 * - 事务内调用也安全：logRisk 用 pool 独立连接（autocommit），不受外层 rollback 影响
 * - detail 省略时用 message 作为明细
 */
async function rejectRisk({ userId, symbol, action = 'order', rule, message, detail }) {
  await logRisk(userId, symbol, action, rule, detail || message)
  throw new RiskError(rule, message)
}

/**
 * 下单主流程：风控校验 → 事务内冻结资金/持仓 + 落库 → 投递撮合 Stream
 *
 * 资金/持仓的真相源唯一在 MySQL，冻结与落单在同一事务内完成，保证一致性。
 * 冻结用带条件的 UPDATE（cash_available >= ? / available_quantity >= ?）做原子校验，
 * 避免并发下单的超卖/超冻。
 *
 * @param {number} userId
 * @param {object} account  req.account（ensureAccount 注入）
 * @param {object} input { symbol, side, order_type, price, quantity, client_order_id }
 * @returns {Promise<object>} 新建的订单
 */
async function placeOrder(userId, account, input) {
  const { symbol, side, order_type, price, quantity, client_order_id } = input

  // 1. 基础校验
  if (![ORDER_SIDE.BUY, ORDER_SIDE.SELL].includes(side)) {
    await rejectRisk({ userId, symbol, rule: 'bad_side', message: '委托方向无效' })
  }
  if (![ORDER_TYPE.LIMIT, ORDER_TYPE.MARKET].includes(order_type)) {
    await rejectRisk({ userId, symbol, rule: 'bad_type', message: '委托类型无效' })
  }
  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty <= 0) {
    await rejectRisk({ userId, symbol, rule: 'bad_qty', message: '委托数量须为正整数' })
  }

  // 2. 股票元数据 + 手数
  const stock = await StockModel.findBySymbol(symbol)
  if (!stock || stock.status !== 1) {
    await rejectRisk({ userId, symbol, rule: 'bad_symbol', message: '股票不存在或已停牌' })
  }
  const lotSize = Number(stock.lot_size) || 100
  if (qty % lotSize !== 0) {
    await rejectRisk({
      userId,
      symbol,
      rule: 'lot_size',
      message: `数量须为 ${lotSize} 股（1手）的整数倍`,
    })
  }

  const prevClose = Number(stock.prev_close)
  const limitPct = Number(stock.price_limit_pct)
  const upLimit = Number((prevClose * (1 + limitPct)).toFixed(2))
  const downLimit = Number((prevClose * (1 - limitPct)).toFixed(2))

  // 3. 价格校验 + 冻结基准价
  let orderPrice = null
  let freezePrice
  if (order_type === ORDER_TYPE.LIMIT) {
    orderPrice = Number(price)
    if (!orderPrice || orderPrice <= 0) {
      await rejectRisk({ userId, symbol, rule: 'bad_price', message: '限价单价格无效' })
    }
    if (orderPrice > upLimit + 1e-9 || orderPrice < downLimit - 1e-9) {
      await rejectRisk({
        userId,
        symbol,
        rule: 'price_limit',
        message: `价格超出涨跌停范围 [${downLimit}, ${upLimit}]`,
        detail: `委托价 ${orderPrice}，涨跌停 [${downLimit}, ${upLimit}]`,
      })
    }
    freezePrice = orderPrice
  } else {
    // 市价单：按最新价冻结（无最新价回落昨收）
    freezePrice = await getLatestPrice(symbol, prevClose)
  }

  const feeRate = Number(account.fee_rate)
  const freezeAmount = Number((freezePrice * qty * (1 + feeRate)).toFixed(4))

  // 4. 预校验（给更友好的错误信息；真正防超卖靠事务内条件 UPDATE）
  if (side === ORDER_SIDE.BUY) {
    if (Number(account.cash_available) < freezeAmount) {
      await rejectRisk({
        userId,
        symbol,
        rule: 'no_cash',
        message: '可用资金不足',
        detail: `需冻结 ${freezeAmount}，可用 ${account.cash_available}`,
      })
    }
  } else {
    const pos = await PositionModel.findByUserAndSymbol(userId, symbol)
    const available = pos ? Number(pos.available_quantity) : 0
    if (available < qty) {
      await rejectRisk({
        userId,
        symbol,
        rule: 'no_position',
        message: `可用持仓不足（仅 ${available} 股）`,
        detail: `需卖 ${qty}，可用 ${available}`,
      })
    }
  }

  // 5. 幂等：client_order_id 去重
  if (client_order_id) {
    const [exist] = await pool.query(
      'SELECT id FROM orders WHERE user_id = ? AND client_order_id = ? LIMIT 1',
      [userId, client_order_id]
    )
    if (exist.length > 0) {
      await rejectRisk({ userId, symbol, rule: 'duplicate', message: '请勿重复提交委托' })
    }
  }

  // 6. 事务：原子冻结 + 落单
  const conn = await pool.getConnection()
  let order
  try {
    await conn.beginTransaction()

    if (side === ORDER_SIDE.BUY) {
      // 带条件 UPDATE：cash_available 不足时 affectedRows=0，回滚
      const [r] = await conn.query(
        `UPDATE accounts
           SET cash_available = cash_available - ?, cash_frozen = cash_frozen + ?
         WHERE user_id = ? AND cash_available >= ?`,
        [freezeAmount, freezeAmount, userId, freezeAmount]
      )
      if (r.affectedRows === 0) {
        // 并发抢占失败：logRisk 用 pool 独立连接，rollback 不影响日志落库
        await rejectRisk({
          userId,
          symbol,
          rule: 'no_cash',
          message: '可用资金不足（并发抢占）',
          detail: `并发抢占失败，需冻结 ${freezeAmount}`,
        })
      }
    } else {
      const [r] = await conn.query(
        `UPDATE positions
           SET available_quantity = available_quantity - ?, frozen_quantity = frozen_quantity + ?
         WHERE user_id = ? AND symbol = ? AND available_quantity >= ?`,
        [qty, qty, userId, symbol, qty]
      )
      if (r.affectedRows === 0) {
        await rejectRisk({
          userId,
          symbol,
          rule: 'no_position',
          message: '可用持仓不足（并发抢占）',
          detail: `并发抢占失败，需卖 ${qty}`,
        })
      }
    }

    const [ins] = await conn.query(
      `INSERT INTO orders
         (user_id, account_id, symbol, side, order_type, price, quantity, filled_quantity, avg_fill_price, frozen_cash, status, client_order_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
      [
        userId,
        account.id,
        symbol,
        side,
        order_type,
        orderPrice,
        qty,
        side === ORDER_SIDE.BUY ? freezeAmount : 0,
        ORDER_STATUS.PENDING,
        client_order_id || null,
      ]
    )
    const orderId = ins.insertId
    await conn.commit()
    order = await OrderModel.findById(orderId)
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  // 7. 投递撮合（阶段4 Python 消费；此处失败不影响已落库订单，由补偿机制处理）
  try {
    await redis.xadd(
      CHANNELS.STREAM_ORDERS_NEW,
      '*',
      'order_id', String(order.id),
      'user_id', String(userId),
      'symbol', symbol,
      'side', String(side),
      'order_type', String(order_type),
      'price', orderPrice ? String(orderPrice) : '',
      'quantity', String(qty)
    )
  } catch (e) {
    console.warn('⚠️ 订单投递 Redis Stream 失败（撮合未启动？）:', e.message)
  }

  // 8. 阶段 6 容灾：限价单写活跃快照（市价单不挂簿，无需快照）
  if (order_type === ORDER_TYPE.LIMIT) {
    await activeSnapshot.addActive({
      id: order.id,
      user_id: userId,
      symbol,
      side,
      order_type,
      price: orderPrice,
      quantity: qty,
      filled_quantity: 0,
    })
  }

  return order
}

/**
 * 撤单主流程（阶段 5）：校验 → 投递撤单指令到撮合引擎
 *
 * 设计要点：
 * - 不在此处直接释放冻结/改状态：撮合引擎是订单簿的唯一权威，
 *   由它决定“还能撤多少”（unfilled_qty），再经 stream:orders:status
 *   由 tradeConsumer.settleOrderStatus 事务释放冻结 + 置 CANCELED。
 * - 此处仅做“能否撤”的前置校验 + 投递 stream:orders:cancel，
 *   引擎收到后从簿中移除并产出 status 事件。
 * - 若订单已不在簿中（已全部成交/已被撤），引擎不产出事件，
 *   委托单的最终状态由成交回报自然推导，前端轮询可见真实结果。
 *
 * @param {number} userId
 * @param {number} orderId
 * @returns {Promise<{order_id:number, status:string}>}
 */
async function cancelOrder(userId, orderId) {
  // 1. 查单 + 归属校验
  const order = await OrderModel.findById(orderId)
  if (!order || Number(order.user_id) !== Number(userId)) {
    await rejectRisk({
      userId,
      symbol: order?.symbol,
      action: 'cancel',
      rule: 'not_found',
      message: '委托单不存在',
    })
  }

  // 2. 状态校验：仅待成交/部分成交可撤
  const st = Number(order.status)
  if (st !== ORDER_STATUS.PENDING && st !== ORDER_STATUS.PARTIAL) {
    await rejectRisk({
      userId,
      symbol: order.symbol,
      action: 'cancel',
      rule: 'bad_status',
      message: `委托单当前状态（${st}）不可撤销，仅待成交/部分成交可撤`,
    })
  }

  // 3. 投递撤单指令（引擎权威：据簿中剩余量产出 status 事件）
  try {
    await redis.xadd(
      CHANNELS.STREAM_ORDERS_CANCEL,
      '*',
      'order_id', String(order.id),
      'user_id', String(userId),
      'symbol', order.symbol
    )
  } catch (e) {
    console.warn('⚠️ 撤单投递 Redis Stream 失败:', e.message)
    throw new Error('撤单请求投递失败，请稍后重试')
  }

  console.log(`[cancel] 用户 ${userId} 撤单 #${orderId} ${order.symbol} 已投递引擎`)
  return { order_id: orderId, status: 'canceling' }
}

module.exports = { placeOrder, cancelOrder, RiskError }
