const { redis } = require('../config/redis')
const { CHANNELS, ORDER_STATUS } = require('../config/trading')

/**
 * 阶段 6 容灾：活跃限价单快照
 *
 * 撮合引擎订单簿纯内存，崩溃重启后挂单会丢失。Node 在 MySQL 之外维护一份
 * “在簿活跃限价单”快照（Redis SET + 单单 Hash），撮合引擎启动时读取重建簿。
 *
 * 真相源仍是 MySQL（orders 表），此处快照仅用于引擎重启重建，按事件同步：
 *   下单(限价)  → addActive
 *   部分成交    → updateFilled
 *   全部成交/撤/拒 → removeActive
 *
 * 市价单不入簿（撮合即终结），不下快照。所有操作 best-effort，失败仅告警不阻断主流程。
 */

async function addActive(order) {
  try {
    const id = String(order.id)
    const pipe = redis.multi()
    pipe.sadd(CHANNELS.SET_ORDERS_ACTIVE, id)
    pipe.hset(CHANNELS.HASH_ORDER_ACTIVE(id), {
      order_id: id,
      user_id: String(order.user_id),
      symbol: order.symbol,
      side: String(order.side),
      order_type: String(order.order_type),
      price: order.price != null ? String(order.price) : '',
      quantity: String(order.quantity),
      filled_quantity: String(order.filled_quantity ?? 0),
    })
    await pipe.exec()
  } catch (e) {
    console.warn('⚠️ 活跃单快照写入失败:', e.message)
  }
}

/** 部分成交：更新已成交量（重建时 remaining = quantity - filled_quantity） */
async function updateFilled(orderId, filledQty) {
  try {
    await redis.hset(CHANNELS.HASH_ORDER_ACTIVE(orderId), 'filled_quantity', String(filledQty))
  } catch (e) {
    console.warn('⚠️ 活跃单快照更新已成交失败:', e.message)
  }
}

/** 终态（全部成交/撤单/拒绝）：移除快照 */
async function removeActive(orderId) {
  try {
    const id = String(orderId)
    const pipe = redis.multi()
    pipe.srem(CHANNELS.SET_ORDERS_ACTIVE, id)
    pipe.del(CHANNELS.HASH_ORDER_ACTIVE(id))
    await pipe.exec()
  } catch (e) {
    console.warn('⚠️ 活跃单快照移除失败:', e.message)
  }
}

module.exports = { addActive, updateFilled, removeActive }
