import { useEffect, useState } from 'react'

/**
 * 🎯 面试考点：防抖 Hook
 *
 * 经典实现：值变化后等待 delay，期间再次变化则重置计时。
 * 关键点：setTimeout 的返回值是 NodeJS.Timeout | number（浏览器/Node 不同），
 *   用 ReturnType<typeof setTimeout> 兼容两端。清理函数会在依赖变化或卸载时执行。
 *
 * 闭包陷阱：effect 里读取的是当前 value（每次渲染的快照），符合预期；
 *   cleanup 里的 timer 也是当次 render 产生的闭包变量，正确。
 *
 * 防抖 vs 节流（高频对比，必背）：
 *   防抖 debounce：连续触发只在"停下来 delay 后"执行一次（等最后一次）。
 *     场景：搜索输入、表单校验、resize 结束后重算布局。
 *   节流 throttle：固定窗口 delay 内最多执行一次（保证有节奏地响应）。
 *     场景：滚动加载、拖拽、按钮防连点。
 *   口诀：防抖"等停"，节流"定时"。
 *   leading/trailing：防抖默认 trailing（停后触发）；leading 版则"首次立即触发、后续抖动被吞"，
 *     适合防重复提交。
 *
 * 追问：防抖里 value 为什么不会过期（闭包快照）？
 *   每次 value 变化都会重跑 effect，effect 闭包捕获的是"本次渲染的 value"，
 *   timer 到期时 setDebounced(value) 写的就是这一闭包里的最新值；
 *   旧 timer 在 cleanup 里被 clearTimeout 清掉，不会用旧 value 覆盖。
 *   反例：若把 setTimeout 只在挂载时注册一次，闭包就会永远抓着第一次的 value。
 *
 * @param value 要防抖的值
 * @param delay 等待毫秒数
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value)
    }, delay)
    // 依赖变化 → cleanup 先清旧 timer → 再建新 timer，这是防抖的本质
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
