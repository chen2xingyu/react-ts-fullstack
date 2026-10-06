import { memo } from 'react'
import { useRenderCount } from './useRenderCount'

export interface RowData {
  id: number
  label: string
  value: number
}

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
 */
export function NaiveRow({ item, onSelect }: RowProps) {
  const renders = useRenderCount()
  return (
    <div
      data-testid={`naive-row-${item.id}`}
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
