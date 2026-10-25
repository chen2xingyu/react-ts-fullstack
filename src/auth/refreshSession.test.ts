import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * refresh 串行化测试
 *
 * 背景：refreshToken 是一次性轮换的，两个并发刷新会让后到的请求使用「已吊销的旧 token」，
 * 服务端判定凭证复用 → 吊销全部会话（用户表现为 F5 后掉登录）。
 * 这里验证两层锁：
 * 1. 同一模块实例（同一标签页）：inFlight Promise 单例 → 并发调用只发一次 refresh
 * 2. 不同模块实例（模拟两个标签页）：Web Locks 串行 → 第二个刷新必须等第一个结束
 */

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  setAccessToken: vi.fn(),
}))

vi.mock('@/api/auth', () => ({ refreshToken: mocks.refresh }))
vi.mock('@/store/auth', () => ({
  useAuthStore: { getState: () => ({ setAccessToken: mocks.setAccessToken }) },
}))

beforeEach(() => {
  vi.resetModules()
  mocks.refresh.mockReset()
  mocks.setAccessToken.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('refreshAccessToken 并发控制', () => {
  it('同一标签页并发调用只发一次刷新，共享同一个结果', async () => {
    let resolveRefresh: (value: { accessToken: string }) => void = () => {}
    mocks.refresh.mockReturnValue(
      new Promise<{ accessToken: string }>((resolve) => {
        resolveRefresh = resolve
      })
    )

    const { refreshAccessToken } = await import('./refreshSession')
    const p1 = refreshAccessToken()
    const p2 = refreshAccessToken()

    expect(mocks.refresh).toHaveBeenCalledTimes(1)

    resolveRefresh({ accessToken: 'new-token' })
    await expect(p1).resolves.toBe('new-token')
    await expect(p2).resolves.toBe('new-token')
    expect(mocks.setAccessToken).toHaveBeenCalledWith('new-token')
    expect(mocks.setAccessToken).toHaveBeenCalledTimes(1)
  })

  it('刷新失败后释放单例，下一次调用可以重新发起', async () => {
    mocks.refresh.mockRejectedValueOnce(new Error('401')).mockResolvedValueOnce({ accessToken: 'ok' })

    const { refreshAccessToken } = await import('./refreshSession')
    await expect(refreshAccessToken()).rejects.toThrow('401')
    await expect(refreshAccessToken()).resolves.toBe('ok')
    expect(mocks.refresh).toHaveBeenCalledTimes(2)
  })

  it('两个标签页（两个模块实例）通过 Web Locks 串行刷新，不并发轮换', async () => {
    // 假 LockManager：同名锁排队，同一时刻只允许一个回调执行
    let tail: Promise<unknown> = Promise.resolve()
    const locks = {
      request: <T,>(_name: string, callback: () => Promise<T>): Promise<T> => {
        const run = tail.then(callback)
        tail = run.catch(() => undefined)
        return run
      },
    }
    vi.stubGlobal('navigator', { locks })

    const order: string[] = []
    mocks.refresh.mockImplementation(async () => {
      order.push('start')
      await new Promise((resolve) => setTimeout(resolve, 10))
      order.push('end')
      return { accessToken: 't' }
    })

    const tabA = await import('./refreshSession')
    vi.resetModules() // 清掉模块级 inFlight，模拟「另一个标签页」
    const tabB = await import('./refreshSession')

    await Promise.all([tabA.refreshAccessToken(), tabB.refreshAccessToken()])

    // 串行：第一次 start/end 之后才允许第二次 start
    expect(order).toEqual(['start', 'end', 'start', 'end'])
    expect(mocks.refresh).toHaveBeenCalledTimes(2)
  })
})
