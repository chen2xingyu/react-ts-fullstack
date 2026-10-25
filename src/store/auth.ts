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
 *
 * 🎯 安全考点：凭证存哪里（本文件已按「内存 + httpOnly Cookie」改造）
 * - accessToken：只放 Zustand 内存，【绝不】写 localStorage/sessionStorage。
 *   刷新页面即丢失，靠启动时的静默刷新（src/auth/bootstrap.ts）重新换取。
 *   好处：XSS 注入的脚本读不到持久化的令牌；即便被窃取，最多只有 30 分钟有效期。
 * - refreshToken：完全由后端通过 httpOnly Cookie 管理，前端 JS 从不接触、也读不到。
 *   好处：防 XSS 窃取；配合 SameSite=Lax + 轮换 + Origin 校验防 CSRF。
 * - user：也只放内存，启动时由 /auth/profile 拉回（避免用 localStorage 里的过期脏数据渲染）。
 *
 * 对照旧方案（已废弃）：accessToken + refreshToken 双份 JSON 塞 localStorage，
 * 一旦站点有 XSS，攻击者可拿到 7 天有效的 refreshToken 长期接管账号，且改密码也踢不掉。
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
  isAuthenticated: boolean
  isLoading: boolean
  /** 应用启动时的静默刷新是否已完成（未完成时路由守卫应显示加载态而不是踢去登录页） */
  isBootstrapping: boolean
  error: string | null
}

interface AuthActions {
  setAuth: (user: AuthUser, accessToken: string) => void
  setUser: (user: AuthUser) => void
  setAccessToken: (token: string) => void
  /** 静默刷新流程结束（成功或失败都调用）：置 isBootstrapping=false */
  setBootstrapped: () => void
  logout: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// ============ Zustand Store ============
// 🎯 面试考点：create 的 set 是「浅合并」，不是 Redux 那样整包替换
// (set) => 接收一个 set 函数；set({ accessToken }) 只会浅合并这一个字段，
//   其余 state（user/isAuthenticated…）原样保留 —— 这与 React.setState 的合并语义一致。
// 易错点：因此不需要每次都展开旧 state。对比 Redux reducer 必须 return 整个新 state。
export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isBootstrapping: true, // 默认 true：等 bootstrap 静默刷新结束
  error: null,

  setAuth: (user, accessToken) => {
    set({ user, accessToken, isAuthenticated: true, isBootstrapping: false, error: null })
  },

  setUser: (user) => {
    set({ user, isAuthenticated: true })
  },

  setAccessToken: (token) => {
    set({ accessToken: token, isAuthenticated: true })
  },

  setBootstrapped: () => {
    // 静默刷新失败时（没有有效 Cookie）保持未登录状态，守卫正常踢去 /login
    set((state) => ({
      isBootstrapping: false,
      isAuthenticated: !!state.accessToken,
    }))
  },

  logout: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isBootstrapping: false,
      error: null,
    })
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))

// ============ 导出工具函数 ============
// 🎯 面试考点：为什么用 getState() 而不是 hook？
// 这两个函数在 axios 拦截器（非组件、无 React 渲染上下文）里被调用，
// hook 只能在组件函数体中调用（React Hooks 规则），组件外必须走 getState() 同步读取。
export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken
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
