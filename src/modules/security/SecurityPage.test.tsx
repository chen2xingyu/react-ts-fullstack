import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SecurityPage from './SecurityPage'

/**
 * XSS 演示验证：
 * - 危险栏：原始 payload 原样进 DOM，onerror 属性还在（说明 innerHTML 确实危险）
 * - 消毒栏：DOMPurify 保留 <img> 标签但抹掉 onerror，脚本无法执行
 */
describe('SecurityPage XSS 渲染对照', () => {
  it('危险栏保留 onerror，DOMPurify 栏将其剥离', () => {
    render(<SecurityPage />)

    const dangerous = screen.getByTestId('xss-dangerous')
    expect(dangerous.querySelector('img')?.getAttribute('onerror')).toContain('alert')

    const sanitized = screen.getByTestId('xss-sanitized')
    const img = sanitized.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.hasAttribute('onerror')).toBe(false)
  })
})
