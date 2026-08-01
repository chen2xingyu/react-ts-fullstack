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
    return res
  }) as any,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

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
