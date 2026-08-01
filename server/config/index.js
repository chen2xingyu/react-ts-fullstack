require('dotenv').config()

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'react_ts_db',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'react-ts-fullstack-access-secret-key-2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'react-ts-fullstack-refresh-secret-key-2026',
    issuer: 'react-ts-fullstack',
  },
}
