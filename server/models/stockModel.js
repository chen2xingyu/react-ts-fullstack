const pool = require('../config/db')

class StockModel {
  static async findAll() {
    const [rows] = await pool.query(
      'SELECT * FROM stocks WHERE status = 1 ORDER BY symbol ASC'
    )
    return rows
  }

  static async findBySymbol(symbol) {
    const [rows] = await pool.query('SELECT * FROM stocks WHERE symbol = ?', [symbol])
    return rows[0] || null
  }
}

module.exports = StockModel
