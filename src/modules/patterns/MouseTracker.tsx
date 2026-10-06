import { useState, type ReactNode } from 'react'

/**
 * 🎯 面试考点：Render Props 模式
 *
 * 组件内部持有状态逻辑（这里是鼠标坐标追踪），
 * 通过名为 render（或 children 函数）的 prop 把状态「反交」给调用方决定如何渲染。
 *
 * 与 HOC 对比（面试高频追问）：
 * - HOC 在组件定义期组合（静态），render props 在渲染期组合（动态，可随 props 切换）
 * - render props 无 props 命名冲突问题，注入的数据一目了然
 * - Hooks 出现后，大多数逻辑复用场景优先写 Hook；render props 仍适合
 *  「逻辑复用 + 渲染完全由调用方定制」的场景（如 Downshift、React Motion）
 */

interface MouseTrackerProps {
  render: (pos: { x: number; y: number }) => ReactNode
  /** 容器高度（演示用） */
  height?: number
}

export default function MouseTracker({ render, height = 120 }: MouseTrackerProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 })

  return (
    <div
      data-testid="mouse-tracker"
      style={{ height }}
      className="relative w-full cursor-crosshair overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50"
      onMouseMove={(e) => {
        // 相对容器左上角坐标
        const rect = e.currentTarget.getBoundingClientRect()
        setPos({
          x: Math.round(e.clientX - rect.left),
          y: Math.round(e.clientY - rect.top),
        })
      }}
    >
      {render(pos)}
    </div>
  )
}
