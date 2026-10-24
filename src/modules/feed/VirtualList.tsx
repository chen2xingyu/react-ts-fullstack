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
 *
 * 🎯 面试考点：为什么一次性渲染 1000 条会卡？
 * 不是"数据多"本身慢，而是 DOM 节点爆炸：每条 item 至少生成 3~5 个真实节点，
 * 1000 条 = 数千个节点，浏览器要为每个节点做布局(layout)、绘制(paint)、
 * 图层合成；滚动时还要不断重排(reflow)。虚拟列表把 DOM 节点数从 O(n) 降到
 * O(可视区条数+缓冲)，与总条数无关——这是它的本质。
 *
 * 🎯 面试考点：占位 vs 绝对定位的两种撑高方案
 * - 本文件用「一个撑高的父 div（height = n*itemHeight）+ 子项绝对定位」：
 *   滚动条高度由父 div 撑起，子项 top 用 realIndex*itemHeight 精确归位；
 *   列表不随滚动跳动；代价是子项全部脱离文档流，需自己算 top。
 * - 另一种是「上/下 padding 占位」：渲染区用普通流，顶部 padding 模拟滚走的
 *   高度、底部 padding 补足剩余高度。两种殊途同归。
 *
 * 🎯 面试考点：动态行高（进阶追问）
 * 固定行高才能直接 scrollTop/itemHeight 整除出索引。行高不定时：
 *   1. 维护一张「索引→已测量高度」的缓存 Map；
 *   2. 未测量过的先用预估高度（如均值）占位，真实渲染后用
 *      ResizeObserver 测高并回写缓存、修正总高度；
 *   3. 定位索引用「前缀和 + 二分查找」代替除法（累计高度 >= scrollTop 的
 *      第一个索引），O(log n)。生产库 react-virtual / tanstack-virtual 已封装。
 *
 * 🎯 面试考点：虚拟列表 vs 懒加载 vs 无限滚动（常被追问区别）
 * - 懒加载/无限滚动：数据分批到达，DOM 越攒越多，只解决"首屏快"，
 *   长会话后 DOM 仍会膨胀；
 * - 虚拟列表：数据一次性全在内存，DOM 恒定，解决"超长列表滚动流畅"。
 *   二者可组合（本目录 FeedPage 就是：无限滚动分页 + 单页内虚拟列表演示）。
 *
 * 🎯 TS→JS：泛型 <T> 完全擦除
 * 编译后 VirtualList 就是普通函数，T、VirtualListProps<T> 全部消失；
 * items/renderItem 的类型约束只在开发期帮你检查，运行时不做任何校验。
 * （对比：zod 的运行时校验才会留在产物里。）
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
  // 🎯 scrollTop 必须用 state 而不是 ref：startIndex/endIndex 依赖它计算，
  // 只有 state 变化触发重渲染，可视窗口才会重新切片；用 ref 改值页面不会更新。
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // useCallback 保持回调引用稳定，避免每次渲染重建 onScroll；
  // 生产级还应在其外加 requestAnimationFrame 节流（scroll 事件每秒可触发数十次），
  // 本演示直接 setState——React 18 会自动批处理连续的 scroll 更新。
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // 可视区能放下几条：ceil 保证底部不满一行也占满
  const visibleCount = Math.ceil(height / itemHeight)
  // 🎯 核心换算：scrollTop ÷ itemHeight = 滚过了"几行"；
  // Math.max(0, ...) 防止顶部时算出负索引；-buffer 向上多渲染缓冲，
  // 快速滚动时缓冲区先于可视区就位，避免白屏闪烁。
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
  // endIndex 夹在 items.length 内，防止切片越界；buffer*2 = 上下各留 buffer 条
  const endIndex = Math.min(
    items.length,
    startIndex + visibleCount + buffer * 2,
  )

  // 只切出窗口内 + 缓冲的那一小段；useMemo 避免 items 引用未变时重复切片
  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  )

  return (
    // position:relative 作为定位上下文，让子项的 absolute top 相对它计算
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height, overflow: 'auto', position: 'relative' }}
    >
      {/* 撑高占位：总高度 = 条数 × 行高 —— 滚动条长度完全由这个 div 撑起，
          与"实际渲染了几条"无关，这是滚动条始终正确的关键 */}
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          // slice 出来的 i 是窗口内局部下标，必须加回 startIndex 还原全局下标，
          // 否则 top 定位、key 都会错
          const realIndex = startIndex + i
          return (
            // 🎯 key 用 realIndex（稳定位置）而非 i：窗口滚动后同一条 item
            // 的 realIndex 不变，React 能复用 DOM；若用 i，上下缓冲切换时
            // 节点会被频繁销毁重建，滚动卡顿。
            <div
              key={realIndex}
              style={{
                position: 'absolute',
                // top = 全局下标 × 行高：把每条钉回它在"完整列表"里的位置
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
