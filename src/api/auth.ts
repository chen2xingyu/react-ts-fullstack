import request from './request'
import type { ApiResponse } from './request'
import type { AuthUser } from '@/store/auth'

export interface LoginResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
  expiresIn: string
}

export interface RegisterResponse extends LoginResponse {}

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
  const res = await request.post('/auth/refresh', {
    refreshToken,
  }) as unknown as ApiResponse<{ accessToken: string; expiresIn: string }>
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
