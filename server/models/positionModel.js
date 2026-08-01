const pool = require('../config/db')

class PositionModel {
  static async findByUserId(userId) {
    const [rows] = await pool.query(
      'SELECT * FROM positions WHERE user_id = ? AND quantity > 0 ORDER BY symbol ASC',
      [userId]
    )
    return rows
  }

  static async findByUserAndSymbol(userId, symbol) {
    const [rows] = await pool.query(
      'SELECT * FROM positions WHERE user_id = ? AND symbol = ?',
      [userId, symbol]
    )
    return rows[0] || null
  }

  static async upsert(userId, symbol, qtyDelta, availableDelta, frozenDelta, costDelta) {
    await pool.query(
      `INSERT INTO positions (user_id, symbol, quantity, available_quantity, frozen_quantity, total_cost, avg_cost)
       VALUES (?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
        quantity = quantity + ?,
        available_quantity = available_quantity + ?,
        frozen_quantity = frozen_quantity + ?,
        total_cost = total_cost + ?,
        avg_cost = CASE WHEN quantity > 0 THEN total_cost / quantity ELSE 0 END`,
      [userId, symbol, qtyDelta, availableDelta, frozenDelta, costDelta,
       qtyDelta, availableDelta, frozenDelta, costDelta]
    )
    return this.findByUserAndSymbol(userId, symbol)
  }
}

module.exports = PositionModel
