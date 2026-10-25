const { redis } = require('../config/redis')

/**
 * 🎯 面试考点：Refresh Token 的服务端吊销（黑名单 + 用户级吊销水位）
 *
 * 为什么光有 JWT 签名不够？
 * JWT 是「无状态」的——签名对、没过期，服务端就必须认。这意味着一旦 refreshToken 泄露
 * （XSS 偷 localStorage、日志泄漏、设备丢失），在 7 天有效期内攻击者可无限续命，
 * 修改密码也踢不掉。所以必须引入「有状态」的一小块：Redis 里记两样东西：
 *
 * 1. 单个 jti 黑名单：<prefix><jti> = 1，TTL 精确到该 token 的 exp。
 *    用途：refresh 轮换时把「旧 token」立即作废（一次性使用）；logout 时作废当前 jti。
 * 2. 用户级吊销水位 revoked-after:<sub> = 吊销时刻（秒级 unix）。
 *    用途：改密码 / 检测到 refresh token 复用（疑似被盗）时，一刀切掉该用户所有旧 token，
 *    判定规则：token.iat < 水位 = 已吊销。比逐个 jti 记黑名单更省内存，且能覆盖「所有设备」。
 *
 * Redis 不可用时采用 fail-open（放行 + 打日志）：
 * 学习项目优先保证可用性；生产环境对安全敏感场景应改为 fail-close（拒绝刷新），
 * 这一权衡本身就是很好的面试谈资。
 */

const REVOKED_JTI_PREFIX = 'auth:revoked-jti:'
const REVOKED_AFTER_PREFIX = 'auth:revoked-after:'
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60

const revokedKey = (jti) => `${REVOKED_JTI_PREFIX}${jti}`
const revokedAfterKey = (sub) => `${REVOKED_AFTER_PREFIX}${sub}`

/** 作废单个 refresh token（TTL 设为剩余寿命，过期自动清理，不浪费内存） */
async function revokeRefreshToken(jti, ttlSeconds = REFRESH_TTL_SECONDS) {
  if (!jti) return
  const ttl = Math.max(1, Math.floor(ttlSeconds))
  try {
    await redis.set(revokedKey(jti), '1', 'EX', ttl)
  } catch (err) {
    console.warn('⚠️ 吊销 refresh token 失败（Redis 可能未启动）:', err.message)
  }
}

/** 判断 jti 是否已被吊销（轮换复用检测的入口） */
async function isRefreshTokenRevoked(jti) {
  if (!jti) return false
  try {
    const hit = await redis.get(revokedKey(jti))
    return hit === '1'
  } catch (err) {
    console.warn('⚠️ 查询 refresh token 黑名单失败（Redis 可能未启动）:', err.message)
    return false
  }
}

/** 吊销某用户此前签发的全部 refresh token（改密、疑似盗用、强制下线） */
async function revokeAllForUser(sub) {
  if (sub === undefined || sub === null) return
  const nowSec = Math.floor(Date.now() / 1000)
  try {
    // value 存「吊销水位」，TTL 覆盖最长 refresh 寿命，之后自动失效
    await redis.set(revokedAfterKey(sub), String(nowSec), 'EX', REFRESH_TTL_SECONDS)
  } catch (err) {
    console.warn('⚠️ 用户级吊销失败（Redis 可能未启动）:', err.message)
  }
}

/** token 签发时间是否早于用户级吊销水位（iat 与 exp 一样由 jsonwebtoken 自动写入） */
async function isIssuedBeforeRevocation(sub, iat) {
  if (!sub || !iat) return false
  try {
    const value = await redis.get(revokedAfterKey(sub))
    if (!value) return false
    return Number(iat) < Number(value)
  } catch (err) {
    console.warn('⚠️ 查询用户级吊销水位失败（Redis 可能未启动）:', err.message)
    return false
  }
}

module.exports = {
  revokeRefreshToken,
  isRefreshTokenRevoked,
  revokeAllForUser,
  isIssuedBeforeRevocation,
  REFRESH_TTL_SECONDS,
}
