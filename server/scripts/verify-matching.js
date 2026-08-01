/**
 * 阶段 4 撮合闭环端到端验证
 *
 * 流程：播种卖方持仓 → A 限价买 100@15.50（挂簿）→ B 限价卖 100@15.50（撮合）
 *      → 轮询至两端均 FILLED → 校验资金/持仓/订单/成交一致性
 *
 * 期望（fee_rate=0.0003，成交价=maker价=15.50）：
 *   买方：cash_total -= 1550*1.0003 = 1550.4650；持仓 +100@15.50（total_cost=1550.0000）
 *   卖方：cash_total += 1550*0.9997 = 1549.5350；持仓 1000→900（均价 15.0 不变，total_cost 15000→13500）
 *   成交：1 笔，price=15.50，qty=100，buyer=A，seller=B
 *   手续费净流失：1550.4650 - 1549.5350 = 0.9300（买卖各 0.4650）
 */
const pool = require('../config/db')
const AccountModel = require('../models/accountModel')
const PositionModel = require('../models/positionModel')
const OrderModel = require('../models/orderModel')
const TradeModel = require('../models/tradeModel')
const orderService = require('../services/orderService')

const BUYER = 1
const SELLER = 2
const SYMBOL = '601899'
const PRICE = 15.5
const QTY = 100
const SEED_QTY = 1000
const SEED_AVG = 15.0

const round = (v, d = 4) => Number(Number(v).toFixed(d))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchOrder(id) {
  return OrderModel.findById(id)
}

async function main() {
  console.log('=== 阶段4 撮合闭环验证开始 ===')

  // 0. 播种卖方持仓（清理旧测试数据后重置为已知状态）
  await pool.query(
    `INSERT INTO positions (user_id, symbol, quantity, available_quantity, frozen_quantity, total_cost, avg_cost)
     VALUES (?, ?, ?, ?, 0, ?, ?)
     ON DUPLICATE KEY UPDATE
       quantity = ?, available_quantity = ?, frozen_quantity = 0, total_cost = ?, avg_cost = ?`,
    [SELLER, SYMBOL, SEED_QTY, SEED_QTY, SEED_QTY * SEED_AVG, SEED_AVG,
     SEED_QTY, SEED_QTY, SEED_QTY * SEED_AVG, SEED_AVG]
  )
  console.log(`[seed] 卖方用户${SELLER} 持仓 ${SYMBOL} ${SEED_QTY}@${SEED_AVG}`)

  // 1. 记录 before
  const buyerAccBefore = await AccountModel.findByUserId(BUYER)
  const sellerAccBefore = await AccountModel.findByUserId(SELLER)
  const sellerPosBefore = await PositionModel.findByUserAndSymbol(SELLER, SYMBOL)
  console.log(`[before] 买方资金 available=${buyerAccBefore.cash_available} frozen=${buyerAccBefore.cash_frozen}`)
  console.log(`[before] 卖方资金 available=${sellerAccBefore.cash_available} 持仓=${sellerPosBefore.quantity}@${sellerPosBefore.avg_cost}`)

  // 2. A 限价买 100@15.50（挂簿等待）
  const buyOrder = await orderService.placeOrder(BUYER, buyerAccBefore, {
    symbol: SYMBOL, side: 1, order_type: 1, price: PRICE, quantity: QTY,
    client_order_id: `e2e-buy-${Date.now()}`,
  })
  console.log(`[order] 买方委托 #${buyOrder.id} 买${QTY}@${PRICE}`)

  // 3. B 限价卖 100@15.50（应撮合买方挂单）
  const sellOrder = await orderService.placeOrder(SELLER, sellerAccBefore, {
    symbol: SYMBOL, side: 2, order_type: 1, price: PRICE, quantity: QTY,
    client_order_id: `e2e-sell-${Date.now()}`,
  })
  console.log(`[order] 卖方委托 #${sellOrder.id} 卖${QTY}@${PRICE}`)

  // 4. 轮询至两端 FILLED
  let ok = false
  for (let i = 0; i < 20; i++) {
    await sleep(500)
    const b = await fetchOrder(buyOrder.id)
    const s = await fetchOrder(sellOrder.id)
    if (b && s && Number(b.status) === 2 && Number(s.status) === 2) {
      ok = true
      console.log(`[poll] 第${i + 1}次：买#${b.id} filled=${b.filled_quantity} avg=${b.avg_fill_price} | 卖#${s.id} filled=${s.filled_quantity} avg=${s.avg_fill_price}`)
      break
    }
  }
  if (!ok) {
    const b = await fetchOrder(buyOrder.id)
    const s = await fetchOrder(sellOrder.id)
    console.error(`[FAIL] 撮合未完成 买status=${b?.status} 卖status=${s?.status}`)
    process.exit(1)
  }

  // 5. 记录 after
  const buyerAccAfter = await AccountModel.findByUserId(BUYER)
  const sellerAccAfter = await AccountModel.findByUserId(SELLER)
  const buyerPosAfter = await PositionModel.findByUserAndSymbol(BUYER, SYMBOL)
  const sellerPosAfter = await PositionModel.findByUserAndSymbol(SELLER, SYMBOL)
  const trades = await TradeModel.findByUserId(BUYER)

  // 6. 断言
  const feeRate = Number(buyerAccBefore.fee_rate)
  const actualCost = round(PRICE * QTY * (1 + feeRate))
  const actualProceeds = round(PRICE * QTY * (1 - feeRate))
  const buyerCashDelta = round(Number(buyerAccAfter.cash_total) - Number(buyerAccBefore.cash_total))
  const sellerCashDelta = round(Number(sellerAccAfter.cash_total) - Number(sellerAccBefore.cash_total))
  const buyerFrozen = Number(buyerAccAfter.cash_frozen)
  const sellerFrozen = Number(sellerAccAfter.cash_frozen)

  const asserts = []

  // 成交记录
  const myTrades = trades.filter((t) => t.symbol === SYMBOL && Number(t.quantity) === QTY)
  asserts.push(['成交记录数=1', myTrades.length === 1, `实际 ${myTrades.length}`])
  if (myTrades[0]) {
    asserts.push(['成交价=15.50', Number(myTrades[0].price) === PRICE, `实际 ${myTrades[0].price}`])
    asserts.push(['买方=用户1', Number(myTrades[0].buyer_id) === BUYER, `实际 ${myTrades[0].buyer_id}`])
    asserts.push(['卖方=用户2', Number(myTrades[0].seller_id) === SELLER, `实际 ${myTrades[0].seller_id}`])
  }

  // 买方资金：cash_total -= actualCost，frozen 归零
  asserts.push([`买方资金变动=${actualCost}`, buyerCashDelta === -actualCost, `实际 ${buyerCashDelta}`])
  asserts.push(['买方冻结归零', buyerFrozen === 0, `实际 ${buyerFrozen}`])

  // 卖方资金：cash_total += actualProceeds，frozen 归零
  asserts.push([`卖方资金变动=${actualProceeds}`, sellerCashDelta === actualProceeds, `实际 ${sellerCashDelta}`])
  asserts.push(['卖方冻结归零', sellerFrozen === 0, `实际 ${sellerFrozen}`])

  // 买方持仓：100@15.50，total_cost=1550
  asserts.push(['买方持仓=100', Number(buyerPosAfter.quantity) === QTY, `实际 ${buyerPosAfter?.quantity}`])
  asserts.push(['买方均价=15.50', round(Number(buyerPosAfter.avg_cost)) === PRICE, `实际 ${buyerPosAfter?.avg_cost}`])
  asserts.push(['买方总成本=1550.0000', round(Number(buyerPosAfter.total_cost)) === round(PRICE * QTY), `实际 ${buyerPosAfter?.total_cost}`])

  // 卖方持仓：900@15.0，total_cost=13500
  asserts.push(['卖方持仓=900', Number(sellerPosAfter.quantity) === SEED_QTY - QTY, `实际 ${sellerPosAfter?.quantity}`])
  asserts.push(['卖方均价=15.0(不变)', round(Number(sellerPosAfter.avg_cost)) === SEED_AVG, `实际 ${sellerPosAfter?.avg_cost}`])
  asserts.push(['卖方总成本=13500', round(Number(sellerPosAfter.total_cost)) === round(SEED_AVG * (SEED_QTY - QTY)), `实际 ${sellerPosAfter?.total_cost}`])

  // 资金守恒：买卖双方 cash_total 变动之和 = -手续费(0.93)
  const feeCaptured = round(buyerCashDelta + sellerCashDelta)
  asserts.push(['手续费净流失=0.9300', feeCaptured === round(-(actualCost - actualProceeds)), `实际 ${feeCaptured}`])

  console.log('\n=== 验证结果 ===')
  let pass = 0
  for (const [name, ok2, detail] of asserts) {
    console.log(`${ok2 ? '✅' : '❌'} ${name} ${ok2 ? '' : `(${detail})`}`)
    if (ok2) pass++
  }
  console.log(`\n${pass}/${asserts.length} 项通过`)

  if (pass === asserts.length) {
    console.log('\n🎉 阶段4 撮合闭环端到端验证全部通过！')
    process.exit(0)
  } else {
    console.log('\n💥 存在失败项，请检查')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('验证脚本异常:', e)
  process.exit(1)
})
