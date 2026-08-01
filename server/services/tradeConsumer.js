const pool = require('../config/db')
const { redis } = require('../config/redis')
const { hub } = require('../ws/hub')
const {
  CHANNELS,
  CONSUMER_GROUPS,
  ORDER_STATUS,
} = require('../config/trading')

// 订单状态 Stream 用独立消费者组（与成交 Stream 分开，各自 ACK）
const GROUP_STATUS = 'status-settlers'
const CONSUMER_TRADE = 'settler-1'
const CONSUMER_STATUS = 'status-settler-1'

let tradeStarted = false
let statusStarted = false

/**
 * ioredis RESP2 下 XREADGROUP 的 fields 是扁平数组 [k,v,k,v,...]，
 * 转为对象 {k:v} 便于取值。（redis-py 返回字典，无需此处理）
 */
function toFieldsObject(fields) {
  if (fields && !Array.isArray(fields)) return fields
  const obj = {}
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1]
  }
  return obj
}

/**
 * 消费成交回报 Stream → 事务结算（订单/资金/持仓）→ XACK → WS 推送
 *
 * 结算数学（资金守恒：cash_total = cash_available + cash_frozen）：
 *  买方（冻结资金 → 实付）：
 *    fillFrozen = order.frozen_cash * (fillQty / order.quantity)   // 本次成交对应的冻结份额
 *    actualCost = price * fillQty * (1 + feeRate)                  // 实付（含手续费）
 *    cash_frozen -= fillFrozen
 *    cash_total  -= actualCost
 *    cash_available += (fillFrozen - actualCost)                   // 限价买成交价低于委托价时返还差额
 *    持仓 += fillQty（可用 + 总持仓），total_cost += price*fillQty
 *  卖方（冻结持仓 → 实收）：
 *    actualProceeds = price * fillQty * (1 - feeRate)              // 实收（扣手续费）
 *    cash_total += actualProceeds, cash_available += actualProceeds
 *    持仓：frozen_quantity -= fillQty, quantity -= fillQty, total_cost -= avg_cost*fillQty（均价不变）
 *
 * 幂等：trades.trade_no 唯一键，重复消费时 INSERT 失败 → 直接 ACK 跳过。
 * 顺序无关：撤单事件用事件携带的 unfilled_qty 释放冻结，与成交事件先后无关。
 */
async function settleTrade(fields) {
  const tradeNo = fields.trade_no
  const symbol = fields.symbol
  const buyOrderId = Number(fields.buy_order_id)
  const sellOrderId = Number(fields.sell_order_id)
  const buyerId = Number(fields.buyer_id)
  const sellerId = Number(fields.seller_id)
  const price = Number(fields.price)
  const fillQty = Number(fields.quantity)
  const amount = Number(fields.amount)
  const tradeTime = new Date(Number(fields.ts))

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // 0. 幂等：已结算过则跳过
    const [exist] = await conn.query('SELECT id FROM trades WHERE trade_no = ? LIMIT 1', [tradeNo])
    if (exist.length > 0) {
      await conn.commit()
      return { skipped: true }
    }

    // 1. 锁定买卖委托单（FOR UPDATE 防并发同单结算）
    const [buyRows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [buyOrderId])
    const [sellRows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [sellOrderId])
    const buyOrder = buyRows[0]
    const sellOrder = sellRows[0]
    if (!buyOrder || !sellOrder) {
      await conn.commit()
      console.warn(`[settler] 委托单缺失 buy=${buyOrderId} sell=${sellOrderId}，跳过 ${tradeNo}`)
      return { skipped: true }
    }

    // 2. 账户（取手续费率）
    const [buyerAccRows] = await conn.query('SELECT * FROM accounts WHERE user_id = ? FOR UPDATE', [buyerId])
    const [sellerAccRows] = await conn.query('SELECT * FROM accounts WHERE user_id = ? FOR UPDATE', [sellerId])
    const buyerAcc = buyerAccRows[0]
    const sellerAcc = sellerAccRows[0]
    if (!buyerAcc || !sellerAcc) {
      await conn.commit()
      console.warn(`[settler] 账户缺失 buyer=${buyerId} seller=${sellerId}，跳过 ${tradeNo}`)
      return { skipped: true }
    }

    // 3. 卖方持仓（取均价用于结转成本）
    const [sellerPosRows] = await conn.query(
      'SELECT * FROM positions WHERE user_id = ? AND symbol = ? FOR UPDATE',
      [sellerId, symbol]
    )
    const sellerPos = sellerPosRows[0]

    // 4. 写成交记录
    await conn.query(
      `INSERT INTO trades (trade_no, symbol, buy_order_id, sell_order_id, buyer_id, seller_id, side, price, quantity, amount, trade_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tradeNo, symbol, buyOrderId, sellOrderId, buyerId, sellerId, Number(fields.side), price, fillQty, amount, tradeTime]
    )

    // 5. 买方结算
    const buyerFeeRate = Number(buyerAcc.fee_rate)
    const actualCost = Number((price * fillQty * (1 + buyerFeeRate)).toFixed(4))
    const buyFillFrozen = Number((Number(buyOrder.frozen_cash) * (fillQty / Number(buyOrder.quantity))).toFixed(4))
    // 释放本次成交对应的冻结 + 实付
    await conn.query(
      `UPDATE accounts
         SET cash_frozen = cash_frozen - ?,
             cash_total = cash_total - ?,
             cash_available = cash_available + ?
       WHERE user_id = ?`,
      [buyFillFrozen, actualCost, Number((buyFillFrozen - actualCost).toFixed(4)), buyerId]
    )
    // 买方持仓增加（可用+总量，成本按成交价）
    await conn.query(
      `INSERT INTO positions (user_id, symbol, quantity, available_quantity, frozen_quantity, total_cost, avg_cost)
       VALUES (?, ?, ?, ?, 0, ?, ?)
       ON DUPLICATE KEY UPDATE
         quantity = quantity + ?,
         available_quantity = available_quantity + ?,
         frozen_quantity = frozen_quantity,
         total_cost = total_cost + ?,
         avg_cost = CASE WHEN quantity > 0 THEN total_cost / quantity ELSE 0 END`,
      [buyerId, symbol, fillQty, fillQty, Number((price * fillQty).toFixed(4)), price,
       fillQty, fillQty, Number((price * fillQty).toFixed(4))]
    )
    // 买方委托单：累计成交量 + 加权均价 + 状态
    const buyNewFilled = Number(buyOrder.filled_quantity) + fillQty
    const buyNewAvg = Number(
      ((Number(buyOrder.avg_fill_price) * Number(buyOrder.filled_quantity) + price * fillQty) / buyNewFilled).toFixed(4)
    )
    // 阶段 5 竞态守卫：撤单事件可能先于在途成交回报到达并置 CANCELED，
    // 此时迟到的成交仍要记账（资金按比例释放已守恒），但不应把终态“复活”成部分成交；
    // 仅当累计成交达满量时才升为 FILLED（真实全部成交）。
    const buyNewStatus = buyNewFilled >= Number(buyOrder.quantity)
      ? ORDER_STATUS.FILLED
      : (Number(buyOrder.status) === ORDER_STATUS.CANCELED ? ORDER_STATUS.CANCELED : ORDER_STATUS.PARTIAL)
    await conn.query(
      `UPDATE orders SET filled_quantity = ?, avg_fill_price = ?, status = ? WHERE id = ?`,
      [buyNewFilled, buyNewAvg, buyNewStatus, buyOrderId]
    )

    // 6. 卖方结算
    const sellerFeeRate = Number(sellerAcc.fee_rate)
    const actualProceeds = Number((price * fillQty * (1 - sellerFeeRate)).toFixed(4))
    await conn.query(
      `UPDATE accounts SET cash_total = cash_total + ?, cash_available = cash_available + ? WHERE user_id = ?`,
      [actualProceeds, actualProceeds, sellerId]
    )
    // 卖方持仓：冻结量 -= fillQty，总量 -= fillQty，成本按均价结转（均价不变）
    const sellerAvgCost = sellerPos ? Number(sellerPos.avg_cost) : 0
    const sellerCostDelta = Number((sellerAvgCost * fillQty).toFixed(4))
    await conn.query(
      `INSERT INTO positions (user_id, symbol, quantity, available_quantity, frozen_quantity, total_cost, avg_cost)
       VALUES (?, ?, 0, 0, 0, 0, 0)
       ON DUPLICATE KEY UPDATE
         quantity = quantity - ?,
         available_quantity = available_quantity,
         frozen_quantity = frozen_quantity - ?,
         total_cost = total_cost - ?,
         avg_cost = CASE WHEN quantity > 0 THEN total_cost / quantity ELSE 0 END`,
      [sellerId, symbol, fillQty, fillQty, sellerCostDelta]
    )
    // 卖方委托单
    const sellNewFilled = Number(sellOrder.filled_quantity) + fillQty
    const sellNewAvg = Number(
      ((Number(sellOrder.avg_fill_price) * Number(sellOrder.filled_quantity) + price * fillQty) / sellNewFilled).toFixed(4)
    )
    // 阶段 5 竞态守卫：同买方，避免迟到成交复活已撤卖单
    const sellNewStatus = sellNewFilled >= Number(sellOrder.quantity)
      ? ORDER_STATUS.FILLED
      : (Number(sellOrder.status) === ORDER_STATUS.CANCELED ? ORDER_STATUS.CANCELED : ORDER_STATUS.PARTIAL)
    await conn.query(
      `UPDATE orders SET filled_quantity = ?, avg_fill_price = ?, status = ? WHERE id = ?`,
      [sellNewFilled, sellNewAvg, sellNewStatus, sellOrderId]
    )

    await conn.commit()

    // 7. WS 推送成交给买卖双方（best-effort）
    const tradeView = {
      trade_no: tradeNo, symbol, price, quantity: fillQty, amount,
      buy_order_id: buyOrderId, sell_order_id: sellOrderId,
      ts: tradeTime.toISOString(),
    }
    hub.sendToUser(buyerId, { type: 'trade', side: 1, data: tradeView })
    hub.sendToUser(sellerId, { type: 'trade', side: 2, data: tradeView })

    console.log(`[settler] 成交 ${tradeNo} ${symbol} ${fillQty}@${price} 买#${buyOrderId} 卖#${sellOrderId}`)
    return { skipped: false }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/**
 * 消费订单状态变更 Stream（撤单/拒绝）→ 释放剩余冻结 → XACK
 *
 * 触发场景（Python 撮合引擎产出）：
 *  - self_trade：自成交防范撤销的挂单
 *  - market_unfilled：市价单未成交余额
 *
 * 释放量按事件携带的 unfilled_qty 计算（与成交事件先后无关，顺序安全）：
 *  - 买单：返还冻结资金 = order.frozen_cash * (unfilled_qty / order.quantity)
 *  - 卖单：返还冻结持仓 = unfilled_qty 股（frozen -= , available +=）
 *
 * 幂等：仅当订单状态仍为待成交/部分成交时才释放，UPDATE 条件 affectedRows=0 视为已处理。
 */
async function settleOrderStatus(fields) {
  const orderId = Number(fields.order_id)
  const userId = Number(fields.user_id)
  const status = Number(fields.status)
  const unfilledQty = Number(fields.unfilled_qty)
  const reason = fields.reason || ''

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [rows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId])
    const order = rows[0]
    if (!order) {
      await conn.commit()
      return
    }
    // 仅处理仍活跃的订单（幂等：已撤/已拒/已成交的不再重复释放）
    if (order.status !== ORDER_STATUS.PENDING && order.status !== ORDER_STATUS.PARTIAL) {
      await conn.commit()
      return
    }

    if (Number(order.side) === 1) {
      // 买单：按比例返还冻结资金
      const release = Number((Number(order.frozen_cash) * (unfilledQty / Number(order.quantity))).toFixed(4))
      await conn.query(
        `UPDATE accounts SET cash_frozen = cash_frozen - ?, cash_available = cash_available + ? WHERE user_id = ?`,
        [release, release, userId]
      )
    } else {
      // 卖单：返还冻结持仓到可用
      await conn.query(
        `UPDATE positions SET frozen_quantity = frozen_quantity - ?, available_quantity = available_quantity + ?
         WHERE user_id = ? AND symbol = ?`,
        [unfilledQty, unfilledQty, userId, order.symbol]
      )
    }

    await conn.query(
      `UPDATE orders SET status = ?, reject_reason = ? WHERE id = ?`,
      [status, reason, orderId]
    )

    await conn.commit()
    console.log(`[status] 订单 #${orderId} ${reason} 释放 ${unfilledQty} 股/资金`)
    hub.sendToUser(userId, { type: 'order_status', data: { order_id: orderId, status, reason } })
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

async function ensureGroup(stream, group) {
  try {
    await redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM')
  } catch (e) {
    if (!String(e.message).includes('BUSYGROUP')) console.warn(`[consumer] 创建组 ${group} 警告:`, e.message)
  }
}

/** 启动成交回报消费者 */
function startTradeConsumer() {
  if (tradeStarted) return
  tradeStarted = true

  const loop = async () => {
    await ensureGroup(CHANNELS.STREAM_TRADES_DONE, CONSUMER_GROUPS.SETTLERS)
    console.log(`[settler] 开始消费 ${CHANNELS.STREAM_TRADES_DONE} (consumer=${CONSUMER_TRADE})`)
    while (true) {
      let resp
      try {
        resp = await redis.xreadgroup(
          'GROUP', CONSUMER_GROUPS.SETTLERS, CONSUMER_TRADE,
          'COUNT', 10, 'BLOCK', 2000,
          'STREAMS', CHANNELS.STREAM_TRADES_DONE, '>'
        )
      } catch (e) {
        console.warn('[settler] XREADGROUP 异常:', e.message)
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      if (!resp) continue
      for (const [, messages] of resp) {
        for (const [id, fields] of messages) {
          try {
            await settleTrade(toFieldsObject(fields))
          } catch (e) {
            console.error(`[settler] 结算失败 ${id}:`, e.message)
          }
          await redis.xack(CHANNELS.STREAM_TRADES_DONE, CONSUMER_GROUPS.SETTLERS, id).catch(() => {})
        }
      }
    }
  }
  loop().catch((e) => console.error('[settler] 循环异常:', e))
}

/** 启动订单状态消费者（撤单/拒绝释放冻结） */
function startOrderStatusConsumer() {
  if (statusStarted) return
  statusStarted = true

  const loop = async () => {
    await ensureGroup(CHANNELS.STREAM_ORDERS_STATUS, GROUP_STATUS)
    console.log(`[status] 开始消费 ${CHANNELS.STREAM_ORDERS_STATUS} (consumer=${CONSUMER_STATUS})`)
    while (true) {
      let resp
      try {
        resp = await redis.xreadgroup(
          'GROUP', GROUP_STATUS, CONSUMER_STATUS,
          'COUNT', 10, 'BLOCK', 2000,
          'STREAMS', CHANNELS.STREAM_ORDERS_STATUS, '>'
        )
      } catch (e) {
        console.warn('[status] XREADGROUP 异常:', e.message)
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      if (!resp) continue
      for (const [, messages] of resp) {
        for (const [id, fields] of messages) {
          try {
            await settleOrderStatus(toFieldsObject(fields))
          } catch (e) {
            console.error(`[status] 处理失败 ${id}:`, e.message)
          }
          await redis.xack(CHANNELS.STREAM_ORDERS_STATUS, GROUP_STATUS, id).catch(() => {})
        }
      }
    }
  }
  loop().catch((e) => console.error('[status] 循环异常:', e))
}

module.exports = { startTradeConsumer, startOrderStatusConsumer }
