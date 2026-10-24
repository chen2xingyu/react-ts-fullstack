import { useRef } from 'react'

/**
 * 🎯 面试考点：渲染计数器
 * 用 ref 在 render 期间 +1，把「这行渲染了几次」直接显示在 DOM 上。
 * 这是面试现场演示 memo 是否生效的最直观手段（ref 改动不触发额外渲染）。
 *
 * 常见追问 1：为什么不用 useState(0) 然后 setState(r=>r+1)？
 *   因为 setState 会触发下一次 render → 又执行本 Hook → 又 setState，
 *   直接陷入「渲染-计数-渲染」死循环，页面卡死。ref 是「副作用旁通道」，
 *   写它不调度渲染，天然安全。
 *
 * 常见追问 2：StrictMode 下为什么初始计数是 2？
 *   开发模式 React 会故意把组件函数调用两遍（detect 副作用不纯），
 *   ref.current 也跟着 +2。生产构建只有一次，所以读数看「增量趋势」不看绝对值。
 *
 * 易错点：在 render 期间直接写 ref 是官方允许的（类似 useRef 惰性初始化模式），
 *   但禁止在 render 期间写「其他组件」的 ref 或调用 setState —— 那会破坏渲染纯度。
 */
export function useRenderCount() {
  const renders = useRef(0)
  // 🎯 注意：这行在「每次 render 执行函数体」时都跑一遍，不是只在挂载时跑。
  //    memo 命中时 React 直接 bailout、根本不执行函数体，所以计数器自然不涨——
  //    这正是本实验的观测信号。
  renders.current += 1
  return renders.current
}
