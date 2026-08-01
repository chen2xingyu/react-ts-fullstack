/**
 * 阶段 6 风控日志 HTTP 全链路验证
 *
 * 走真实 HTTP：登录 → 通过 API 触发风控拒绝 → 查 risk-logs → 查 summary
 * 验证 controller → orderService.rejectRisk → risk_logs → RiskLogModel 全链路。
 *
 * 运行：node server/scripts/verify-risk-logs-http.js
 */
const BASE = 'http://localhost:3000'
const SYMBOL = '000001' // 平安银行 prev_close=12.5 涨跌停 [11.25, 13.75]

async function main() {
  console.log('=== 阶段 6 风控日志 HTTP 全链路验证 ===')

  // 1. 登录（test@example.com 是 seed-users 新增账号，密码确定可用）
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'test123' }),
  })
  const loginJson = await loginRes.json()
  if (loginJson.code !== 0) throw new Error(`登录失败：${loginJson.message}`)
  const token = loginJson.data.accessToken
  const userId = loginJson.data.user.id
  console.log(`[login] ✅ 登录成功 user_id=${userId} (${loginJson.data.user.email})`)

  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // 触发前的日志数
  const beforeRes = await fetch(`${BASE}/api/trading/risk-logs`, { headers: auth })
  const beforeJson = await beforeRes.json()
  const beforeCnt = beforeJson.data.length
  console.log(`[before] 现有 risk_logs ${beforeCnt} 条`)

  // 2. 通过 API 触发风控拒绝
  console.log('\n[1] 通过 API 触发风控拒绝')

  // 2a. 涨跌停拒绝
  let r = await fetch(`${BASE}/api/trading/orders`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ symbol: SYMBOL, side: 1, order_type: 1, price: 99.99, quantity: 100 }),
  })
  let rj = await r.json()
  if (rj.code !== 1) throw new Error(`涨跌停拒绝预期 code=1，实际 code=${rj.code} msg=${rj.message}`)
  console.log(`  ✅ 涨跌停拒绝：${rj.message}`)

  // 2b. 手数拒绝
  r = await fetch(`${BASE}/api/trading/orders`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ symbol: SYMBOL, side: 1, order_type: 1, price: 12.0, quantity: 150 }),
  })
  rj = await r.json()
  if (rj.code !== 1) throw new Error(`手数拒绝预期 code=1，实际 code=${rj.code} msg=${rj.message}`)
  console.log(`  ✅ 手数拒绝：${rj.message}`)

  // 2c. 数量非法
  r = await fetch(`${BASE}/api/trading/orders`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ symbol: SYMBOL, side: 1, order_type: 1, price: 12.0, quantity: -5 }),
  })
  rj = await r.json()
  if (rj.code !== 1) throw new Error(`数量非法预期 code=1，实际 code=${rj.code} msg=${rj.message}`)
  console.log(`  ✅ 数量非法：${rj.message}`)

  // 2d. 撤不存在的单
  r = await fetch(`${BASE}/api/trading/orders/999999999/cancel`, {
    method: 'POST',
    headers: auth,
  })
  rj = await r.json()
  if (rj.code !== 1) throw new Error(`撤单不存在预期 code=1，实际 code=${rj.code} msg=${rj.message}`)
  console.log(`  ✅ 撤单不存在：${rj.message}`)

  // 3. 查 risk-logs
  console.log('\n[2] 查询 risk-logs')
  const logsRes = await fetch(`${BASE}/api/trading/risk-logs`, { headers: auth })
  const logsJson = await logsRes.json()
  if (logsJson.code !== 0) throw new Error(`查 risk-logs 失败：${logsJson.message}`)
  const afterCnt = logsJson.data.length
  const newCnt = afterCnt - beforeCnt
  console.log(`[after] 现有 ${afterCnt} 条，新增 ${newCnt} 条`)
  if (newCnt < 4) throw new Error(`❌ 新增日志不足 4 条，实际 ${newCnt}`)
  console.log('  本次新增：')
  for (const l of logsJson.data.slice(0, newCnt)) {
    console.log(
      `   ${l.created_at.replace('T', ' ').slice(5, 19)} | ${l.action} | ${l.symbol || '—'} | ${l.rule} | ${l.detail || ''}`
    )
  }

  // 校验覆盖的规则
  const newLogs = logsJson.data.slice(0, newCnt)
  const rules = newLogs.map((l) => `${l.action}:${l.rule}`)
  for (const er of ['order:price_limit', 'order:lot_size', 'order:bad_qty', 'cancel:not_found']) {
    if (!rules.includes(er)) throw new Error(`❌ 缺少预期日志：${er}`)
  }
  console.log(`[check] ✅ 4 类拒绝全部经 HTTP 留痕`)

  // 4. 查 summary
  console.log('\n[3] 查询 summary 聚合')
  const sumRes = await fetch(`${BASE}/api/trading/risk-logs/summary`, { headers: auth })
  const sumJson = await sumRes.json()
  if (sumJson.code !== 0) throw new Error(`查 summary 失败：${sumJson.message}`)
  for (const s of sumJson.data) {
    console.log(`   ${s.rule}: ${s.cnt}`)
  }

  // 5. 过滤查询 action=cancel
  console.log('\n[4] 过滤查询 action=cancel')
  const cancelRes = await fetch(`${BASE}/api/trading/risk-logs?action=cancel`, { headers: auth })
  const cancelJson = await cancelRes.json()
  if (cancelJson.code !== 0) throw new Error(`查 cancel 失败：${cancelJson.message}`)
  const allCancel = cancelJson.data.every((l) => l.action === 'cancel')
  if (!allCancel) throw new Error('❌ action=cancel 过滤失效')
  console.log(`[check] ✅ action=cancel 过滤正确，返回 ${cancelJson.data.length} 条`)

  console.log('\n=== ✅ 风控日志 HTTP 全链路验证通过 ===')
}

main().catch((e) => {
  console.error('\n=== ❌ 验证失败 ===')
  console.error(e.message)
  process.exit(1)
})
