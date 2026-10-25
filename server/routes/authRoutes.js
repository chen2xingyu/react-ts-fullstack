const express = require('express')
const AuthController = require('../controllers/authController')
const auth = require('../middleware/auth')
const originGuard = require('../middleware/originGuard')

const router = express.Router()

/**
 * 认证路由 - 大厂标准 SSO 接口设计
 *
 * 公开接口（无需 Token）：
 *   POST /api/auth/register  用户注册
 *   POST /api/auth/login    用户登录
 *   POST /api/auth/refresh  刷新 Access Token（依赖 httpOnly Cookie）
 *   POST /api/auth/logout   退出登录（吊销 refresh token + 清 Cookie）
 *
 * 认证接口（需要 Token）：
 *   GET  /api/auth/profile  获取当前用户信息
 *   PUT  /api/auth/password 修改密码
 *
 * 🎯 面试考点：只有「靠 Cookie 自动携带凭证」的端点才需要 Origin 校验（防 CSRF）。
 * register/login 依靠用户主动输入密码，refresh/logout 才是 CSRF 的攻击面：
 * 攻击者若能伪造 refresh 请求，就能让受害者浏览器不断签发新 access token（虽然读不到响应，
 * 但配合其他漏洞仍可造成危害），所以这两个端点挂 originGuard 做纵深防御。
 */

// 公开接口
router.post('/register', AuthController.register)
router.post('/login', AuthController.login)
router.post('/refresh', originGuard, AuthController.refresh)
router.post('/logout', originGuard, AuthController.logout)

// 认证接口（需要 JWT）
router.get('/profile', auth, AuthController.profile)
router.put('/password', auth, AuthController.changePassword)

module.exports = router
