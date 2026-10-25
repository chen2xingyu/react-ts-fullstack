const config = require('../config')

/**
 * 🎯 面试考点：Cookie 化之后，CSRF 防御的第一道闸——Origin / Referer 校验
 *
 * accessToken 放内存 + refreshToken 放 httpOnly Cookie 后，浏览器会自动携带 Cookie，
 * 跨站伪造请求就有了可乘之机。SameSite=Lax 已经挡住绝大多数跨站 POST，
 * 这里再加一层「来源白名单」做纵深防御（SameSite 在旧浏览器/特殊场景不完全可靠）。
 *
 * 判定策略：
 * - 没有 Origin（curl、移动端原生、部分同源 GET 导航）→ 无法界定来源，放行；
 * - 有 Origin → 必须命中白名单，否则 403。
 *
 * 注意：这层只挂在「依赖 Cookie 的端点」上（/auth/refresh、/auth/logout），
 * 业务接口靠 Authorization: Bearer 天然免疫 CSRF，无需重复校验。
 */
function originGuard(req, res, next) {
  const origin = req.headers.origin || req.headers.referer
  if (!origin) return next()

  const allowed = String(config.cors.origin || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // Origin 是完整源（scheme://host[:port]），Referer 是完整 URL，这里按「前缀/同源」宽松比对
  const isAllowed = allowed.some((item) => origin === item || origin.startsWith(`${item}/`))

  if (isAllowed) return next()

  return res.status(403).json({
    code: 403,
    message: '非法来源请求，已拒绝',
  })
}

module.exports = originGuard
