const config = require('../config')

/**
 * 生成 JWT Token
 * 大厂标准做法：Access Token (短时间) + Refresh Token (长时间)
 */

// Access Token: 30 分钟，用于日常请求
const ACCESS_TOKEN_EXPIRES_IN = '30m'
// Refresh Token: 7 天，用于刷新 Access Token
const REFRESH_TOKEN_EXPIRES_IN = '7d'

function generateAccessToken(payload) {
  const jwt = require('jsonwebtoken')
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: config.jwt.issuer,
  })
}

function generateRefreshToken(payload) {
  const jwt = require('jsonwebtoken')
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: config.jwt.issuer,
  })
}

function verifyAccessToken(token) {
  const jwt = require('jsonwebtoken')
  return jwt.verify(token, config.jwt.secret)
}

function verifyRefreshToken(token) {
  const jwt = require('jsonwebtoken')
  return jwt.verify(token, config.jwt.refreshSecret)
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  ACCESS_TOKEN_EXPIRES_IN,
}
