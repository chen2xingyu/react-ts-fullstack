const pool = require('../config/db')

class OrderModel {
  static async create(data) {
    const { user_id, account_id, symbol, side, order_type, price, quantity, client_order_id } = data
    const [result] = await pool.query(
      `INSERT INTO orders (user_id, account_id, symbol, side, order_type, price, quantity, filled_quantity, avg_fill_price, status, client_order_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)`,
      [user_id, account_id, symbol, side, order_type, price, quantity, client_order_id]
    )
    return this.findById(result.insertId)
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id])
    return rows[0] || null
  }

  static async findByUserId(userId, { status, page = 1, pageSize = 50 } = {}) {
    const offset = (page - 1) * pageSize
    let sql = 'SELECT * FROM orders WHERE user_id = ?'
    const params = [userId]

    if (status !== undefined && status !== '') {
      sql += ' AND status = ?'
      params.push(status)
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(pageSize, offset)

    const [rows] = await pool.query(sql, params)
    return rows
  }

  static async findPendingBySymbol(symbol) {
    const [rows] = await pool.query(
      'SELECT * FROM orders WHERE symbol = ? AND status IN (0, 1) ORDER BY price DESC, created_at ASC',
      [symbol]
    )
    return rows
  }

  static async updateStatus(id, status, filledQty, avgPrice, rejectReason = null) {
    const fields = ['status = ?', 'filled_quantity = ?', 'avg_fill_price = ?']
    const params = [status, filledQty, avgPrice]
    if (rejectReason) {
      fields.push('reject_reason = ?')
      params.push(rejectReason)
    }
    params.push(id)
    await pool.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, params)
    return this.findById(id)
  }

  static async updateFilled(id, filledQtyDelta, avgPrice) {
    await pool.query(
      'UPDATE orders SET filled_quantity = filled_quantity + ?, avg_fill_price = ?, status = CASE WHEN filled_quantity >= quantity THEN 2 ELSE 1 END WHERE id = ?',
      [filledQtyDelta, avgPrice, id]
    )
    return this.findById(id)
  }
}

module.exports = OrderModel
