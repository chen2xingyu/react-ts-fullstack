import request from './request'
import type { ApiResponse } from './request'
import type { AuthUser } from '@/store/auth'
import type { AxiosRequestConfig } from 'axios'

/**
 * 🎯 面试考点：登录态接口语义 + 「双重断言」为什么需要
 * 登录/注册成功后后端一次性下发 accessToken（短有效期，放 Authorization 头）+
 * refreshToken（长有效期，专门用于换新 accessToken）。之后所有业务请求只带
 * accessToken，过期才走 /auth/refresh。
 *
 * 下面 `as unknown as ApiResponse<LoginResponse>`：响应拦截器已把 AxiosResponse
 * 替换成信封体，但 request.post 的静态返回类型仍是 AxiosResponse，二者结构不重叠，
 * TS 不允许直接 `as ApiResponse`（报 "neither sufficiently overlaps"），必须先
 * as unknown 中转一次。TS→JS：as/unknown 断言零运行时代码，只在编译期生效。
 */
export interface LoginResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
  expiresIn: string
}

// 注册与登录返回结构一致，直接 type 别名复用，避免重复维护两份类型
export type RegisterResponse = LoginResponse

// 用户登录
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await request.post('/auth/login', {
    email,
    password,
  }) as unknown as ApiResponse<LoginResponse>
  return res.data
}

// 用户注册
export async function register(
  email: string,
  password: string,
  name: string
): Promise<RegisterResponse> {
  const res = await request.post('/auth/register', {
    email,
    password,
    name,
  }) as unknown as ApiResponse<RegisterResponse>
  return res.data
}

// 刷新 Access Token
export async function refreshToken(refreshToken: string): Promise<{
  accessToken: string
  expiresIn: string
}> {
  const res = await request.post(
    '/auth/refresh',
    { refreshToken },
    // 标记“这是刷新令牌请求”，防止其 401 再次触发刷新流程造成死锁
    { _isRefreshRequest: true } as AxiosRequestConfig
  ) as unknown as ApiResponse<{ accessToken: string; expiresIn: string }>
  return res.data
}

// 获取当前用户信息
export async function getProfile(): Promise<AuthUser> {
  const res = await request.get('/auth/profile') as unknown as ApiResponse<AuthUser>
  return res.data
}

// 修改密码
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  await request.put('/auth/password', {
    oldPassword,
    newPassword,
  })
}
