const { verifyAccessToken } = require('../utils/jwt')

/**
 * 认证中间件 - 大厂标准 JWT 验证
 * 从 Authorization Header 提取 Bearer Token 并验证
 */
const auth = (req, res, next) => {
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

    // 将解码后的用户信息挂载到 req 对象
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
    }

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
