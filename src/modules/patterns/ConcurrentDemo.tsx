import { useState, useTransition, useMemo } from 'react'
import { useRenderCount } from '../perf/useRenderCount'

/**
 * 🎯 面试考点：React 并发模式 —— startTransition 与 useTransition
 *
 * 问题：搜索输入时，如果列表很大，每次击键都立即高优先级渲染，
 * 导致输入框卡顿（主线程被长列表更新阻塞）。
 *
 * 解决：startTransition 标记列表更新为「低优先级过渡」，
 * React 优先响应输入框（高优先级），再处理列表（低优先级）。
 *
 * 本演示：5000 条数据的列表搜索，
 * - 左侧：直接用 setState → 输入卡顿（被长列表阻塞）
 * - 右侧：startTransition → 输入流畅（列表延迟更新）
 */

const ALL_ITEMS = Array.from({ length: 5000 }, (_, i) => ({
  id: i + 1,
  text: `Item #${i + 1} ${['Alpha', 'Beta', 'Gamma', 'Delta'][i % 4]}`,
}))

function NaiveFilter() {
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () => (query ? ALL_ITEMS.filter((item) => item.text.toLowerCase().includes(query.toLowerCase())) : ALL_ITEMS),
    [query],
  )
  const renders = useRenderCount()

  return (
    <div className="rounded-lg border border-red-100 bg-red-50/50 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-red-700">
        <span className="font-medium">❌ 直接 setState（卡顿）</span>
        <span data-testid="naive-render-count">渲染 {renders} 次</span>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="输入搜索词…"
        className="mb-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-red-400 focus:outline-none"
        data-testid="naive-input"
      />
      <p className="mb-2 text-xs text-gray-500">命中 {filtered.length} / 5000 条</p>
      <ul className="h-48 overflow-y-auto rounded bg-white text-xs leading-6">
        {filtered.slice(0, 20).map((item) => (
          <li key={item.id} className="border-b border-gray-100 px-2 last:border-0">
            {item.text}
          </li>
        ))}
        {filtered.length > 20 && <li className="px-2 text-gray-400">…还有 {filtered.length - 20} 条</li>}
      </ul>
    </div>
  )
}

function TransitionFilter() {
  const [query, setQuery] = useState('')
  const [pendingQuery, setPendingQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const filtered = useMemo(
    () => (pendingQuery ? ALL_ITEMS.filter((item) => item.text.toLowerCase().includes(pendingQuery.toLowerCase())) : ALL_ITEMS),
    [pendingQuery],
  )
  const renders = useRenderCount()

  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-emerald-700">
        <span className="font-medium">✅ startTransition（流畅）</span>
        <span data-testid="transition-render-count">渲染 {renders} 次</span>
      </div>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            startTransition(() => setPendingQuery(e.target.value))
          }}
          placeholder="输入搜索词…"
          className="mb-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-400 focus:outline-none"
          data-testid="transition-input"
        />
        {isPending && (
          <span className="absolute right-2 top-1.5 text-xs text-amber-600">列表更新中…</span>
        )}
      </div>
      <p className="mb-2 text-xs text-gray-500">命中 {filtered.length} / 5000 条</p>
      <ul className={`h-48 overflow-y-auto rounded bg-white text-xs leading-6 ${isPending ? 'opacity-50' : ''}`}>
        {filtered.slice(0, 20).map((item) => (
          <li key={item.id} className="border-b border-gray-100 px-2 last:border-0">
            {item.text}
          </li>
        ))}
        {filtered.length > 20 && <li className="px-2 text-gray-400">…还有 {filtered.length - 20} 条</li>}
      </ul>
    </div>
  )
}

export default function ConcurrentDemo() {
  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-gray-800">5. 并发模式 —— startTransition 卡顿对照</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NaiveFilter />
        <TransitionFilter />
      </div>
      <p className="mt-3 text-xs text-gray-400">
        考点：startTransition 把列表更新标记为「低优先级过渡」，React 优先响应输入（高优先级 UI）。
        5000 条数据时左侧输入明显卡顿，右侧输入流畅但列表延迟更新（isPending 可展示 loading 态）。
      </p>
    </section>
  )
}
