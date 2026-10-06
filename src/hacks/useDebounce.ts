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
