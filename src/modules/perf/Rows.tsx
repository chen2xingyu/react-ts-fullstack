import { memo } from 'react'
import { useRenderCount } from './useRenderCount'

// 🎯 TS→JS 说明：interface / type 纯类型声明，编译后被完全擦除，
//    产物里看不到 RowData。这也是为什么「运行时拿不到类型做校验」，
//    运行时校验要靠 zod / runtypes 这类带 runtime schema 的库。
//    正误对比：
//    ✅ if (typeof item.label === 'string')  —— 运行时只能查「值的形态」
//    ❌ if (item instanceof RowData)        —— 编译直接报错，类型不存在
export interface RowData {
  id: number
  label: string
  value: number
}

// 🎯 onSelect: (id: number) => void 是函数类型签名，同样编译后擦除；
//    它约束的是「传进来的回调必须收一个 number、返回值无所谓」。
interface RowProps {
  item: RowData
  onSelect: (id: number) => void
}

// ============================================================
// 朴素版：不加任何优化
// ============================================================
/**
 * 🎯 父组件每次 render → 所有子行跟着 render。
 * 即使 item/onSelect 内容没变，React 默认也是「重新执行函数组件」。
 *
 * 原理：React 的渲染模型是「自上而下、无条件级联」——父组件函数体重新执行，
 *   返回的新 JSX 里子组件 element 被重建，React 就顺着往下执行子组件函数体。
 *   没有任何「props 没变就自动跳过」的默认优化，这全是开发者要自己加 memo 的原因。
 *   （对比 Vue：Vue2 的 reactive 粒度更新是组件级，模板编译出的 vnode diff 只 patch 变化的 DOM；
 *    React 没有响应式系统兜底，靠的是「 Fiber reconcile + 开发者手动 memo」。）
 */
export function NaiveRow({ item, onSelect }: RowProps) {
  const renders = useRenderCount()
  return (
    <div
      data-testid={`naive-row-${item.id}`}
      // 🎯 追问：这里的内联箭头函数 onClick={() => onSelect(item.id)} 会不会让 memo 失效？
      //    对本组件（未 memo）没有影响；但如果哪天把 NaiveRow 也 memo 化，
      //    这个每次 render 新建的函数引用同样会让 memo 白包——
      //    「内联 handler 必须 useCallback」是 memo 优化的连锁要求。
      onClick={() => onSelect(item.id)}
      style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
    >
      <span>{item.label}</span>
      <span style={{ color: renders > 1 ? '#ef4444' : '#9ca3af' }}>
        渲染 {renders} 次
      </span>
    </div>
  )
}

// ============================================================
// 优化版：React.memo
// ============================================================
/**
 * 🎯 面试考点：memo 生效的两个前提
 * 1. props 是原始值，或引用稳定（onSelect 必须 useCallback）
 * 2. item 对象引用稳定（上游不要每次 render 都新建对象/数组）
 * 缺任何一个，memo 都是「白包」——这也是面试最常追的点。
 *
 * 原理追问：memo 内部到底怎么比较？
 *   React.memo(Component) 等价于对前后两次 props 做浅比较（shallowEqual）：
 *   逐 key 比较 Object.is(prev[key], next[key])。
 *   【正】item 是同一个对象引用 → 命中；onSelect 是同一个函数引用 → 命中。
 *   【误】父组件 render 时 {...item} 展开成新对象 → 即使字段全相同，引用不同 → 失效。
 *
 * 进阶追问 1：item 嵌套了一层，只想比较 item.id 怎么办？
 *   memo 第二参传入自定义比较函数：
 *   memo(Row, (prev, next) => prev.item.id === next.item.id && prev.onSelect === next.onSelect)
 *   注意：比较函数返回 true 表示「跳过 render」，语义和 shouldComponentUpdate 相反，易错。
 *
 * 进阶追问 2：children 作为 prop 传进来，memo 还能命中吗？
 *   不能。children 也是 props，内联 JSX 每次 render 都是新 element。
 *   解法正是 PerfPage 里演示的「children as prop」模式，或把 children 提升到父组件构造。
 *
 * 代价追问：memo 越多越好吗？
 *   不是。浅比较本身要遍历 props；对于渲染极便宜的叶子组件，
 *   「比较成本 > 重渲染成本」，加 memo 反而更慢。经验法则：只 memo「大列表行 / 昂贵视图」。
 */
export const OptimizedRow = memo(function OptimizedRow({ item, onSelect }: RowProps) {
  const renders = useRenderCount()
  return (
    <div
      data-testid={`opt-row-${item.id}`}
      onClick={() => onSelect(item.id)}
      style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
    >
      <span>{item.label}</span>
      <span style={{ color: renders > 1 ? '#f59e0b' : '#10b981' }}>
        渲染 {renders} 次
      </span>
    </div>
  )
})
