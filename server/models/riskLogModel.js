const pool = require('../config/db')

/**
 * 风控日志模型（阶段 6）
 * 所有下单/撤单的风控拒绝均由此留痕，供前端"风控日志"视图查询审计。
 */
class RiskLogModel {
  /**
   * 按用户查询风控日志（倒序，分页）
   * @param {number} userId
   * @param {{ action?: string, rule?: string, page?: number, pageSize?: number }} opts
   */
  static async findByUserId(userId, { action, rule, page = 1, pageSize = 50 } = {}) {
    const offset = (page - 1) * pageSize
    let sql = 'SELECT * FROM risk_logs WHERE user_id = ?'
    const params = [userId]

    if (action) {
      sql += ' AND action = ?'
      params.push(action)
    }
    if (rule) {
      sql += ' AND rule = ?'
      params.push(rule)
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(pageSize, offset)

    const [rows] = await pool.query(sql, params)
    return rows
  }

  /**
   * 统计用户风控拒绝次数（按 rule 聚合，用于前端概览）
   */
  static async countByRule(userId) {
    const [rows] = await pool.query(
      `SELECT rule, COUNT(*) AS cnt
       FROM risk_logs
       WHERE user_id = ?
       GROUP BY rule
       ORDER BY cnt DESC`,
      [userId]
    )
    return rows
  }
}

module.exports = RiskLogModel
