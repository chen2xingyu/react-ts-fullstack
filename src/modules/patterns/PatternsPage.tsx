import { useState } from 'react'
import { withLoading } from './withLoading'
import MouseTracker from './MouseTracker'
import ControlledVsUncontrolled from './ControlledVsUncontrolled'
import TemperatureConverter from './TemperatureConverter'
import ConcurrentDemo from './ConcurrentDemo'

/**
 * 🎯 面试考点：组件设计模式展厅
 *
 * 本页展示 React 四种核心模式：
 * 1. HOC —— 横切复用（loading、鉴权、埋点）
 * 2. Render Props —— 逻辑复用 + 渲染完全定制（已完成的复合组件< Kanban.Board >同宗）
 * 3. 受控 vs 非受控 —— 渲染代价直观对照
 * 4. 状态提升 —— 兄弟同步的数据流
 *
 * 面试追问贯穿：这些模式在现代 React 中是否被淘汰？答：未被淘汰，只是
 * 逻辑复用首选 Hooks；HOC/render props 仍有「包装已有组件」的场景价值。
 */

/* ── 1. HOC 演示 ── */
interface PostCardProps {
  title: string
  summary: string
}

function PostCard({ title, summary }: PostCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{summary}</p>
    </div>
  )
}
const PostCardWithLoading = withLoading(PostCard)

/* ── 页面组装 ── */
export default function PatternsPage() {
  const [loading, setLoading] = useState(false)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">🏗️ 组件设计模式展厅</h1>
      <p className="mb-6 text-sm text-gray-500">
        四种高频 React 设计模式：HOC、Render Props、受控/非受控、状态提升 —— 带交互与渲染代价直观对照。
      </p>

      {/* 1. HOC */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">1. HOC —— withLoading</h2>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={loading}
              onChange={(e) => setLoading(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            切换 loading
          </label>
        </div>
        <PostCardWithLoading
          loading={loading}
          title="React 19 新特性速览"
          summary="useActionState、useFormStatus、useOptimistic、React Compiler 编译时自动 memo……"
        />
        <p className="mt-2 text-xs text-gray-400">
          原理：高阶组件接收组件类型、返回新组件，loading=true 时不渲染被包裹内容。
        </p>
      </section>

      {/* 2. Render Props */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-800">2. Render Props —— 鼠标坐标追踪</h2>
        <MouseTracker
          render={({ x, y }) => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              <span className="rounded-md bg-gray-800 px-2 py-1 text-xs text-white">
                x={x} y={y}
              </span>
              <span className="ml-2 text-xs text-gray-400">在区域内移动鼠标查看坐标</span>
            </div>
          )}
        />
        <p className="mt-2 text-xs text-gray-400">
          原理：子组件持有状态逻辑，通过 render prop 把状态交给调用方定制渲染；与 Hooks 互为替代/补充。
        </p>
      </section>

      {/* 3. 受控 vs 非受控 */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-800">3. 受控 vs 非受控 —— 渲染代价对照</h2>
        <ControlledVsUncontrolled />
        <p className="mt-2 text-xs text-gray-400">
          考点：受控每次击键都 setState → 重渲染；非受控由 DOM 自己管理值 → 不触发渲染。
          react-hook-form 的核心原理就是「大规模非受控 + ref 批量收集」。
        </p>
      </section>

      {/* 4. 状态提升 */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-800">4. 状态提升 —— 摄氏/华氏转换</h2>
        <TemperatureConverter />
        <p className="mt-2 text-xs text-gray-400">
          考点：兄弟组件共享状态 → 提升到最近公共父组件。单一数据源：只存一方的输入，另一方通过公式推导（不重复存两份）。
        </p>
      </section>

      <ConcurrentDemo />
    </div>
  )
}
