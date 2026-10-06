import { Router } from 'express'
import { asyncHandler, errors } from '../../lib/errors.js'
import { pool } from '../../config/db.js'

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
