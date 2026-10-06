import { forwardRef, useRef, useState } from 'react'
import { useRenderCount } from '../perf/useRenderCount'

/**
 * 🎯 面试考点：受控组件 vs 非受控组件
 *
 * | | 受控 | 非受控 |
 * |---|---|---|
 * | 值存哪 | React state | DOM 自身 |
 * | 读取方式 | state 直接可用 | ref.current.value |
 * | 每次击键 | setState → 重渲染 | 不重渲染 |
 * | 适用 | 即时校验/格式化/联动 | 大型表单（react-hook-form 的原理）、文件上传 |
 *
 * 本组件并排演示：左侧受控每次击键渲染计数 +1，右侧非受控渲染计数恒为 1。
 */

/** 非受控输入：defaultValue 初始化，值由 DOM 管理，通过 ref 读取 */
const UncontrolledInput = forwardRef<HTMLInputElement, { placeholder?: string }>(
  function UncontrolledInput({ placeholder }, ref) {
    return (
      <input
        ref={ref}
        defaultValue=""
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
      />
    )
  },
)

export default function ControlledVsUncontrolled() {
  const [controlled, setControlled] = useState('')
  const [snapshot, setSnapshot] = useState('')
  const uncontrolledRef = useRef<HTMLInputElement>(null)
  // 🎯 渲染计数对照：受控侧随击键增长，非受控侧不变
  const controlledRenderCount = useRenderCount()
  const uncontrolledRenderCount = useRenderCount()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* 受控 */}
      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span className="font-medium text-blue-700">受控（state 驱动）</span>
          <span data-testid="controlled-render-count">渲染 {controlledRenderCount} 次</span>
        </div>
        <input
          value={controlled}
          onChange={(e) => setControlled(e.target.value)}
          placeholder="每击键都 setState"
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        />
        <p className="mt-2 text-xs text-gray-500">
          实时值：<span data-testid="controlled-echo" className="font-mono text-gray-700">{controlled || '（空）'}</span>
        </p>
      </div>

      {/* 非受控 */}
      <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span className="font-medium text-emerald-700">非受控（ref 读取）</span>
          <span data-testid="uncontrolled-render-count">渲染 {uncontrolledRenderCount} 次</span>
        </div>
        <UncontrolledInput ref={uncontrolledRef} placeholder="击键不触发渲染" />
        <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <button
            type="button"
            onClick={() => setSnapshot(uncontrolledRef.current?.value ?? '')}
            className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
          >
            用 ref 读取
          </button>
          快照：
          <span data-testid="uncontrolled-snapshot" className="font-mono text-gray-700">{snapshot || '（未读取）'}</span>
        </p>
      </div>
    </div>
  )
}
