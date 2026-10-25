import { refreshToken as apiRefreshToken } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

/**
 * 🎯 面试考点：refresh 轮换下的并发控制（跨标签页 + 单标签页）
 *
 * 为什么必须串行：
 * refreshToken 是一次性轮换的（后端每次刷新都吊销旧 jti、签发新 jti）。
 * 两个标签页同时对同一个 Cookie 发起刷新时，浏览器 Cookie 罐里还是同一个旧值：
 * 先到的那次完成轮换，后到的那次就变成「使用已吊销的旧 token」→ 服务端判定凭证被盗
 * → revokeAllForUser → 两个标签页一起掉登录。表现就是「F5 之后弹回登录页」。
 *
 * 两层锁：
 * 1. 单标签页：模块级 inFlight Promise，把 bootstrap 静默刷新与 axios 401 拦截器的刷新
 *    合并成一次请求（否则同一页面的并发 401 也会撞车）。
 * 2. 跨标签页：Web Locks API 的 navigator.locks.request —— 浏览器原生提供同源互斥，
 *    比 localStorage 时间戳锁那种「写-等待-再读」的近似实现可靠得多。
 *    拿到锁后是「排队刷新」而非「共享令牌」：Cookie 罐是全局共享的，
 *    前一个标签页轮换后的新 Cookie 会被后一个标签页的请求直接带上，
 *    所以顺序刷新安全，只有并发才致命。
 *
 * 降级：不支持 Web Locks 的浏览器退化为仅单标签页合并（仍能避免页内撞车）。
 * 面试延伸：这是客户端侧限流；更彻底的做法是服务端给被轮换的旧 token 一个短宽限期
 * （grace window，比如 10s 内复用视为幂等重试而非盗用），两种思路各有取舍。
 */

type LockManagerLike = {
  request: <T>(name: string, callback: () => Promise<T>) => Promise<T>
}

// 单标签页内的刷新 Promise 单例：第一个调用者发请求，其余调用者复用它
let inFlight: Promise<string> | null = null

async function performRefresh(): Promise<string> {
  const { accessToken } = await apiRefreshToken()
  useAuthStore.getState().setAccessToken(accessToken)
  return accessToken
}

/**
 * 换取新的 accessToken，并保证「同一时刻全局只发一次 refresh」。
 * bootstrap 与 401 拦截器都调用它，共享同一个 Promise。
 */
export function refreshAccessToken(): Promise<string> {
  if (inFlight) return inFlight

  const run = async () => {
    const locks =
      typeof navigator !== 'undefined'
        ? (navigator as unknown as { locks?: LockManagerLike }).locks
        : undefined

    if (locks) {
      // 跨标签页互斥：同名锁天然串行，等前一个标签页轮换完再发
      return locks.request('auth-refresh-token', performRefresh)
    }
    return performRefresh()
  }

  inFlight = run().finally(() => {
    inFlight = null
  })

  return inFlight
}
