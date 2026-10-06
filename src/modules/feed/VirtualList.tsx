import { useState, useRef, useCallback, useMemo, type ReactNode } from 'react'

/**
 * 手写简版虚拟列表
 *
 * 🎯 面试考点：虚拟列表（Virtual Scrolling）核心思想
 * 长列表（1000+ 条）一次性渲染会导致 DOM 节点爆炸、滚动卡顿。
 * 虚拟列表只渲染"可视区域 + 少量缓冲"的节点，用一个撑高的占位 div
 * 模拟总高度，通过 transform 定位每条 item。
 *
 * 关键公式：
 *   startIndex = Math.floor(scrollTop / itemHeight) - buffer
 *   endIndex   = startIndex + visibleCount + buffer * 2
 *   offsetY    = startIndex * itemHeight  （当前渲染区的起始 Y）
 *
 * 这里是固定高度版本（最简单）；不定高版本需要预测量或预估+修正。
 */
interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  height: number
  buffer?: number
  renderItem: (item: T, index: number) => ReactNode
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  buffer = 5,
  renderItem,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const visibleCount = Math.ceil(height / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
  const endIndex = Math.min(
    items.length,
    startIndex + visibleCount + buffer * 2,
  )

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  )

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height, overflow: 'auto', position: 'relative' }}
    >
      {/* 撑高占位：总高度 = 条数 × 行高 */}
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const realIndex = startIndex + i
          return (
            <div
              key={realIndex}
              style={{
                position: 'absolute',
                top: realIndex * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              {renderItem(item, realIndex)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
