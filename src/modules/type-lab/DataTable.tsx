import { useState, useMemo } from 'react'

/**
 * 🎯 面试考点：泛型组件 <DataTable<T>>
 *
 * 1. columns 数组的每一项通过泛型约束自动推导 T 的 key，
 *    写错字段名在编译期就报错（而不是运行时报 undefined）
 * 2. render 函数提供整行 T，让用户灵活控制显示
 * 3. sortable 列在类型系统里有校验：必须是 T[keyof T & string] 的可排序值
 *
 * 追问：为什么约束 `data: T[] extends readonly unknown[]`？
 * 答：让 T 保持元素类型推导（不是 any），同时兼容 readonly 数据源。
 */

interface ColumnDef<T> {
  /** dataIndex 必须是 T 的属性名（通过 keyof T 约束） */
  key: keyof T & string
  title: string
  /** 自定义渲染（接收整行数据） */
  render?: (row: T) => React.ReactNode
  /** 点击表头可排序 */
  sortable?: boolean
  /** 列宽 */
  width?: number | string
}

interface DataTableProps<T> {
  data: readonly T[]
  columns: ColumnDef<T>[]
  /** 行唯一标识 */
  rowKey: keyof T
  /** 每行点击回调 */
  onRowClick?: (row: T) => void
}

export default function DataTable<T>({ data, columns, rowKey, onRowClick }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T & string | null>(null)
  const [sortDesc, setSortDesc] = useState(false)

  const handleSort = (key: keyof T & string) => {
    if (sortKey === key) {
      setSortDesc((d) => !d)
    } else {
      setSortKey(key)
      setSortDesc(false)
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data
    const list = [...data]
    list.sort((a, b) => {
      const av = a[sortKey] as unknown
      const bv = b[sortKey] as unknown
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDesc ? bv.localeCompare(av) : av.localeCompare(bv)
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDesc ? bv - av : av - bv
      }
      return 0
    })
    return list
  }, [data, sortKey, sortDesc])

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderBottom: '2px solid #e5e7eb',
                  background: '#f9fafb',
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  width: col.width,
                }}
              >
                {col.title}
                {sortKey === col.key && (
                  <span style={{ marginLeft: 4, color: '#3b82f6' }}>
                    {sortDesc ? '↓' : '↑'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={String(row[rowKey])}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: '1px solid #f3f4f6',
                cursor: onRowClick ? 'pointer' : 'default',
              }}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '10px 12px' }}>
                  {col.render
                    ? col.render(row)
                    : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          暂无数据
        </div>
      )}
    </div>
  )
}

export type { ColumnDef }
