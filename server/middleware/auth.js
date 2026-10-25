const { verifyAccessToken } = require('../utils/jwt')
const { isAccessTokenRejected } = require('../utils/tokenStore')

/**
 * 认证中间件 - 大厂标准 JWT 验证
 * 从 Authorization Header 提取 Bearer Token 并验证
 *
 * 🎯 面试考点：JWT 本来是「无状态」的，怎么做到退出登录立即失效？
 * 验签只证明「这个 token 是我签的、没过期」，不证明「它仍然有效」。
 * 所以在验签之后再加一步有状态校验（Redis 一次 mget）：
 *   - jti 黑名单：退出登录时把当前 access token 的 jti 写进去
 *   - 用户级水位：改密码 / 检测到 refresh 复用 → 该用户此前签发的 token 全部失效
 * 这一步是「即时吊销」的代价，也是无状态与可控性之间的经典取舍。
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证 Token',
      })
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        code: 401,
        message: 'Token 格式无效',
      })
    }

    // 验证 Token
    const decoded = verifyAccessToken(token)

    // 有状态校验：token 是否已被主动吊销（退出登录 / 改密码 / 疑似盗用）
    if (await isAccessTokenRejected(decoded.jti, decoded.sub, decoded.iat)) {
      return res.status(401).json({
        code: 401,
        message: '登录状态已失效，请重新登录',
      })
    }

    // 将解码后的用户信息挂载到 req 对象
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
    }
    // 供 logout 精确吊销「当前这一个」access token
    req.auth = { jti: decoded.jti, exp: decoded.exp }

    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: 'Token 已过期，请重新登录',
      })
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: 401,
        message: 'Token 无效',
      })
    }

    return res.status(500).json({
      code: 500,
      message: '认证服务异常',
    })
  }
}

module.exports = auth
