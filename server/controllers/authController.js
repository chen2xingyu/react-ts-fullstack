const bcrypt = require('bcryptjs')
const Joi = require('joi')
const pool = require('../config/db')
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, ACCESS_TOKEN_EXPIRES_IN } = require('../utils/jwt')

/**
 * 认证控制器 - 大厂标准 SSO 登录流程
 * 
 * 流程：
 * 1. 用户登录 → 返回 Access Token + Refresh Token
 * 2. 前端存储 Token，请求时携带 Access Token
 * 3. Access Token 过期 (30min) → 用 Refresh Token 换取新的 Access Token
 * 4. 退出登录 → 清除前端存储的 Token
 */

// 注册校验 Schema
const registerSchema = Joi.object({
  email: Joi.string().email().max(100).required().messages({
    'any.required': '邮箱不能为空',
    'string.email': '邮箱格式不正确',
  }),
  password: Joi.string().min(6).max(50).required().messages({
    'any.required': '密码不能为空',
    'string.min': '密码至少 6 位',
  }),
  name: Joi.string().min(1).max(50).required().messages({
    'any.required': '姓名不能为空',
  }),
})

// 登录校验 Schema
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'any.required': '邮箱不能为空',
  }),
  password: Joi.string().required().messages({
    'any.required': '密码不能为空',
  }),
})

// 刷新 Token 校验 Schema
const refreshSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': '缺少 Refresh Token',
  }),
})

class AuthController {
  /**
   * 用户注册
   * POST /api/auth/register
   */
  static async register(req, res) {
    const { error, value } = registerSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
      })
    }

    const { email, password, name } = value

    try {
      // 检查邮箱是否已注册
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      )

      if (existing.length > 0) {
        return res.status(409).json({
          code: 409,
          message: '该邮箱已注册',
        })
      }

      // 密码加密 (bcrypt 自动加盐)
      const saltRounds = 10
      const passwordHash = await bcrypt.hash(password, saltRounds)

      // 创建用户
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, passwordHash]
      )

      const userId = result.insertId

      // 生成 Token
      const payload = { sub: userId, email, name }
      const accessToken = generateAccessToken(payload)
      const refreshToken = generateRefreshToken(payload)

      // 返回用户信息 + Token
      const [users] = await pool.query(
        'SELECT id, name, email, phone, website, company, created_at FROM users WHERE id = ?',
        [userId]
      )

      return res.status(201).json({
        code: 0,
        message: '注册成功',
        data: {
          user: users[0],
          accessToken,
          refreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        },
      })
    } catch (err) {
      console.error('注册失败:', err)
      return res.status(500).json({
        code: 500,
        message: '注册失败，请稍后重试',
      })
    }
  }

  /**
   * 用户登录
   * POST /api/auth/login
   */
  static async login(req, res) {
    const { error, value } = loginSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
      })
    }

    const { email, password } = value

    try {
      // 查找用户（包含 password 字段）
      const [users] = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      )

      if (users.length === 0) {
        return res.status(401).json({
          code: 401,
          message: '邮箱或密码错误',
        })
      }

      const user = users[0]

      // 验证密码
      if (!user.password) {
        return res.status(401).json({
          code: 401,
          message: '该账号未设置密码，请通过注册流程创建账号',
        })
      }

      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({
          code: 401,
          message: '邮箱或密码错误',
        })
      }

      // 生成 Token
      const payload = { sub: user.id, email: user.email, name: user.name }
      const accessToken = generateAccessToken(payload)
      const refreshToken = generateRefreshToken(payload)

      // 返回用户信息 + Token（不返回 password）
      const { password: _, ...userInfo } = user

      return res.json({
        code: 0,
        message: '登录成功',
        data: {
          user: userInfo,
          accessToken,
          refreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        },
      })
    } catch (err) {
      console.error('登录失败:', err)
      return res.status(500).json({
        code: 500,
        message: '登录失败，请稍后重试',
      })
    }
  }

  /**
   * 刷新 Access Token
   * POST /api/auth/refresh
   */
  static async refresh(req, res) {
    const { error, value } = refreshSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
      })
    }

    const { refreshToken } = value

    try {
      // 验证 Refresh Token
      const decoded = verifyRefreshToken(refreshToken)

      // 查找用户
      const [users] = await pool.query(
        'SELECT id, name, email, phone, website, company FROM users WHERE id = ?',
        [decoded.sub]
      )

      if (users.length === 0) {
        return res.status(401).json({
          code: 401,
          message: '用户不存在',
        })
      }

      // 生成新的 Access Token
      const payload = { sub: decoded.sub, email: decoded.email, name: decoded.name }
      const newAccessToken = generateAccessToken(payload)

      return res.json({
        code: 0,
        message: '刷新成功',
        data: {
          accessToken: newAccessToken,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        },
      })
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          code: 401,
          message: 'Refresh Token 已过期，请重新登录',
        })
      }

      return res.status(401).json({
        code: 401,
        message: 'Refresh Token 无效',
      })
    }
  }

  /**
   * 获取当前用户信息（需要认证）
   * GET /api/auth/profile
   */
  static async profile(req, res) {
    try {
      const [users] = await pool.query(
        'SELECT id, name, email, phone, website, company, created_at FROM users WHERE id = ?',
        [req.user.id]
      )

      if (users.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在',
        })
      }

      return res.json({
        code: 0,
        message: 'success',
        data: users[0],
      })
    } catch (err) {
      console.error('获取用户信息失败:', err)
      return res.status(500).json({
        code: 500,
        message: '获取用户信息失败',
      })
    }
  }

  /**
   * 修改密码（需要认证）
   * PUT /api/auth/password
   */
  static async changePassword(req, res) {
    const schema = Joi.object({
      oldPassword: Joi.string().required().messages({
        'any.required': '当前密码不能为空',
      }),
      newPassword: Joi.string().min(6).max(50).required().messages({
        'any.required': '新密码不能为空',
        'string.min': '新密码至少 6 位',
      }),
    })

    const { error, value } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
      })
    }

    const { oldPassword, newPassword } = value

    try {
      // 查找用户密码
      const [users] = await pool.query(
        'SELECT password FROM users WHERE id = ?',
        [req.user.id]
      )

      if (users.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在',
        })
      }

      // 验证旧密码
      const isValid = await bcrypt.compare(oldPassword, users[0].password)
      if (!isValid) {
        return res.status(401).json({
          code: 401,
          message: '当前密码不正确',
        })
      }

      // 加密新密码并更新
      const passwordHash = await bcrypt.hash(newPassword, 10)
      await pool.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [passwordHash, req.user.id]
      )

      return res.json({
        code: 0,
        message: '密码修改成功',
      })
    } catch (err) {
      console.error('修改密码失败:', err)
      return res.status(500).json({
        code: 500,
        message: '修改密码失败',
      })
    }
  }
}

module.exports = AuthController
