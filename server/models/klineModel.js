const pool = require('../config/db')

/**
 * K线历史模型
 */
class KlineModel {
  static async findBySymbol(symbol, period = '1m', limit = 500) {
    const [rows] = await pool.query(
      `SELECT * FROM klines WHERE symbol = ? AND period = ? ORDER BY ts DESC LIMIT ?`,
      [symbol, period, limit]
    )
    // 返回升序（旧→新），便于前端直接绘制
    return rows.reverse()
  }

  static async findLatest(symbol, period = '1m') {
    const [rows] = await pool.query(
      `SELECT * FROM klines WHERE symbol = ? AND period = ? ORDER BY ts DESC LIMIT 1`,
      [symbol, period]
    )
    return rows[0] || null
  }

  static async upsert(symbol, period, ts, open, high, low, close, volume, amount) {
    await pool.query(
      `INSERT INTO klines (symbol, period, ts, open, high, low, close, volume, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        high = GREATEST(high, VALUES(high)),
        low = LEAST(low, VALUES(low)),
        close = VALUES(close),
        volume = VALUES(volume),
        amount = VALUES(amount)`,
      [symbol, period, ts, open, high, low, close, volume, amount]
    )
    return this.findLatest(symbol, period)
  }
}

module.exports = KlineModel
