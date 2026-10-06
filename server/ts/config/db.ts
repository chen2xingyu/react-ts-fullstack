import mysql from 'mysql2/promise'

/**
 * v2 TS 侧 MySQL 连接池
 *
 * 与旧 server/config/db.js 是两个独立 Pool（连接数各算各的，演示项目可接受）；
 * 生产中同进程应只保留一个 Pool，避免连接数翻倍。
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'react_ts_db',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  dateStrings: false,
})
