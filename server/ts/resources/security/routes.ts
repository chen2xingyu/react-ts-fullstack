import { Router } from 'express'
import { asyncHandler, errors } from '../../lib/errors.js'
import { pool } from '../../config/db.js'

// 模拟用户会话（CSRF 演示用）
const csrfSessions = new Map<string, { balance: number }>()
function getCsrfSession(user: string) {
  if (!csrfSessions.has(user)) csrfSessions.set(user, { balance: 1000 })
  return csrfSessions.get(user)!
}

/**
 * 🎯 面试考点：SQL 注入对照实验
 *
 * 同一个「按作者查评论」接口，两种实现：
 * 1. /v2/security/safe — 参数化查询（Prepared Statement），注入无效
 * 2. /v2/security/unsafe — 字符串拼接，注入者直接读全库
 *
 * 面试追问：为什么参数化能防注入？
 * 答：数据库在编译阶段把 SQL 结构（? 占位符）和参数值分开处理，
 * 注入的内容被当成「字符串值」而不是「SQL 片段」解析。
 */

export const securityRouter = Router()

securityRouter.get(
  '/safe',
  asyncHandler(async (req, res) => {
    const author = String(req.query.author || '')
    if (!author) throw errors.badRequest('author 必填')
    // ✅ 参数化：? 占位符，数据库把 author 当纯文本处理
    const [rows] = await pool.query(
      'SELECT id, content, author, created_at FROM lab_comments WHERE author = ? LIMIT 10',
      [author],
    )
    res.json({ code: 0, message: 'ok', data: { safe: true, rows: rows as unknown[] } })
  }),
)

securityRouter.get(
  '/unsafe',
  asyncHandler(async (req, res) => {
    const author = String(req.query.author || '')
    if (!author) throw errors.badRequest('author 必填')
    // ❌ 字符串拼接：攻击者传入 `' OR '1'='1` 即可读出全表
    const sql = `SELECT id, content, author, created_at FROM lab_comments WHERE author = '${author}' LIMIT 10`
    const [rows] = await pool.query(sql)
    res.json({ code: 0, message: 'ok', data: { safe: false, rows: rows as unknown[] } })
  }),
)

/**
 * 🎯 面试考点：CSRF（跨站请求伪造）
 *
 * 攻击原理：用户已登录银行站点（Cookie 有效），访问恶意页面，
 * 恶意页面自动提交表单到银行转账接口，浏览器自动带 Cookie → 转账成功。
 *
 * 防御：服务端要求「自定义 Header」（X-CSRF-Token），
 * 恶意站点无法跨域设置自定义 Header（CORS 拦截）→ 伪造失败。
 *
 * 本演示：
 * - GET  /csrf/balance?user=xxx   查余额
 * - POST /csrf/transfer           转账（必须带 X-CSRF-Token header，值任意非空）
 * - POST /csrf/transfer/unsafe    无防护转账（直接成功，演示攻击）
 */
securityRouter.get('/csrf/balance', (req, res) => {
  const user = String(req.query.user || 'demo')
  const session = getCsrfSession(user)
  res.json({ code: 0, message: 'ok', data: { user, balance: session.balance } })
})

securityRouter.post('/csrf/transfer', (req, res) => {
  const user = String(req.body.user || 'demo')
  const amount = Number(req.body.amount || 0)
  const token = req.headers['x-csrf-token']

  // ✅ 防护：必须带自定义 Header，恶意站点无法伪造
  if (!token) {
    res.status(403).json({
      code: 403,
      message: '缺少 X-CSRF-Token，疑似 CSRF 攻击',
      data: { safe: true, blocked: true },
    })
    return
  }

  const session = getCsrfSession(user)
  session.balance -= amount
  res.json({ code: 0, message: '转账成功', data: { user, balance: session.balance, safe: true } })
})

securityRouter.post('/csrf/transfer/unsafe', (req, res) => {
  const user = String(req.body.user || 'demo')
  const amount = Number(req.body.amount || 0)
  // ❌ 无防护：只依赖 Cookie 鉴权，CSRF 可伪造
  const session = getCsrfSession(user)
  session.balance -= amount
  res.json({ code: 0, message: '转账成功（无防护）', data: { user, balance: session.balance, safe: false } })
})
