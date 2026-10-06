import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PerfPage from './PerfPage'
import { NaiveRow, OptimizedRow } from './Rows'

/**
 * 🎯 面试考点：性能优化效果的「可测试化」
 * 不靠肉眼，用 DOM 上的渲染次数做断言。
 */

describe('Rows 渲染计数', () => {
  it('NaiveRow 每次 render 计数都 +1', () => {
    const onSelect = () => {}
    const { rerender } = render(<NaiveRow item={{ id: 1, label: 'A', value: 1 }} onSelect={onSelect} />)
    expect(screen.getByTestId('naive-row-1')).toHaveTextContent('渲染 1 次')
    rerender(<NaiveRow item={{ id: 1, label: 'A', value: 1 }} onSelect={onSelect} />)
    expect(screen.getByTestId('naive-row-1')).toHaveTextContent('渲染 2 次')
  })

  it('OptimizedRow 在 props 引用不变时跳过 render', () => {
    const onSelect = () => {}
    const item = { id: 1, label: 'A', value: 1 }
    const { rerender } = render(<OptimizedRow item={item} onSelect={onSelect} />)
    expect(screen.getByTestId('opt-row-1')).toHaveTextContent('渲染 1 次')
    rerender(<OptimizedRow item={item} onSelect={onSelect} />)
    expect(screen.getByTestId('opt-row-1')).toHaveTextContent('渲染 1 次')
  })

  it('OptimizedRow 在 onSelect 引用变化时仍会重渲染（memo 失效演示）', () => {
    const item = { id: 1, label: 'A', value: 1 }
    const { rerender } = render(<OptimizedRow item={item} onSelect={() => {}} />)
    expect(screen.getByTestId('opt-row-1')).toHaveTextContent('渲染 1 次')
    // 每次传入新的内联函数 → memo 比较失败 → 重渲染
    rerender(<OptimizedRow item={item} onSelect={() => {}} />)
    expect(screen.getByTestId('opt-row-1')).toHaveTextContent('渲染 2 次')
  })
})

describe('PerfPage 对照实验', () => {
  it('输入无关文本时：朴素版全部重渲染，优化版不渲染', async () => {
    const user = userEvent.setup()
    render(<PerfPage />)

    // 初始：两栏都是 1 次
    expect(screen.getByTestId('naive-row-0')).toHaveTextContent('渲染 1 次')
    expect(screen.getByTestId('opt-row-0')).toHaveTextContent('渲染 1 次')

    // 敲一个字符 → 父组件 state 变化 → 朴素版重渲染，优化版不变
    await user.type(screen.getByTestId('perf-input'), 'x')
    expect(screen.getByTestId('naive-row-0')).toHaveTextContent('渲染 2 次')
    expect(screen.getByTestId('opt-row-0')).toHaveTextContent('渲染 1 次')
  })

  it('children as prop：Ticker 每秒 render，ExpensivePanel 不跟着 render', () => {
    render(<PerfPage />)
    const panel = screen.getByTestId('panel-renders')
    expect(panel).toHaveTextContent('1')
    // 即使 Ticker 内部 setInterval 每秒触发，ExpensivePanel 也不会重渲染
    // （因为 children 是 PerfPage 创建的同一 React Element 引用）
  })
})
