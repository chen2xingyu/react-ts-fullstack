import { refreshToken, getProfile } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

/**
 * 🎯 面试考点：accessToken 只存内存后，刷新页面怎么恢复登录态？—— 静默刷新（silent refresh）
 *
 * 问题：accessToken 不落 localStorage，F5 一按内存清空，用户就被踢去登录页了。
 * 解法：页面加载时先调一次 POST /auth/refresh。refreshToken 在 httpOnly Cookie 里，
 *   浏览器会自动带上；有有效 Cookie → 换回新 accessToken → 再拉 /auth/profile 补用户信息。
 *   没有/过期 → 401 → 保持未登录，正常显示登录页。
 *
 * 关键点 1：isBootstrapping 期间路由守卫要显示加载态，不能立刻 <Navigate to="/login">，
 *   否则静默刷新还没回来，用户就被闪到登录页了（即使 Cookie 完全有效）。
 * 关键点 2：单例 Promise。StrictMode 下 effect 会二次执行，加上任何组件提前调用，
 *   都不应该并发打多次 refresh（refresh 是轮换语义，并发会让后到的请求变成“复用旧 token”）。
 * 关键点 3：失败是【正常路径】而不是错误：未登录用户每次打开首页都会 401，无需上报/弹窗。
 */
let bootstrapPromise: Promise<void> | null = null

export function bootstrapAuth(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = (async () => {
    const store = useAuthStore.getState()

    // 已有登录态（比如登录后在同一会话内热更新）就不必再刷
    if (store.isAuthenticated && store.accessToken) {
      store.setBootstrapped()
      return
    }

    try {
      const { accessToken } = await refreshToken()
      useAuthStore.getState().setAccessToken(accessToken)
    } catch {
      // 无有效 Cookie：保持未登录，守卫会把受保护页面导向 /login
      useAuthStore.getState().setBootstrapped()
      return
    }

    try {
      const user = await getProfile()
      useAuthStore.getState().setUser(user)
    } catch {
      // 令牌有效但资料拉取失败：登录态仍成立，页面自己会提示/重试，不阻塞启动
    } finally {
      useAuthStore.getState().setBootstrapped()
    }
  })()

  return bootstrapPromise
}
