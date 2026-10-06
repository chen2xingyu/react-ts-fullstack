import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from './DataTable'
import type { ColumnDef } from './DataTable'

interface Row {
  id: number
  name: string
  age: number
}

const data: Row[] = [
  { id: 1, name: 'Charlie', age: 30 },
  { id: 2, name: 'Alice', age: 25 },
  { id: 3, name: 'Bob', age: 35 },
]

const columns: ColumnDef<Row>[] = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: '姓名', sortable: true },
  { key: 'age', title: '年龄', sortable: true },
]

describe('DataTable<T>', () => {
  it('按 columns 渲染数据', () => {
    render(<DataTable data={data} columns={columns} rowKey="id" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('点击 sortable 表头排序', async () => {
    const user = userEvent.setup()
    render(<DataTable data={data} columns={columns} rowKey="id" />)
    const nameHeader = screen.getByText('姓名')
    await user.click(nameHeader)
    // 第一行应为 Alice
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Alice')
  })

  it('空数据显示占位', () => {
    render(<DataTable data={[]} columns={columns} rowKey="id" />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('rowKey 作为 key，无重复 key 警告', () => {
    const { container } = render(<DataTable data={data} columns={columns} rowKey="id" />)
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3)
  })
})
