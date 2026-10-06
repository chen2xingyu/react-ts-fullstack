import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { withLoading } from './withLoading'
import MouseTracker from './MouseTracker'
import ControlledVsUncontrolled from './ControlledVsUncontrolled'
import TemperatureConverter from './TemperatureConverter'

describe('withLoading（HOC）', () => {
  function Card({ text }: { text: string }) {
    return <p>{text}</p>
  }
  const CardWithLoading = withLoading(Card)

  it('loading=true 时显示占位，不渲染内容', () => {
    render(<CardWithLoading loading text="正文" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('正文')).not.toBeInTheDocument()
  })

  it('loading=false 时渲染被包裹组件', () => {
    render(<CardWithLoading loading={false} text="正文" />)
    expect(screen.getByText('正文')).toBeInTheDocument()
  })

  it('displayName 便于 DevTools 调试', () => {
    expect(CardWithLoading.displayName).toBe('withLoading(Card)')
  })
})

describe('MouseTracker（Render Props）', () => {
  it('鼠标移动时把坐标传给 render prop', () => {
    render(
      <MouseTracker render={({ x, y }) => <span data-testid="pos">{`${x},${y}`}</span>} />,
    )
    const area = screen.getByTestId('mouse-tracker')
    // jsdom 的 getBoundingClientRect 全 0，坐标即 clientX/clientY
    fireEvent.mouseMove(area, { clientX: 42, clientY: 24 })
    expect(screen.getByTestId('pos')).toHaveTextContent('42,24')
  })
})

describe('受控 vs 非受控', () => {
  it('受控输入实时同步 state，渲染计数随击键增长', async () => {
    const user = userEvent.setup()
    render(<ControlledVsUncontrolled />)
    const before = Number(screen.getByTestId('controlled-render-count').textContent!.match(/\d+/)![0])
    await user.type(screen.getByPlaceholderText('每击键都 setState'), 'abc')
    expect(screen.getByTestId('controlled-echo')).toHaveTextContent('abc')
    const after = Number(screen.getByTestId('controlled-render-count').textContent!.match(/\d+/)![0])
    expect(after).toBeGreaterThan(before)
  })

  it('非受控输入不触发重渲染，点击按钮才读取 ref 值', async () => {
    const user = userEvent.setup()
    render(<ControlledVsUncontrolled />)
    const countBefore = screen.getByTestId('uncontrolled-render-count').textContent
    await user.type(screen.getByPlaceholderText('击键不触发渲染'), 'xyz')
    // 击键后渲染计数不变
    expect(screen.getByTestId('uncontrolled-render-count').textContent).toBe(countBefore)
    // ref 读取
    await user.click(screen.getByRole('button', { name: '用 ref 读取' }))
    expect(screen.getByTestId('uncontrolled-snapshot')).toHaveTextContent('xyz')
  })
})

describe('TemperatureConverter（状态提升）', () => {
  it('摄氏输入 100，华氏推导为 212，且提示水会沸腾', async () => {
    const user = userEvent.setup()
    render(<TemperatureConverter />)
    await user.type(screen.getByLabelText('摄氏 °C'), '100')
    expect(screen.getByLabelText('华氏 °F')).toHaveValue('212')
    expect(screen.getByTestId('boiling-verdict')).toHaveTextContent('沸腾')
  })

  it('从华氏侧输入，摄氏侧同步（单一数据源）', async () => {
    const user = userEvent.setup()
    render(<TemperatureConverter />)
    await user.type(screen.getByLabelText('华氏 °F'), '32')
    expect(screen.getByLabelText('摄氏 °C')).toHaveValue('0')
  })
})
