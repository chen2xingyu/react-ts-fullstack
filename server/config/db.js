const mysql = require('mysql2/promise')
const config = require('./index')

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

pool.on('connection', (connection) => {
  console.log('数据库连接成功')
})

pool.on('error', (err) => {
  console.error('数据库连接错误:', err.message)
})

module.exports = pool
