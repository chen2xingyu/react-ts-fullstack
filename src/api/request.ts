import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore, getAccessToken } from '@/store/auth'
import { refreshToken as apiRefreshToken } from './auth'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/**
 * 🎯 面试考点：axios.create 实例化与默认配置
 * axios.create() 创建独立的 Axios 实例（不污染全局默认 axios），便于一个项目
 * 对接多个后端/baseURL。baseURL 取 Vite 环境变量 import.meta.env（构建期静态替换），
 * timeout=10s 是全局兜底；单个请求可在 config.timeout 覆盖（见 python.ts 的 60s）。
 * TS→JS：import.meta.env 打包后被替换成真实字符串字面量，所有类型信息编译后擦除。
 *
 * 🎯 安全考点：withCredentials: true 是 Cookie 方案的前提
 * refreshToken 由后端 write 在 httpOnly Cookie 里，axios 默认【不】跨域携带 Cookie。
 * 只有显式 withCredentials: true，浏览器才会在 /auth/refresh、/auth/logout 带上它；
 * 同时后端 CORS 必须回 Access-Control-Allow-Credentials: true（见 server/app.js），
 * 否则浏览器直接拦掉响应。本地开发走 Vite 代理是同源请求，看似不配也行，
 * 但一旦前后端分域部署就会失效，所以这里统一开启。
 */
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 内部扩展的请求配置：_retry 标记已重试过，_isRefreshRequest 标记这是刷新令牌请求本身
type RetryableRequestConfig = AxiosRequestConfig & {
  _retry?: boolean
  _isRefreshRequest?: boolean
}

// 🎯 面试考点：并发刷新风暴（refresh token stampede）与等待队列
// 错误写法：每个 401 都各自 await refreshToken —— 页面同时挂着 10 个请求时，
//   会瞬间发出 10 次刷新请求；若后端 refresh_token 有「一次有效/轮换」语义，
//   后到的刷新全部 401，连锁登出。
// 正确写法（本文件）：isRefreshing 当互斥锁，第一个 401 负责刷新，其余请求
//   push 进 pendingRequests 排队；成功后用同一个 newToken 批量 resolve 队列、
//   重放原请求；失败则统一 reject 队列并跳登录。模块级变量天然是单例。
let isRefreshing = false
let pendingRequests: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

/**
 * 🎯 面试考点：axios 拦截器机制与执行顺序
 * use(onFulfilled, onRejected) 注册拦截器。请求拦截器在请求发出【前】执行，
 * 多个请求拦截器按「后注册先执行」（栈）；响应拦截器在响应【后】按「先注册先执行」（队列）。
 * 这里能直接改 config.headers，是因为拦截器本身就在 axios 的 Promise 调用链上，
 * return 的 config 会继续向下传给 adapter 真正发请求 —— 所以 Token 可集中注入，
 * 不必每个业务函数手写。onRejected 必须 return Promise.reject(error)，否则错误被吞。
 */
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
      // 🎯 安全考点：这里【不再】检查本地有没有 refreshToken。
      // refreshToken 存在 httpOnly Cookie 里，JS 根本读不到，判断「有没有」只能靠服务端：
      // 有 Cookie → refresh 成功；没有/过期/被吊销 → refresh 返回 401，走下面的登出分支。
      // 旧实现读 localStorage 再决定是否刷新，新方案下这个前置判断已失去意义。

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
        // 刷新 Token：无参，凭证由浏览器自动从 httpOnly Cookie 带上
        const data = await apiRefreshToken()
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

/**
 * 🎯 面试考点：泛型解包 —— 把 AxiosResponse 收拢成业务信封 ApiResponse
 * axios 原生返回 Promise<AxiosResponse<T>>，业务体在 .data 上；而响应拦截器又把
 * 整个 response 替换成了 ApiResponse 信封（见上方 `return res as any`）。这里用
 * 泛型 T 声明「业务 data 的形状」，外层 `as Promise<ApiResponse<T>>` 把边界层
 * 的类型断言集中在这一处，业务侧 `http.get<User>('/x')` 即拿到类型安全的信封。
 * TS→JS：<T> 泛型编译后完全擦除，运行时没有任何 T，纯编译期提示；
 *   as 断言同样零运行时代码。易错点：忘了 .then(r => r.data) 会把整个信封当业务数据用。
 */
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
