import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore, getAccessToken, getRefreshToken } from '@/store/auth'
import { refreshToken as apiRefreshToken } from './auth'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 内部扩展的请求配置：_retry 标记已重试过，_isRefreshRequest 标记这是刷新令牌请求本身
type RetryableRequestConfig = AxiosRequestConfig & {
  _retry?: boolean
  _isRefreshRequest?: boolean
}

// 是否正在刷新 Token（避免并发刷新）
let isRefreshing = false
let pendingRequests: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

request.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  ((response: AxiosResponse) => {
    const res = response.data as ApiResponse
    if (res.code !== undefined && res.code !== 0) {
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    // 拦截器把 AxiosResponse 整体替换成业务信封体 ApiResponse，
    // 与 axios 内置返回类型冲突，属边界层类型豁免（调用方拿到的就是 ApiResponse）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return res as any
  }),
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig

    // 🎯 面试考点：刷新令牌的请求自身返回 401（refresh token 过期/无效）时，
    // 必须直接拒绝、走登出流程。若继续进入刷新分支，它会把自己挂进
    // pendingRequests 等待一个永远不会 resolve 的新令牌 —— 死锁，
    // 表现为所有请求永久 pending、页面一直“加载中”且不会跳转登录页。
    if (
      error.response?.status === 401 &&
      originalRequest._isRefreshRequest
    ) {
      return Promise.reject(error)
    }

    // 如果是 401 且不是重试过的请求，尝试刷新 Token
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshTokenValue = getRefreshToken()

      if (!refreshTokenValue) {
        // 没有 Refresh Token，直接跳转登录
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // 如果正在刷新 Token，把当前请求加入等待队列
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject })
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            return request(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // 刷新 Token
        const data = await apiRefreshToken(refreshTokenValue)
        const newAccessToken = data.accessToken

        // 更新 store 中的 Token
        useAuthStore.getState().setAccessToken(newAccessToken)

        // 处理等待中的请求
        pendingRequests.forEach(({ resolve }) => resolve(newAccessToken))
        pendingRequests = []

        // 重试原请求
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        }
        return request(originalRequest)
      } catch (refreshError) {
        // 刷新失败，清除认证信息并跳转
        useAuthStore.getState().logout()
        pendingRequests.forEach(({ reject }) => reject(refreshError))
        pendingRequests = []
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export const http = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return request.get(url, config) as Promise<ApiResponse<T>>
  },
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return request.post(url, data, config) as Promise<ApiResponse<T>>
  },
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return request.put(url, data, config) as Promise<ApiResponse<T>>
  },
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return request.delete(url, config) as Promise<ApiResponse<T>>
  },
}

export default request
