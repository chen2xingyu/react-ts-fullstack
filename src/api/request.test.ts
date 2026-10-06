import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * 🎯 面试考点：Access Token 无感刷新的并发控制
 *
 * 经典实现：响应拦截器在遇到 401 时挂起所有并发请求，只发起一次 refresh，
 * 拿到新令牌后批量重放。这里用假的 axios 实例驱动两条关键链路：
 * 1. 并发 401 + refresh 成功 → refresh 只发 1 次，挂起请求全部以新令牌重放成功
 * 2. 并发 401 + refresh 自身也 401 → 不能重入刷新流程（否则死锁），
 *    挂起请求必须被 reject 并触发登出跳转
 */

const mocks = vi.hoisted(() => {
  // 跨 mock 工厂共享的可变认证状态（vi.mock 工厂会被提升，闭包变量需放 hoisted 里）
  const state = { accessToken: 'old-token' }
  const logout = vi.fn()
  const setAccessToken = vi.fn((t: string) => {
    state.accessToken = t
  })

  // 假 axios 的拦截器注册表与实例引用
  const httpState: {
    reqHandlers: Array<{ fulfilled: (cfg: any) => any }>
    resHandlers: Array<{ fulfilled: (r: any) => any; rejected: (e: any) => any }>
    policy: null | ((cfg: any) => { status: number; data?: any })
    instance: any
  } = {
    reqHandlers: [],
    resHandlers: [],
    policy: null,
    instance: null,
  }

  return { state, logout, setAccessToken, httpState }
})

vi.mock('@/store/auth', () => ({
  getAccessToken: () => mocks.state.accessToken,
  getRefreshToken: () => 'refresh-token',
  useAuthStore: {
    getState: () => ({
      setAccessToken: mocks.setAccessToken,
      logout: mocks.logout,
    }),
  },
}))

vi.mock('axios', () => {
  // 假实例既是函数（拦截器重放时 request(config) 会直接调用实例），又带 get/post/interceptors
  function dispatch(cfg: any) {
    // 依次跑请求拦截器（注入 Authorization）
    for (const h of mocks.httpState.reqHandlers) {
      cfg = h.fulfilled(cfg)
    }
    const outcome = mocks.httpState.policy!(cfg)
    const rh = mocks.httpState.resHandlers[0]
    if (outcome.status >= 400) {
      return rh.rejected({
        response: { status: outcome.status, data: outcome.data },
        config: cfg,
      })
    }
    return rh.fulfilled({
      data: outcome.data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: cfg,
    })
  }

  const instance: any = vi.fn((cfg: any) => dispatch(cfg))
  instance.interceptors = {
    request: {
      use: (fulfilled: any) => mocks.httpState.reqHandlers.push({ fulfilled }),
    },
    response: {
      use: (fulfilled: any, rejected: any) =>
        mocks.httpState.resHandlers.push({ fulfilled, rejected }),
    },
  }
  instance.get = vi.fn((url: string, config?: any) =>
    dispatch({ ...config, method: 'get', url, headers: {} })
  )
  instance.post = vi.fn((url: string, data?: any, config?: any) =>
    dispatch({ ...config, method: 'post', url, data, headers: {} })
  )
  mocks.httpState.instance = instance

  return { default: { create: () => instance } }
})

beforeEach(async () => {
  // 每个用例重载模块，让 isRefreshing / pendingRequests 回到初始态
  mocks.httpState.reqHandlers.length = 0
  mocks.httpState.resHandlers.length = 0
  mocks.state.accessToken = 'old-token'
  mocks.logout.mockClear()
  mocks.setAccessToken.mockClear()
  vi.resetModules()
  // jsdom 里 location.href 赋值会抛 "Not implemented: navigation"，桩掉
  vi.stubGlobal('location', { href: '' })
  await import('./request')
})

// 路由策略：旧令牌的业务请求 401；新令牌 200；refresh 由开关控制
function installPolicy(refreshOk: boolean) {
  mocks.httpState.policy = (cfg: any) => {
    if (cfg.url === '/auth/refresh') {
      return refreshOk
        ? {
            status: 200,
            data: {
              code: 0,
              message: 'ok',
              data: { accessToken: 'new-token', expiresIn: '1800' },
            },
          }
        : { status: 401, data: null }
    }
    if (cfg.headers?.Authorization === 'Bearer new-token') {
      return { status: 200, data: { code: 0, message: 'ok', data: { ok: true } } }
    }
    return { status: 401, data: null }
  }
}

describe('axios 无感刷新并发控制', () => {
  it('并发 401 时只刷新一次，成功后全部请求以新令牌重放', async () => {
    installPolicy(true)
    const { http } = await import('./request')

    // 两个业务请求几乎同时发出（模拟 React Query 并发拉数）
    const p1 = http.get('/trading/stocks')
    const p2 = http.get('/trading/account')

    const [r1, r2] = await Promise.all([p1, p2])

    // refresh 端点只被调用了 1 次（没有并发重复刷新）
    const refreshCalls = mocks.httpState.instance.post.mock.calls.filter(
      (c: any[]) => c[0] === '/auth/refresh'
    )
    expect(refreshCalls).toHaveLength(1)
    // 刷新请求必须带 _isRefreshRequest 标记（防死锁短路依赖它）
    expect(refreshCalls[0][2]).toMatchObject({ _isRefreshRequest: true })
    // 新令牌写回 store，两个挂起请求重放成功
    expect(mocks.setAccessToken).toHaveBeenCalledWith('new-token')
    expect(r1.data).toEqual({ ok: true })
    expect(r2.data).toEqual({ ok: true })
  })

  it('refresh 自身也 401 时不死锁：挂起请求全部 reject 并登出跳转', async () => {
    installPolicy(false)
    const { http } = await import('./request')

    const p1 = http.get('/trading/stocks')
    const p2 = http.get('/trading/account')

    // 修复前这里会永久 pending（refresh 请求把自己挂进等待队列）→ 测试超时
    await expect(p1).rejects.toBeDefined()
    await expect(p2).rejects.toBeDefined()
    expect(mocks.logout).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('/login')
  })
})
