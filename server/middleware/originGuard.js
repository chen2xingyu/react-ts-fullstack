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
 * - 有 Origin/Referer → 取其 origin 与白名单比对，命中放行，否则 403；
 * - 开发环境额外放行 loopback 别名（localhost / 127.0.0.1 / ::1）：
 *   本机可用任意一种地址打开前端，若只认 CORS_ORIGIN 里那一个，
 *   换个写法访问就会让 /auth/refresh 403 → 静默刷新失败 → 刷新页面被踢回登录页。
 *   生产环境仍严格只认白名单，不做别名放宽。
 *
 * 注意：这层只挂在「依赖 Cookie 的端点」上（/auth/refresh、/auth/logout），
 * 业务接口靠 Authorization: Bearer 天然免疫 CSRF，无需重复校验。
 */

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

/** 把 Origin 或 Referer 统一解析成 origin（scheme://host[:port]）；解析失败返回 null */
function normalizeOrigin(value) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function originGuard(req, res, next) {
  const raw = req.headers.origin || req.headers.referer
  if (!raw) return next()

  const origin = normalizeOrigin(raw)
  if (!origin) {
    return res.status(403).json({ code: 403, message: '非法来源请求，已拒绝' })
  }

  const allowed = String(config.cors.origin || '')
    .split(',')
    .map((item) => normalizeOrigin(item.trim()))
    .filter(Boolean)

  if (allowed.includes(origin)) return next()

  // 开发环境：localhost / 127.0.0.1 / ::1 视为同一台本机，避免换地址访问就掉登录态
  if (config.env !== 'production' && LOOPBACK_HOSTNAMES.has(new URL(origin).hostname)) {
    return next()
  }

  return res.status(403).json({ code: 403, message: '非法来源请求，已拒绝' })
}

module.exports = originGuard
