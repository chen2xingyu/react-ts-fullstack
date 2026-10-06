import { useState, useCallback, useMemo, useEffect, useRef, Profiler, type ReactNode } from 'react'
import { NaiveRow, OptimizedRow, type RowData } from './Rows'

/**
 * 🎯 面试考点：性能对照实验室
 *
 * 左侧：朴素列表 —— 父组件任何 state 变化，1000 行全部重渲染
 * 右侧：memo + useCallback —— 父组件 render 时子行「命中缓存」直接跳过
 *
 * 让面试官看到的关键数据：render count、Profiler actualDuration
 */

function makeRows(size: number): RowData[] {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    label: `Row ${i}`,
    value: i * 3,
  }))
}

function CompareBoard({ size = 500 }: { size?: number }) {
  const [unrelated, setUnrelated] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  // 🎯 注意：Profiler 的 onRender 里不能 setState —— 那会触发新 render → 又触发 onRender → 死循环
  // 正确做法：用 ref 记录耗时，等父组件下次 render 时自然展示
  const naiveMs = useRef(0)
  const optMs = useRef(0)

  // 🎯 关键对比：内联闭包 vs useCallback
  // naiveSelect 每次 render 都创建新函数 → OptimizedRow 的 memo 会失效
  const naiveSelect = (id: number) => setSelected(id)
  // optSelect 引用稳定 → memo 命中缓存
  const optSelect = useCallback((id: number) => setSelected(id), [])

  // 🎯 items 用 useMemo 保持数组引用稳定
  const items = useMemo(() => makeRows(size), [size])

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ fontSize: 14, fontWeight: 500 }}>
          无关输入框（触发父组件 render）：
        </label>
        <input
          data-testid="perf-input"
          value={unrelated}
          onChange={(e) => setUnrelated(e.target.value)}
          placeholder="每敲一个字符，父组件 render 一次"
          style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
        <span>已选中：{selected ?? '无'}</span>
        <span>左栏最近渲染：{naiveMs.current.toFixed(1)}ms</span>
        <span>右栏最近渲染：{optMs.current.toFixed(1)}ms</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ border: '1px solid #fecaca', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#fef2f2', padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#991b1b' }}>
            ❌ 朴素版（内联闭包 + 无 memo）
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            <Profiler id="naive" onRender={(_, __, actual) => { naiveMs.current = actual }}>
              {items.map((item) => (
                <NaiveRow key={item.id} item={item} onSelect={naiveSelect} />
              ))}
            </Profiler>
          </div>
        </div>
        <div style={{ border: '1px solid #a7f3d0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#ecfdf5', padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#065f46' }}>
            ✅ 优化版（memo + useCallback + useMemo）
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            <Profiler id="optimized" onRender={(_, __, actual) => { optMs.current = actual }}>
              {items.map((item) => (
                <OptimizedRow key={item.id} item={item} onSelect={optSelect} />
              ))}
            </Profiler>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// children as prop 演示
// ============================================================
function ExpensivePanel() {
  const renders = useRef(0)
  renders.current += 1
  return (
    <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
        昂贵面板（子组件）
      </div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>
        渲染次数：<strong data-testid="panel-renders">{renders.current}</strong>
        <br />
        即使外层 Ticker 每秒更新，我也不会重渲染。
      </div>
    </div>
  )
}

function Ticker({ children }: { children: ReactNode }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div style={{ border: '1px solid #bfdbfe', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ background: '#eff6ff', padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#1e40af' }}>
        ⏱ Ticker（每秒 +1 触发 render）：{seconds}s
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  )
}

/**
 * 🎯 面试考点：children as prop 为什么能避免重渲染？
 * Ticker 的 children 是在父组件（PerfPage）里创建的 React Element，
 * Ticker 自己 render 时只是「把同一个 element 引用放回去」，
 * React 对相同 element 引用会 bailout，不再执行 ExpensivePanel 的函数体。
 */
function ChildrenDemo() {
  return (
    <Ticker>
      <ExpensivePanel />
    </Ticker>
  )
}

export default function PerfPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>⚡ 性能实验室</h1>
      <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: 14 }}>
        同一列表「朴素 vs 优化」双栏对照；看渲染次数和 Profiler 耗时。
      </p>
      <div style={{ margin: '0 0 20px', padding: '10px 14px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, fontSize: 12, color: '#3730a3' }}>
        ℹ️ 开发模式 <code>React.StrictMode</code> 会「双调用」组件函数（用来暴露副作用），
        所以初始计数可能是 2 而不是 1；<strong>关注「增长趋势」而非绝对值</strong>：
        朴素版每敲一个字符都在涨，优化版基本不涨。生产构建（npm run build）下计数精确。
      </div>

      <CompareBoard size={500} />

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>🧱 children as prop</h2>
      <ChildrenDemo />

      <div style={{ marginTop: 24, padding: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
        <strong>🎯 面试话术总结：</strong>
        <br />
        1. memo 失效的两个最常见原因：props 是内联对象/函数、上游每次 render 新建数组。
        <br />
        2. useCallback/useMemo 不是「越多越好」，它们本身也有内存和比较成本；只有当子组件真的因为引用变化而重渲染时才值得用。
        <br />
        3. children as prop 是比 memo 更便宜的优化手段，适合「外壳组件内部有频繁 state 更新」的场景。
      </div>
    </div>
  )
}
