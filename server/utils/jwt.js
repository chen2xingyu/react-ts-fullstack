const config = require('../config')
const { randomUUID } = require('crypto')

/**
 * 生成 JWT Token
 * 大厂标准做法：Access Token (短时间，内存) + Refresh Token (长时间，httpOnly Cookie)
 */

// Access Token: 30 分钟，用于日常请求
const ACCESS_TOKEN_EXPIRES_IN = '30m'
// Refresh Token: 7 天，用于刷新 Access Token
const REFRESH_TOKEN_EXPIRES_IN = '7d'
// Cookie maxAge 用毫秒，和 refresh token 有效期保持一致
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function generateAccessToken(payload) {
  const jwt = require('jsonwebtoken')
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: config.jwt.issuer,
  })
}

/**
 * 🎯 面试考点：refreshToken 为什么要带 jti？
 * jti（JWT ID）是 token 的唯一标识，服务端靠它做「一次性使用 + 黑名单吊销」：
 * 每次刷新都签发新 jti 并把旧 jti 写进 Redis 黑名单（轮换），
 * 若旧 jti 再次出现 = 疑似被盗用 → 吊销该用户全部 token。
 */
function generateRefreshToken(payload) {
  const jwt = require('jsonwebtoken')
  return jwt.sign({ ...payload, jti: randomUUID() }, config.jwt.refreshSecret, {
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
  REFRESH_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_MAX_AGE_MS,
}
