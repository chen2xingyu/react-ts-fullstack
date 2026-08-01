const pool = require('../config/db')

/**
 * 行情快照模型
 */
class QuoteModel {
  static async findBySymbol(symbol) {
    const [rows] = await pool.query('SELECT * FROM quotes WHERE symbol = ?', [symbol])
    return rows[0] || null
  }

  static async findAll() {
    const [rows] = await pool.query('SELECT * FROM quotes ORDER BY symbol ASC')
    return rows
  }

  static async upsert(symbol, fields) {
    const { last_price, open, high, low, pre_close, volume, amount, ts } = fields
    await pool.query(
      `INSERT INTO quotes (symbol, last_price, open, high, low, pre_close, volume, amount, ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        last_price = VALUES(last_price),
        high = GREATEST(high, VALUES(high)),
        low = LEAST(low, VALUES(low)),
        volume = VALUES(volume),
        amount = VALUES(amount),
        ts = VALUES(ts)`,
      [symbol, last_price, open, high, low, pre_close, volume, amount, ts]
    )
    return this.findBySymbol(symbol)
  }
}

module.exports = QuoteModel
