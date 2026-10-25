const bcrypt = require('bcryptjs')
const Joi = require('joi')
const pool = require('../config/db')
const config = require('../config')
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_MAX_AGE_MS,
} = require('../utils/jwt')
const {
  revokeRefreshToken,
  isRefreshTokenRevoked,
  revokeAllForUser,
  isIssuedBeforeRevocation,
} = require('../utils/tokenStore')

/**
 * 🎯 面试考点：双 Token 的安全落位（本文件的核心设计）
 *
 * | 凭证          | 存放位置                                        | 有效期 | 抗 XSS        | 抗 CSRF              |
 * |---------------|-------------------------------------------------|--------|---------------|----------------------|
 * | accessToken   | 前端 Zustand 内存（不落 localStorage）           | 30min  | 无持久副本可偷 | Bearer 头天然免疫     |
 * | refreshToken  | httpOnly Cookie（Secure / SameSite=Lax / Path） | 7d     | JS 读不到      | SameSite + 轮换 + Origin |
 *
 * 流程：
 * 1. 登录/注册 → 响应体只回 accessToken（内存），refreshToken 通过 Set-Cookie 下发
 * 2. accessToken 过期 → POST /auth/refresh（浏览器自动带 Cookie）→ 轮换出新 refresh + 新 access
 * 3. 刷新时若发现「已轮换掉的旧 jti 又被使用」→ 判定 token 被盗 → 吊销该用户全部会话
 * 4. 退出登录 → /auth/logout 吊销 jti 并清除 Cookie；改密码 → 吊销全部 refresh（其他设备强制下线）
 */

const REFRESH_COOKIE_NAME = 'refresh_token'
// Cookie 只发给认证相关接口，缩小暴露面（业务接口拿不到它，也减少中途被截获的面）
const REFRESH_COOKIE_PATH = '/api/auth'

function refreshCookieOptions() {
  return {
    httpOnly: true, // 关键：document.cookie 读不到，XSS 偷不走
    secure: config.env === 'production', // 生产必须 HTTPS；本地 http 下 true 会导致 Cookie 不下发
    sameSite: 'lax', // 跨站 POST 不带 Cookie，挡住绝大多数 CSRF
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  }
}

function clearRefreshCookie(res) {
  // 清理时属性（path/secure/sameSite）必须与下发时一致，否则浏览器视为不同 Cookie 清不掉
  const { maxAge: _maxAge, ...options } = refreshCookieOptions()
  res.clearCookie(REFRESH_COOKIE_NAME, options)
}

/** 把 refreshToken 写进 httpOnly Cookie，返回给前端的仅剩 accessToken */
function issueSession(res, userPayload) {
  const accessToken = generateAccessToken(userPayload)
  const refreshToken = generateRefreshToken(userPayload)
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions())
  return accessToken
}

/** 从 Cookie 读取 refresh token（兼容 body：便于 curl / 老客户端，也方便教学演示） */
function readRefreshToken(req) {
  return (req.cookies && req.cookies[REFRESH_COOKIE_NAME]) || (req.body && req.body.refreshToken)
}


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

// 刷新 Token 校验 Schema（Cookie 为主通道，body 仅作兼容兜底，因此不再强制校验）

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

      // 生成 Token：refreshToken 只进 httpOnly Cookie，不进响应体
      const payload = { sub: userId, email, name }
      const accessToken = issueSession(res, payload)

      // 返回用户信息 + accessToken
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

      // 生成 Token：refreshToken 只进 httpOnly Cookie，不进响应体
      const payload = { sub: user.id, email: user.email, name: user.name }
      const accessToken = issueSession(res, payload)

      // 返回用户信息 + accessToken（不返回 password）
      const { password: _, ...userInfo } = user

      return res.json({
        code: 0,
        message: '登录成功',
        data: {
          user: userInfo,
          accessToken,
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
   * 刷新 Access Token（并轮换 Refresh Token）
   * POST /api/auth/refresh
   */
  static async refresh(req, res) {
    const refreshToken = readRefreshToken(req)

    if (!refreshToken) {
      return res.status(401).json({
        code: 401,
        message: '未登录或登录已过期',
      })
    }

    try {
      // 1) 验签 + 过期校验
      const decoded = verifyRefreshToken(refreshToken)
      const { sub, email, name, jti, iat, exp } = decoded

      if (!jti) {
        // 老版本 token 没有 jti，无法参与轮换/吊销，直接要求重新登录
        clearRefreshCookie(res)
        return res.status(401).json({
          code: 401,
          message: '登录凭证已失效，请重新登录',
        })
      }

      // 2) 🎯 面试考点：复用检测（refresh token rotation 的核心）
      // 正常客户端每次刷新都会「旧换新」，旧 jti 立即进黑名单。
      // 如果一个已被轮换掉的旧 token 又拿着来刷新，说明它被第三方复制走了
      // （真实用户和攻击者各持一份，谁先刷新谁把对方挤掉）。
      // 此时不能只拒绝这一次，而要把该用户全部会话吊销，逼双方重新登录。
      if (await isRefreshTokenRevoked(jti)) {
        await revokeAllForUser(sub)
        clearRefreshCookie(res)
        return res.status(401).json({
          code: 401,
          message: '检测到凭证异常复用，已终止所有会话，请重新登录',
        })
      }

      // 3) 用户级吊销水位（改密码 / 强制下线后签发的旧 token 全部作废）
      if (await isIssuedBeforeRevocation(sub, iat)) {
        clearRefreshCookie(res)
        return res.status(401).json({
          code: 401,
          message: '登录状态已失效，请重新登录',
        })
      }

      // 4) 确认用户仍然存在
      const [users] = await pool.query(
        'SELECT id, name, email, phone, website, company FROM users WHERE id = ?',
        [sub]
      )

      if (users.length === 0) {
        clearRefreshCookie(res)
        return res.status(401).json({
          code: 401,
          message: '用户不存在',
        })
      }

      // 5) 轮换：旧 refresh 立即作废（TTL 精确到它自己的 exp，过期自动清理），再下发新的
      const remainingTtl = Math.max(1, Number(exp) - Math.floor(Date.now() / 1000))
      await revokeRefreshToken(jti, remainingTtl)

      const payload = { sub, email, name }
      const newAccessToken = issueSession(res, payload)

      return res.json({
        code: 0,
        message: '刷新成功',
        data: {
          accessToken: newAccessToken,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        },
      })
    } catch (err) {
      clearRefreshCookie(res)

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
   * 退出登录：吊销当前 refresh token 并清除 Cookie
   * POST /api/auth/logout
   *
   * 注意：accessToken 是无状态的，服务端无法即时作废（要靠黑名单或短有效期兜底），
   * 所以这里只保证「不能再用 Cookie 换新 token」，前端同时清掉内存里的 accessToken。
   * 30 分钟内该 accessToken 理论上仍可用——这是双 token 方案的固有取舍，面试常被追问。
   */
  static async logout(req, res) {
    const refreshToken = readRefreshToken(req)

    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken)
        if (decoded.jti) {
          const remainingTtl = Math.max(1, Number(decoded.exp) - Math.floor(Date.now() / 1000))
          await revokeRefreshToken(decoded.jti, remainingTtl)
        }
      } catch {
        // token 已过期/被篡改也无所谓，清 Cookie 即可
      }
    }

    clearRefreshCookie(res)
    return res.json({
      code: 0,
      message: '已退出登录',
    })
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

      // 🎯 面试考点：改密码必须吊销该用户所有 refresh token（其他设备强制下线），
      // 否则被盗的 refresh token 还能继续换新 access token，「改密码自救」就失效了。
      await revokeAllForUser(req.user.id)
      clearRefreshCookie(res)

      return res.json({
        code: 0,
        message: '密码修改成功，请重新登录',
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
