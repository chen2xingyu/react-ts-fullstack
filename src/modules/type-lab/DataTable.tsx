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
 *
 * ── 高频追问 ──────────────────────────────────────────────
 * 【TS→JS 擦除】<T>、keyof T、ColumnDef<T>、DataTableProps<T> 全是编译期类型，
 *   编译成 JS 后一个字符都不剩 —— 产物里就是普通 function DataTable(props){...}，
 *   运行时根本不知道 T 是什么。类型安全 = 只在写代码/编译时帮你抓错，运行时零开销。
 *   ❌ 常见误解：以为泛型会在运行时被 new 出来或带参数 —— 不会，纯粹类型层。
 *
 * 【.tsx 里写泛型组件的坑】.tsx 中 JSX 尖括号和泛型尖括号长得一样，箭头函数泛型会被
 *   误判成 JSX：`const C = <T>(p: P) => ...` 直接报错。两种正确写法：
 *   ① 函数声明（本文件）：`function DataTable<T>(...)` —— 编译器知道这是函数声明，无歧义；
 *   ② 箭头函数：写 `<T,>`（多个逗号）或 `<T extends unknown>`，明确这是类型参数而非 JSX。
 *   易错：漏逗号会导致整个文件被当 JSX 解析，报一堆莫名其妙的语法错。
 *
 * 【调用处自动推导】使用时写 <DataTable data={posts} columns={columns} rowKey="id" />，
 *   不传 <T> 也能推出 T = PostRow：TS 从实参 posts: PostRow[] 反推 T，于是 columns 的
 *   key 被自动约束成 keyof PostRow。这就是「数据与列联动」的类型安全。
 *
 * 【泛型 vs any / unknown】若 props 写成 data: any[]，columns 里写错字段名也不报错，
 *   等于放弃类型检查；unknown 又太宽（访问属性前必须先收窄）。泛型 T 的价值：
 *   既保留「列名 ↔ 数据字段」的精确关联，又不在运行时付任何代价。
 */

interface ColumnDef<T> {
  /** dataIndex 必须是 T 的属性名（通过 keyof T 约束） */
  // 🎯 keyof T & string：keyof T 本是 string | number | symbol 的联合，& string 做「相交」
  // 后只剩字符串键（不是 union），保证 key 能直接当 JSX 的 key / 表头字段名用。
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
  // 🎯 useState 显式传泛型 <keyof T & string | null>：初始值是 null，若不显式标注，
  // TS 会把 state 窄推断成 null，后面 setSortKey(key) 就报错。显式声明告诉它
  // 「state 要么是某列名、要么是 null」。注意 & 优先级高于 |，等价于 (keyof T & string) | null。
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
      // 🎯 a[sortKey] 的类型是「T 所有字段值的联合」（string | number | ...），不能直接调
      // localeCompare / 做减法。先 as unknown，再用 typeof 做「类型收窄」：下面两个 typeof
      // 判断把联合收窄成 string / number 分支后，才能安全调用对应方法。这是 TS 里
      // 「联合类型 + 判别式收窄」的标准套路。as unknown 是边界层的必要强转（见 request.ts）。
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
