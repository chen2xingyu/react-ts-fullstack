// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  navigate,
  toPostId,
  toUserId,
  _typeAssertions,
  type DeepPartial,
  type PickByType,
  type MyAwaited,
  type FirstParameter,
  type LastParameter,
  type RoutePath,
  type UserId,
  type PostId,
  type Equal,
} from './typeChallenges'

/**
 * 🎯 面试考点：类型测试 vs 运行时测试
 * - 运行时测试：vitest 执行代码，断言值相等
 * - 类型测试：tsc 编译期检查，类型不匹配直接报错（无需运行）
 * 本文件两者结合：Expect<Equal<A, B>> 在编译期锁死类型推导结果，
 * it() 里再验证少量运行时行为。
 */

describe('类型挑战（编译期断言）', () => {
  it('所有类型断言通过编译', () => {
    // _typeAssertions 数组在 typeChallenges.ts 中被 tsc 严格检查，
    // 只要文件编译通过，说明所有 Equal<A, B> 都是 true
    expect(_typeAssertions.every(Boolean)).toBe(true)
  })
})

describe('类型挑战（运行时行为）', () => {
  it('navigate 接受合法模板字面量路由', () => {
    expect(navigate('/posts/123')).toBe('/posts/123')
    expect(navigate('/users/456')).toBe('/users/456')
  })

  it('branded type 构造函数返回值可用', () => {
    const uid: UserId = toUserId('u_1')
    const pid: PostId = toPostId('p_1')
    expect(uid).toBe('u_1')
    expect(pid).toBe('p_1')
  })

  it('DeepPartial 可用于局部更新场景', () => {
    interface Config {
      server: { host: string; port: number }
      cache: { ttl: number }
    }
    const patch: DeepPartial<Config> = { server: { port: 8080 } }
    expect(patch.server?.port).toBe(8080)
  })

  it('PickByType 可用于构造过滤后的键集合', () => {
    const picked: PickByType<{ a: number; b: string; c: number }, number> = {
      a: 1,
      c: 3,
    }
    expect(Object.keys(picked).sort()).toEqual(['a', 'c'])
  })

  it('MyAwaited 概念可对应到 async/await 运行时', async () => {
    // 类型层面：MyAwaited<Promise<string>> = string
    // 运行时层面：await 解包 Promise
    const value: MyAwaited<Promise<string>> = await Promise.resolve('hello')
    expect(value).toBe('hello')
  })

  it('FirstParameter / LastParameter 在运行时不可见，但类型正确', () => {
    const fn = (name: string, age: number) => `${name}-${age}`
    type F = FirstParameter<typeof fn>
    type L = LastParameter<typeof fn>
    // 运行时无法直接断言类型，但可以通过构造值验证兼容性
    const first: F = 'Alice'
    const last: L = 30
    expect(fn(first, last)).toBe('Alice-30')
  })

  it('RoutePath 类型限制路径格式', () => {
    const valid: RoutePath[] = ['/posts/1', '/users/999']
    expect(valid).toContain('/posts/1')
  })

  it('satisfies 保留字面量类型', () => {
    // PaletteKey 已在 typeChallenges.ts 中通过 Expect<Equal<...>> 断言
    // 这里仅验证运行时对象存在
    expect(_typeAssertions.length).toBe(6)
  })

  it('UserId 与 PostId 在运行时都是 string，但类型层面隔离', () => {
    const uid = toUserId('u_100')
    const pid = toPostId('p_100')
    // 运行时它们就是字符串
    expect(typeof uid).toBe('string')
    expect(typeof pid).toBe('string')
    // 类型层面 UserId 不能赋给 PostId（这行如果解开注释会编译报错）
    // const bad: PostId = uid
    expect(uid).not.toBe(pid)
  })
})

describe('类型挑战（负向断言）', () => {
  it('Equal 能识别不同类型', () => {
    type IsFalse = Equal<string, number>
    const check: IsFalse = false
    expect(check).toBe(false)
    // 下面这行如果解开注释，tsc 会报错：
    // const badCheck: IsFalse = true
  })
})
