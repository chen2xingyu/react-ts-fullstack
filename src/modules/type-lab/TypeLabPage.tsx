import { useState, useEffect } from 'react'
import DataTable, { type ColumnDef } from './DataTable'
import { fetchPosts } from '@/api/v2/feed'
import type { PostListItem } from '@shared/contracts/post.schema'
import { navigate, toPostId, toUserId, type PostId, type UserId } from './typeChallenges'

/**
 * 🎯 面试考点：TS 类型展厅
 *
 * 展示「类型系统如何在真实项目里工作」：
 * 1. 泛型 DataTable<T> —— columns 自动推导、排序、render 回调
 * 2. 类型挑战区 —— 每个类型都有源码和推导结果展示
 * 3. zod 契约端到端类型安全 —— 后端改字段，前端 tsc 立刻报错
 */

// 从 shared schema 推导出的 PostListItem 类型，保证前端/后端/表格三处一致
type PostRow = PostListItem

// 演示 branded type 的构造函数
const demoUserId: UserId = toUserId('u_12345')
const demoPostId: PostId = toPostId('p_67890')

export default function TypeLabPage() {
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetchPosts({ limit: 10 }, controller.signal)
      .then((page) => setPosts(page.list))
      .catch((e) => {
        if ((e as { name?: string })?.name !== 'CanceledError') {
          setError((e as Error).message)
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  // columns 数组：key 被 keyof PostRow 约束，写错字段名会编译报错
  const columns: ColumnDef<PostRow>[] = [
    { key: 'id', title: 'ID', sortable: true, width: 60 },
    { key: 'title', title: '标题', sortable: true, render: (row) => <span style={{ fontWeight: 500 }}>{row.title}</span> },
    { key: 'author', title: '作者', sortable: true },
    { key: 'likeCount', title: '点赞', sortable: true, width: 80 },
    { key: 'commentCount', title: '评论', sortable: true, width: 80 },
    {
      key: 'tags',
      title: '标签',
      render: (row) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {row.tags.map((t) => (
            <span key={t} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
              #{t}
            </span>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>📐 TS 类型展厅</h1>
      <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14 }}>
        泛型表格 + 类型挑战 + 端到端契约。后端改字段，这里立刻 tsc 报错。
      </p>

      {/* 泛型表格演示 */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>🔢 泛型 DataTable（真实 posts 数据）</h2>
        {error && <div style={{ color: 'red', marginBottom: 12 }}>❌ {error}</div>}
        {loading && <div style={{ color: '#6b7280', marginBottom: 12 }}>⏳ 加载中...</div>}
        <DataTable data={posts} columns={columns} rowKey="id" />
      </section>

      {/* 类型挑战展示区 */}
      <section>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>🧩 类型挑战（源码即答案）</h2>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <TypeCard
            title="DeepPartial<T>"
            desc="递归把所有嵌套属性变可选"
            code={`type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T`}
            result="DeepPartial<{a: {b: string}}> = { a?: { b?: string } }"
          />
          <TypeCard
            title="PickByType<T, U>"
            desc="按属性值类型过滤键"
            code={`type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K]
}`}
            result="PickByType<{id: number, name: string}, number> = { id: number }"
          />
          <TypeCard
            title="MyAwaited<T>"
            desc="手写 Promise 解包（递归）"
            code={`type MyAwaited<T> = T extends Promise<infer R>
  ? MyAwaited<R>
  : T`}
            result="MyAwaited<Promise<Promise<string>>> = string"
          />
          <TypeCard
            title="infer 参数推导"
            desc="模式匹配提取函数参数/返回值"
            code={`type FirstParam<T> = T extends
  (first: infer P, ...args: never[]) => unknown
  ? P
  : never`}
            result="FirstParam<(a: string, b: number) => void> = string"
          />
          <TypeCard
            title="模板字面量路由"
            desc="类型安全的路径字符串"
            code={`type RoutePath = \`/posts/\${number}\` | \`/users/\${number}\`
navigate('/posts/123')  // ✅
navigate('/posts/abc')  // ❌ 编译报错`}
            result={`navigate('/posts/123') 返回: ${navigate('/posts/123')}`}
          />
          <TypeCard
            title="satisfies 保留字面量"
            desc="既校验类型，又不 widen"
            code={`const palette = {
  primary: '#3b82f6',
} as const satisfies Record<string, \`#\${string}\`>`}
            result="palette.primary 的类型仍是 '#3b82f6'，不是 string"
          />
          <TypeCard
            title="Branded Type"
            desc="防止同结构 primitive 混用"
            code={`type UserId = Brand<string, 'UserId'>
type PostId = Brand<string, 'PostId'>`}
            result={`demoUserId: UserId = '${demoUserId}'，demoPostId: PostId = '${demoPostId}'，两者不能互相赋值`}
          />
        </div>
      </section>
    </div>
  )
}

function TypeCard({ title, desc, code, result }: { title: string; desc: string; code: string; result: string }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fff' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>{desc}</p>
      <pre
        style={{
          background: '#1f2937',
          color: '#e5e7eb',
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
          overflowX: 'auto',
          margin: '0 0 8px',
        }}
      >
        {code}
      </pre>
      <div style={{ fontSize: 12, color: '#059669', background: '#ecfdf5', padding: '6px 10px', borderRadius: 6 }}>
        {result}
      </div>
    </div>
  )
}
