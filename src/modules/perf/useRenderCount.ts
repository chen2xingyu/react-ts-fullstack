import { useRef } from 'react'

/**
 * 🎯 面试考点：渲染计数器
 * 用 ref 在 render 期间 +1，把「这行渲染了几次」直接显示在 DOM 上。
 * 这是面试现场演示 memo 是否生效的最直观手段（ref 改动不触发额外渲染）。
 */
export function useRenderCount() {
  const renders = useRef(0)
  renders.current += 1
  return renders.current
}
