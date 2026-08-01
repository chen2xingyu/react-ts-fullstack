const pool = require('../config/db')

/**
 * 成交记录模型
 */
class TradeModel {
  static async create(data) {
    const {
      trade_no, symbol, buy_order_id, sell_order_id,
      buyer_id, seller_id, side, price, quantity, amount, trade_time,
    } = data
    const [result] = await pool.query(
      `INSERT INTO trades (trade_no, symbol, buy_order_id, sell_order_id, buyer_id, seller_id, side, price, quantity, amount, trade_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [trade_no, symbol, buy_order_id, sell_order_id, buyer_id, seller_id, side, price, quantity, amount, trade_time]
    )
    return this.findById(result.insertId)
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM trades WHERE id = ?', [id])
    return rows[0] || null
  }

  static async findByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT * FROM trades WHERE buyer_id = ? OR seller_id = ? ORDER BY trade_time DESC LIMIT 200`,
      [userId, userId]
    )
    return rows
  }

  static async findByOrderId(orderId) {
    const [rows] = await pool.query(
      `SELECT * FROM trades WHERE buy_order_id = ? OR sell_order_id = ? ORDER BY trade_time ASC`,
      [orderId, orderId]
    )
    return rows
  }

  static async findBySymbol(symbol, limit = 100) {
    const [rows] = await pool.query(
      'SELECT * FROM trades WHERE symbol = ? ORDER BY trade_time DESC LIMIT ?',
      [symbol, limit]
    )
    return rows
  }
}

module.exports = TradeModel
