const pool = require('../config/db')

class AccountModel {
  static async findByUserId(userId) {
    const [rows] = await pool.query('SELECT * FROM accounts WHERE user_id = ?', [userId])
    return rows[0] || null
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM accounts WHERE id = ?', [id])
    return rows[0] || null
  }

  static async create(userId, cash, feeRate) {
    const [result] = await pool.query(
      'INSERT INTO accounts (user_id, cash_total, cash_available, cash_frozen, fee_rate) VALUES (?, ?, ?, 0, ?)',
      [userId, cash, cash, feeRate]
    )
    return this.findById(result.insertId)
  }

  static async updateCash(userId, availableDelta, frozenDelta, totalDelta) {
    await pool.query(
      `UPDATE accounts SET
        cash_available = cash_available + ?,
        cash_frozen = cash_frozen + ?,
        cash_total = cash_total + ?
      WHERE user_id = ?`,
      [availableDelta, frozenDelta, totalDelta, userId]
    )
    return this.findByUserId(userId)
  }
}

module.exports = AccountModel
