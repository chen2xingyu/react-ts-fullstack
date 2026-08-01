const pool = require('../config/db')

class UserModel {
  static async findAll() {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, website, company, created_at FROM users ORDER BY id ASC',
    )
    return rows
  }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, website, company, created_at FROM users WHERE id = ?',
      [id],
    )
    return rows[0] || null
  }

  static async create(data) {
    const { name, email, phone, website, company } = data
    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, website, company) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, website, company],
    )
    return this.findById(result.insertId)
  }

  static async update(id, data) {
    const fields = []
    const values = []
    const allowedFields = ['name', 'email', 'phone', 'website', 'company']

    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push(data[key])
      }
    }

    if (fields.length === 0) {
      return this.findById(id)
    }

    values.push(id)
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
    return this.findById(id)
  }

  static async delete(id) {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id])
    return result.affectedRows > 0
  }
}

module.exports = UserModel
