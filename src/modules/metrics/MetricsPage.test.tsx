import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetricsPage from './MetricsPage'

// jsdom 无 PerformanceObserver，mock 为空实现
beforeEach(() => {
  vi.stubGlobal('PerformanceObserver', undefined)
})

describe('MetricsPage', () => {
  it('渲染页面标题', () => {
    render(<MetricsPage />)
    expect(screen.getByText('📊 Web Vitals 性能监控')).toBeInTheDocument()
  })
})
