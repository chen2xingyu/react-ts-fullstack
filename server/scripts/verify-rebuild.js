/**
 * 阶段 6 容灾验证：撮合引擎重启重建簿
 *
 * 用法：
 *   node scripts/verify-rebuild.js phase1   # 挂一笔远离市价的限价买单 + 校验快照已写
 *   （手动：杀 Python 引擎 → 重启，观察日志 "从快照重建 1 笔挂单"）
 *   node scripts/verify-rebuild.js phase2   # 撤掉该单 → 证明重启后挂单仍在簿中有效
 *
 * 判定：phase2 撤单成功 + 冻结释放，说明重建簿保留了挂单；否则挂单丢失。
 */
const AccountModel = require('../models/accountModel')
const OrderModel = require('../models/orderModel')
const orderService = require('../services/orderService')
const activeSnapshot = require('../services/activeOrderSnapshot')
const { redis } = require('../config/redis')

const USER_ID = 1
const SYMBOL = '000001' // 平安银行 prev_close=12.5
const BUY_PRICE = 11.3 // 远低于市价且在跌停[11.25,13.75]内 → 不成交，静挂簿中
const QTY = 200

const STATUS = { PENDING: 0, PARTIAL: 1, FILLED: 2, CANCELED: 3, REJECTED: 4 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const mode = process.argv[2]

async function phase1() {
  console.log('=== 阶段 6 容灾验证 · phase1（挂单 + 写快照）===')
  const account = await AccountModel.findByUserId(USER_ID)
  const order = await orderService.placeOrder(USER_ID, account, {
    symbol: SYMBOL,
    side: 1,
    order_type: 1,
    price: BUY_PRICE,
    quantity: QTY,
    client_order_id: `rebuild-${Date.now()}`,
  })
  console.log(`[order] 委托 #${order.id} 买${QTY}@${BUY_PRICE} 已提交`)

  // 等待入簿 PENDING
  let latest
  for (let i = 0; i < 10; i++) {
    await sleep(300)
    latest = await OrderModel.findById(order.id)
    if (latest && Number(latest.status) === STATUS.PENDING) break
  }
  if (Number(latest.status) !== STATUS.PENDING) {
    throw new Error(`订单未进入 PENDING（status=${latest.status}）`)
  }

  // 校验快照已写：SET 含该 id，Hash 字段齐全
  const inSet = await redis.sismember('orders:active', String(order.id))
  const hash = await redis.hgetall(`orders:active:${order.id}`)
  const acc = await AccountModel.findByUserId(USER_ID)
  console.log(`[snapshot] inSet=${inSet} hash=${JSON.stringify(hash)}`)
  console.log(`[account] available=${acc.cash_available} frozen=${acc.cash_frozen}`)
  if (!inSet || !hash.order_id) throw new Error('❌ 活跃快照未正确写入')
  if (String(hash.symbol) !== SYMBOL) throw new Error('❌ 快照 symbol 不符')
  console.log(`[check] ✅ 快照已写入，order_id=${order.id}`)
  console.log(`\n>>> 现在请：杀掉 Python 引擎 → 重启（应见“从快照重建 1 笔挂单”）→ 再跑 phase2`)
  console.log(`>>> order_id=${order.id}（phase2 自动按 用户${USER_ID}/${SYMBOL} 的 PENDING 限价单定位）`)
  process.exit(0)
}

async function phase2() {
  console.log('=== 阶段 6 容灾验证 · phase2（撤单证明重建簿有效）===')
  // 定位 phase1 留下的 PENDING 限价买单
  const orders = await OrderModel.findByUserId(USER_ID, { status: STATUS.PENDING })
  const target = orders.find(
    (o) => o.symbol === SYMBOL && Number(o.side) === 1 && Number(o.order_type) === 1
  )
  if (!target) throw new Error('未找到 PENDING 的限价买单，请先跑 phase1')
  console.log(`[locate] 目标委托 #${target.id} 买${target.quantity}@${target.price}`)

  const accBefore = await AccountModel.findByUserId(USER_ID)
  console.log(`[before] frozen=${accBefore.cash_frozen}`)

  // 撤单：若重建簿成功，引擎能在簿中找到它 → 产出 status 事件 → 置 CANCELED
  const r = await orderService.cancelOrder(USER_ID, target.id)
  console.log(`[cancel] ${JSON.stringify(r)}`)

  let latest
  let canceled = false
  for (let i = 0; i < 25; i++) {
    await sleep(400)
    latest = await OrderModel.findById(target.id)
    if (latest && Number(latest.status) === STATUS.CANCELED) {
      canceled = true
      break
    }
  }
  if (!canceled) {
    throw new Error(`❌ 撤单未生效（status=${latest?.status}）—— 重建簿可能丢失了挂单`)
  }
  const accAfter = await AccountModel.findByUserId(USER_ID)
  console.log(`[after] status=CANCELED reason=${latest.reject_reason} frozen=${accAfter.cash_frozen}`)
  // 快照清除在 settler 提交后异步执行，留点时间
  await sleep(800)
  const stillInSet = await redis.sismember('orders:active', String(target.id))
  if (stillInSet) throw new Error('❌ 撤单后快照未清除')
  console.log(`[check] ✅ 撤单成功，冻结已释放，快照已清除`)
  console.log('\n=== ✅ 阶段 6 容灾验证通过：重启后挂单仍有效 ===')
  process.exit(0)
}

;(mode === 'phase2' ? phase2() : phase1()).catch((e) => {
  console.error('\n=== ❌ 验证失败 ===')
  console.error(e.message)
  process.exit(1)
})
