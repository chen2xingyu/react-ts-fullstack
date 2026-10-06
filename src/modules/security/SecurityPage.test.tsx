import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SecurityPage from './SecurityPage'

describe('SecurityPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeAll(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0, data: { balance: 900 } }) })
    vi.stubGlobal('fetch', fetchMock)
  })
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('XSS 演示：危险区域渲染 HTML 标签，安全区域显示纯文本', () => {
    render(<SecurityPage />)
    // 危险区域：payload 被解析成真实 <img> 标签（innerHTML 含标签）
    expect(screen.getByTestId('xss-dangerous').querySelector('img')).not.toBeNull()
    // 安全区域：payload 原样作为文本展示（无 <img> 标签）
    const safe = screen.getByTestId('xss-safe')
    expect(safe.querySelector('img')).toBeNull()
    expect(safe.textContent).toContain('onerror')
  })

  it('CSRF 演示：带 Token 按钮调用带 header 的 fetch', async () => {
    const user = userEvent.setup()
    render(<SecurityPage />)
    await user.click(screen.getByRole('button', { name: '✅ 带 Token 转账' }))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v2/security/csrf/transfer',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'demo-token-123' }),
      }),
    )
  })

  it('CSRF 演示：无防护按钮调用不带 token 的接口', async () => {
    const user = userEvent.setup()
    render(<SecurityPage />)
    await user.click(screen.getByRole('button', { name: /无防护/ }))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v2/security/csrf/transfer/unsafe',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
