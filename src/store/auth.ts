/**
 * 🎯 面试考点：Zustand —— 为什么它不需要 Provider
 * import { create } from 'zustand'
 * Zustand 的 store 创建在模块作用域（闭包），组件通过 useXxxStore hook 订阅，
 * 状态不挂在 React 树上，因此 <Provider> 不是必需的（对比 Redux 必须包一层 Provider）。
 * 两个高频追问：
 *   1) 如何在组件外（如 axios 拦截器）读状态？—— useAuthStore.getState()，
 *      本文件正是在 request.ts 里这样取/写 token 的。setState 同理用 .setState()。
 *   2) 如何避免多余渲染？—— 用 selector 精确订阅：useAuthStore(s => s.accessToken)
 *      只在 accessToken 变化时重渲染；不传 selector 则整个 store 变了就重渲染。
 * TS→JS：泛型 <AuthState & AuthActions> 编译后擦除，运行时就是普通 create(fn)。
 */
import { create } from 'zustand'

// ============ 类型定义 ============
// 把「状态字段」与「action 函数」拆成两个 interface 再交叉，是 zustand/TS 的推荐写法：
//   状态与行为分层，action 签名集中可见，也便于单测只 mock actions。
export interface AuthUser {
  id: number
  name: string
  email: string
  phone?: string
  website?: string
  company?: string
  created_at?: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  setAccessToken: (token: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// ============ Token 存取工具 ============
const TOKEN_KEY = 'react_ts_auth_tokens'
const USER_KEY = 'react_ts_auth_user'

// localStorage 在隐私模式 / 存储被禁用 / 配额满时会抛异常，
// 这里有意吞掉：认证退化为内存态（刷新后丢失），不影响主流程。

function saveTokens(accessToken: string, refreshToken: string) {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken, refreshToken }))
  } catch {
    /* 存储不可用：降级为内存态 */
  }
}

function loadTokens(): { accessToken: string | null; refreshToken: string | null } {
  try {
    const data = localStorage.getItem(TOKEN_KEY)
    if (data) return JSON.parse(data)
  } catch {
    /* 数据损坏或存储不可用：视为未登录 */
  }
  return { accessToken: null, refreshToken: null }
}

function saveUser(user: AuthUser) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    /* 存储不可用：降级为内存态 */
  }
}

function loadUser(): AuthUser | null {
  try {
    const data = localStorage.getItem(USER_KEY)
    if (data) return JSON.parse(data)
  } catch {
    /* 数据损坏或存储不可用：视为未登录 */
  }
  return null
}

function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    /* 存储不可用：无需处理 */
  }
}

// ============ 初始化 ============
const savedTokens = loadTokens()
const savedUser = loadUser()

// ============ Zustand Store ============
// 🎯 面试考点：create 的 set 是「浅合并」，不是 Redux 那样整包替换
// (set) => 接收一个 set 函数；set({ accessToken }) 只会浅合并这一个字段，
//   其余 state（user/isAuthenticated…）原样保留 —— 这与 React.setState 的合并语义一致。
// 易错点：因此不需要每次都展开旧 state。对比 Redux reducer 必须 return 整个新 state。
// 这里模块加载时先 loadTokens/loadUser 读 localStorage 做初始化，刷新页面后登录态不丢。
export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: savedUser,
  accessToken: savedTokens.accessToken,
  refreshToken: savedTokens.refreshToken,
  isAuthenticated: !!savedTokens.accessToken,
  isLoading: false,
  error: null,

  setAuth: (user, accessToken, refreshToken) => {
    saveTokens(accessToken, refreshToken)
    saveUser(user)
    set({ user, accessToken, refreshToken, isAuthenticated: true, error: null })
  },

  setUser: (user) => {
    saveUser(user)
    set({ user })
  },

  setAccessToken: (token) => {
    const { refreshToken } = loadTokens()
    saveTokens(token, refreshToken || '')
    set({ accessToken: token })
  },

  logout: () => {
    clearAuth()
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    })
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))

// ============ 导出工具函数 ============
// 🎯 面试考点：这两个函数刻意【不是 hook】—— 它们在 axios 拦截器（非组件、无 React 渲染
// 上下文）里被调用，所以直接读 localStorage 而不是 useAuthStore()。拦截器需要同步拿到
// token 塞进请求头，用 getState() 反而绕。常被追问：token 到底存内存还是 localStorage？
//   答：localStorage 刷新不丢但易受 XSS；httpOnly Cookie 防 XSS 但有 CSRF —— 是安全权衡。
export function getAccessToken(): string | null {
  return loadTokens().accessToken
}

export function getRefreshToken(): string | null {
  return loadTokens().refreshToken
}

// 🎯 面试考点：JWT 结构与过期判断
// JWT = header.payload.signature 三段用 '.' 连接；payload 是 base64url 编码的 JSON，
// 内含 exp（过期时间，秒级 Unix 时间戳）。atob 解码第二段，乘 1000 转毫秒和 Date.now() 比。
// 注意：前端【不要】用它做安全校验，JWT 可被解码、签名校验只在服务端有意义；
//   这里仅用于提前判断要不要主动刷新。catch 返回 true：解不出就按「已过期」保守处理。
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}
