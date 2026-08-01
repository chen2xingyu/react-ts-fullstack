/**
 * 阶段 5 撤单链路端到端验证
 *
 * 直接调用 service（绕过 HTTP/鉴权），但仍覆盖完整链路：
 *   orderService.cancelOrder → XADD stream:orders:cancel
 *   → Python CancelConsumer → OrderBook.cancel → publish stream:orders:status
 *   → Node settleOrderStatus → 事务释放冻结 + 置 CANCELED
 *
 * 流程：
 *  1. 记录账户初始状态
 *  2. 挂一笔远离市价的限价买单（不会成交，静挂簿中）
 *  3. 等待订单进入 PENDING，校验冻结资金已增加
 *  4. 调撤单
 *  5. 轮询订单状态直至 CANCELED
 *  6. 校验冻结资金已释放回初始水平（资金守恒）
 *  7. 重复撤单 → 应被风控拒绝（已终态）
 *
 * 运行：node server/scripts/verify-cancel.js
 */
const pool = require('../config/db')
const AccountModel = require('../models/accountModel')
const OrderModel = require('../models/orderModel')
const orderService = require('../services/orderService')

const USER_ID = 1
const SYMBOL = '000001' // 平安银行 prev_close=12.5
const BUY_PRICE = 11.3 // 远低于市价且在跌停[11.25,13.75]内 → 不会成交，静挂簿中
const QTY = 200

const STATUS = { PENDING: 0, PARTIAL: 1, FILLED: 2, CANCELED: 3, REJECTED: 4 }
const round = (v, d = 4) => Number(Number(v).toFixed(d))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  console.log('=== 阶段 5 撤单链路验证开始 ===')

  const account = await AccountModel.findByUserId(USER_ID)
  if (!account) throw new Error('账户不存在，请先 seed-users')

  // 1. 初始状态
  const acc0 = account
  console.log(
    `[before] available=${acc0.cash_available} frozen=${acc0.cash_frozen} total=${acc0.cash_total} fee_rate=${acc0.fee_rate}`
  )

  // 2. 挂限价买单（远离市价，不成交）
  const order = await orderService.placeOrder(USER_ID, account, {
    symbol: SYMBOL,
    side: 1, // 买
    order_type: 1, // 限价
    price: BUY_PRICE,
    quantity: QTY,
    client_order_id: `cancel-verify-${Date.now()}`,
  })
  console.log(`[order] 委托 #${order.id} 买${QTY}@${BUY_PRICE} 已提交，等待入簿`)

  // 3. 轮询至 PENDING，校验冻结增加
  let latest
  for (let i = 0; i < 10; i++) {
    await sleep(300)
    latest = await OrderModel.findById(order.id)
    if (latest && Number(latest.status) === STATUS.PENDING) break
  }
  if (!latest || Number(latest.status) !== STATUS.PENDING) {
    throw new Error(`订单未进入 PENDING（status=${latest?.status}），可能已意外成交`)
  }
  const frozen0 = Number(acc0.cash_frozen)
  const freezeAmt = round(BUY_PRICE * QTY * (1 + Number(acc0.fee_rate)))
  const acc1 = await AccountModel.findByUserId(USER_ID)
  const frozenDelta1 = round(Number(acc1.cash_frozen) - frozen0)
  console.log(
    `[pending] filled=${latest.filled_quantity} | available=${acc1.cash_available} frozen=${acc1.cash_frozen} (预期冻结+${freezeAmt})`
  )
  if (Math.abs(frozenDelta1 - freezeAmt) > 0.01) {
    throw new Error(`❌ 冻结资金未按预期增加：实际+${frozenDelta1} 预期+${freezeAmt}`)
  }
  console.log(`[check] ✅ 冻结资金已增加 ${frozenDelta1}`)

  // 4. 撤单
  const result = await orderService.cancelOrder(USER_ID, order.id)
  console.log(`[cancel] 撤单已投递：${JSON.stringify(result)}`)

  // 5. 轮询至 CANCELED
  let canceled = false
  for (let i = 0; i < 25; i++) {
    await sleep(400)
    latest = await OrderModel.findById(order.id)
    if (latest && Number(latest.status) === STATUS.CANCELED) {
      canceled = true
      break
    }
  }
  if (!canceled) throw new Error(`❌ 订单未变为 CANCELED（当前 status=${latest?.status}）`)
  console.log(`[canceled] ✅ 订单 #${order.id} 状态=CANCELED reason=${latest.reject_reason}`)

  // 6. 校验冻结释放回初始水平（资金守恒）
  await sleep(300)
  const acc2 = await AccountModel.findByUserId(USER_ID)
  const frozenDelta2 = round(Number(acc2.cash_frozen) - frozen0)
  console.log(
    `[after] available=${acc2.cash_available} frozen=${acc2.cash_frozen} total=${acc2.cash_total} (冻结较初始+${frozenDelta2})`
  )
  if (Math.abs(frozenDelta2) > 0.01) {
    throw new Error(`❌ 冻结资金未释放回初始水平：仍多 ${frozenDelta2}`)
  }
  if (Math.abs(Number(acc2.cash_available) - Number(acc0.cash_available)) > 0.01) {
    throw new Error(
      `❌ 可用资金未恢复：初始 ${acc0.cash_available} → 现在 ${acc2.cash_available}`
    )
  }
  console.log(`[check] ✅ 冻结已全额释放，可用资金恢复，资金守恒`)

  // 7. 重复撤单 → 应被风控拒绝（已终态）
  try {
    await orderService.cancelOrder(USER_ID, order.id)
    throw new Error('重复撤单应被拒绝，但实际成功了')
  } catch (e) {
    if (e.isRisk) {
      console.log(`[idempotent] ✅ 重复撤单被风控拒绝：${e.message}`)
    } else {
      throw e
    }
  }

  // 8. 撤别人的单 → 应被拒绝（归属校验）
  try {
    await orderService.cancelOrder(99999, order.id)
    throw new Error('撤他人委托应被拒绝，但实际成功了')
  } catch (e) {
    if (e.isRisk && e.rule === 'not_found') {
      console.log(`[ownership] ✅ 撤他人委托被拒绝：${e.message}`)
    } else {
      throw e
    }
  }

  console.log('\n=== ✅ 阶段 5 撤单链路验证全部通过 ===')
  process.exit(0)
}

main().catch((e) => {
  console.error('\n=== ❌ 验证失败 ===')
  console.error(e.message)
  process.exit(1)
})
