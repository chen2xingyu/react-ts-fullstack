/**
 * 阶段 6 风控日志端到端验证
 *
 * 直接调用 service（绕过 HTTP/鉴权），覆盖：
 *   1. 多种下单风控拒绝（price_limit / lot_size / bad_qty / no_cash）→ action=order
 *   2. 撤单风控拒绝（bad_status）→ action=cancel
 *   3. 查询 risk_logs：记录数、rule、action、detail 字段正确
 *   4. 查询 summary 聚合统计正确
 *
 * 运行：node server/scripts/verify-risk-logs.js
 */
const pool = require('../config/db')
const AccountModel = require('../models/accountModel')
const OrderModel = require('../models/orderModel')
const RiskLogModel = require('../models/riskLogModel')
const orderService = require('../services/orderService')

const USER_ID = 1
const SYMBOL = '000001' // 平安银行 prev_close=12.5 涨跌停 10% → [11.25, 13.75]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function expectReject(label, fn, expectedRule) {
  try {
    await fn()
    throw new Error(`${label}：预期被风控拒绝，但实际成功`)
  } catch (e) {
    if (!e.isRisk) throw e
    if (expectedRule && e.rule !== expectedRule) {
      throw new Error(`${label}：rule 不符，预期 ${expectedRule} 实际 ${e.rule}`)
    }
    console.log(`  ✅ ${label} → rule=${e.rule} (${e.message})`)
  }
}

async function main() {
  console.log('=== 阶段 6 风控日志验证开始 ===')

  // 记录起始日志条数
  const before = await RiskLogModel.findByUserId(USER_ID, { pageSize: 1000 })
  const beforeCnt = before.length
  console.log(`[before] 用户 ${USER_ID} 现有 risk_logs ${beforeCnt} 条`)

  const account = await AccountModel.findByUserId(USER_ID)
  if (!account) throw new Error('账户不存在，请先 seed-users')

  console.log('\n[1] 触发下单风控拒绝（action=order）')

  // 1a. 涨跌停拒绝
  await expectReject('涨跌停拒绝', () => orderService.placeOrder(USER_ID, account, {
    symbol: SYMBOL, side: 1, order_type: 1, price: 99.99, quantity: 100,
  }), 'price_limit')

  // 1b. 手数拒绝
  await expectReject('手数拒绝', () => orderService.placeOrder(USER_ID, account, {
    symbol: SYMBOL, side: 1, order_type: 1, price: 12.0, quantity: 150,
  }), 'lot_size')

  // 1c. 数量非法
  await expectReject('数量非法', () => orderService.placeOrder(USER_ID, account, {
    symbol: SYMBOL, side: 1, order_type: 1, price: 12.0, quantity: -5,
  }), 'bad_qty')

  // 1d. 资金不足（买入远超可用资金的巨单）
  await expectReject('资金不足', () => orderService.placeOrder(USER_ID, account, {
    symbol: SYMBOL, side: 1, order_type: 1, price: 13.0, quantity: 100000000,
  }), 'no_cash')

  // 1e. 幂等重复提交（用同一 client_order_id 连下两笔，第二笔被拒）
  const cid = `risk-verify-${Date.now()}`
  await orderService.placeOrder(USER_ID, account, {
    symbol: SYMBOL, side: 1, order_type: 1, price: 11.3, quantity: 100,
    client_order_id: cid,
  })
  await expectReject('重复提交', () => orderService.placeOrder(USER_ID, account, {
    symbol: SYMBOL, side: 1, order_type: 1, price: 11.3, quantity: 100,
    client_order_id: cid,
  }), 'duplicate')

  console.log('\n[2] 触发撤单风控拒绝（action=cancel）')

  // 2a. 撤不存在的单
  await expectReject('撤单不存在', () => orderService.cancelOrder(USER_ID, 999999999), 'not_found')

  // 2b. 撤已成交/已撤的单（bad_status）：先撤掉上面那笔，再撤一次
  // 找到刚下的那笔
  const [justOrder] = await pool.query(
    'SELECT id FROM orders WHERE user_id = ? AND client_order_id = ? LIMIT 1',
    [USER_ID, cid]
  )
  if (justOrder.length === 0) throw new Error('找不到刚下的测试单')
  const oid = justOrder[0].id
  // 撤一次（合法）
  try {
    await orderService.cancelOrder(USER_ID, oid)
    console.log('  ℹ️  先合法撤单一次（等待引擎处理）')
  } catch (e) {
    if (!e.isRisk) throw e
  }
  // 轮询至 CANCELED
  let canceled = false
  for (let i = 0; i < 25; i++) {
    await sleep(400)
    const o = await OrderModel.findById(oid)
    if (o && Number(o.status) === 3) { canceled = true; break }
  }
  if (!canceled) throw new Error('测试单未变为 CANCELED，无法验证 bad_status')
  // 再撤 → bad_status
  await expectReject('撤已终态单', () => orderService.cancelOrder(USER_ID, oid), 'bad_status')

  console.log('\n[3] 校验 risk_logs 记录')

  // 等待所有 logRisk 写入完成（异步已 await，但保险起见）
  await sleep(200)
  const after = await RiskLogModel.findByUserId(USER_ID, { pageSize: 1000 })
  const afterCnt = after.length
  console.log(`[after]  现有 risk_logs ${afterCnt} 条，新增 ${afterCnt - beforeCnt} 条`)

  const newLogs = after.slice(0, afterCnt - beforeCnt)
  const rules = newLogs.map((l) => `${l.action}:${l.rule}`)
  console.log(`[logs] 新增记录：${rules.join(', ')}`)

  // 校验本次新增覆盖的规则
  const expectedRules = [
    'order:price_limit',
    'order:lot_size',
    'order:bad_qty',
    'order:no_cash',
    'order:duplicate',
    'cancel:not_found',
    'cancel:bad_status',
  ]
  for (const er of expectedRules) {
    if (!rules.includes(er)) {
      throw new Error(`❌ 缺少预期日志：${er}`)
    }
  }
  console.log(`[check] ✅ 7 类拒绝全部留痕`)

  // 校验 action=cancel 的日志确实为 cancel
  const cancelLogs = newLogs.filter((l) => l.action === 'cancel')
  if (cancelLogs.length < 2) {
    throw new Error(`❌ cancel 日志不足，预期≥2 实际 ${cancelLogs.length}`)
  }
  console.log(`[check] ✅ cancel 日志 ${cancelLogs.length} 条 action 字段正确`)

  // 校验 detail 字段非空（no_cash / price_limit 有详细明细）
  const noCashLog = newLogs.find((l) => l.rule === 'no_cash')
  if (!noCashLog || !noCashLog.detail) {
    throw new Error('❌ no_cash 日志缺少 detail')
  }
  console.log(`[check] ✅ no_cash detail：${noCashLog.detail}`)

  console.log('\n[4] 校验 summary 聚合统计')
  const summary = await RiskLogModel.countByRule(USER_ID)
  console.log(`[summary] 按 rule 聚合：`)
  for (const s of summary) {
    console.log(`   ${s.rule}: ${s.cnt}`)
  }
  // no_cash 至少 1 条
  const noCashStat = summary.find((s) => s.rule === 'no_cash')
  if (!noCashStat || Number(noCashStat.cnt) < 1) {
    throw new Error('❌ summary 缺少 no_cash 统计')
  }
  console.log(`[check] ✅ summary 聚合正确`)

  console.log('\n=== ✅ 阶段 6 风控日志验证全部通过 ===')
  process.exit(0)
}

main().catch((e) => {
  console.error('\n=== ❌ 验证失败 ===')
  console.error(e.message)
  process.exit(1)
})
