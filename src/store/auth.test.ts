import { describe, it, expect } from 'vitest'
import { isTokenExpired } from './auth'

// 🎯 面试考点：JWT 本身是不加密的 base64url 三段式（header.payload.signature），
// 前端可以直接读 payload 里的 exp 做过期预判；签名只用于服务端验真，前端读到的内容不可信。
function makeToken(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ sub: 1, exp }))
  return `${header}.${payload}.sig`
}

describe('isTokenExpired', () => {
  it('exp 在未来 → 未过期', () => {
    const future = Math.floor(Date.now() / 1000) + 3600
    expect(isTokenExpired(makeToken(future))).toBe(false)
  })

  it('exp 已过去 → 过期', () => {
    const past = Math.floor(Date.now() / 1000) - 60
    expect(isTokenExpired(makeToken(past))).toBe(true)
  })

  it('非法 token（无法解析）→ 按过期处理，触发重新登录流程', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true)
    expect(isTokenExpired('a.b')).toBe(true)
  })
})
