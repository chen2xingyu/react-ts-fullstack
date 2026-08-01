const express = require('express')
const AuthController = require('../controllers/authController')
const auth = require('../middleware/auth')

const router = express.Router()

/**
 * 认证路由 - 大厂标准 SSO 接口设计
 * 
 * 公开接口（无需 Token）：
 *   POST /api/auth/register  用户注册
 *   POST /api/auth/login    用户登录
 *   POST /api/auth/refresh  刷新 Access Token
 * 
 * 认证接口（需要 Token）：
 *   GET  /api/auth/profile  获取当前用户信息
 *   PUT  /api/auth/password 修改密码
 */

// 公开接口
router.post('/register', AuthController.register)
router.post('/login', AuthController.login)
router.post('/refresh', AuthController.refresh)

// 认证接口（需要 JWT）
router.get('/profile', auth, AuthController.profile)
router.put('/password', auth, AuthController.changePassword)

module.exports = router
