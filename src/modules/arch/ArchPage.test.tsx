import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArchPage from './ArchPage'
import { NODES } from './archData'

describe('ArchPage 架构图', () => {
  it('渲染全部架构节点', () => {
    render(<ArchPage />)
    for (const n of NODES) {
      expect(screen.getByTestId(`node-${n.id}`)).toBeInTheDocument()
    }
  })

  it('默认显示引导提示', () => {
    render(<ArchPage />)
    expect(screen.getByTestId('arch-detail')).toHaveTextContent('点击上方任意节点')
  })

  it('点击节点显示该层面试讲解要点', async () => {
    const user = userEvent.setup()
    render(<ArchPage />)
    await user.click(screen.getByTestId('node-v2'))
    expect(screen.getByTestId('arch-detail')).toHaveTextContent('游标分页')
    expect(screen.getByTestId('arch-detail')).toHaveTextContent('中间件栈即防线')
  })

  it('再次点击取消选中，回到引导提示', async () => {
    const user = userEvent.setup()
    render(<ArchPage />)
    await user.click(screen.getByTestId('node-redis'))
    expect(screen.getByTestId('arch-detail')).toHaveTextContent('cache-aside')
    await user.click(screen.getByTestId('node-redis'))
    expect(screen.getByTestId('arch-detail')).toHaveTextContent('点击上方任意节点')
  })
})
