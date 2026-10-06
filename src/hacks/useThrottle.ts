import { useEffect, useRef, useState } from 'react'

/**
 * 🎯 面试考点：节流 Hook（值节流版 + trailing 支持）
 *
 * 与防抖不同：节流保证在固定时间窗口内至少执行一次。
 * 这里实现"上次执行时间"方案：
 *   - leading：首次立即更新（immediate）
 *   - trailing：窗口结束时把最后一次值补上
 *
 * 实现要点：
 *   - 用 useRef 保存 lastInvoke 时间和 trailing 定时器，跨 render 持久
 *   - 必须在 cleanup 里清掉 trailing 定时器，否则组件卸载后仍会 setState 报警告
 *
 * 面试追问：leading vs trailing 怎么选？
 *   搜索框建议防抖（等用户停手）；
 *   滚动/resize 建议节流（保证窗口内一定有响应）。
 */
export function useThrottle<T>(value: T, delay = 300): T {
  const [throttled, setThrottled] = useState<T>(value)
  const lastInvoke = useRef<number>(0)
  const trailingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasMounted = useRef(false)

  useEffect(() => {
    // mount 时不消耗 leading 窗口：初始值已与 state 一致，无需更新，
    // 且 lastInvoke 保持 0，让第一次真正的 value 变化能立即触发 leading
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }

    const now = Date.now()
    const remaining = delay - (now - lastInvoke.current)

    if (remaining <= 0) {
      // 距离上次执行已超过 delay，立即更新（leading）
      if (trailingTimer.current) {
        clearTimeout(trailingTimer.current)
        trailingTimer.current = null
      }
      lastInvoke.current = now
      setThrottled(value)
    } else {
      // 窗口内，用 trailing 在窗口结束时补上最后一次值
      if (trailingTimer.current) clearTimeout(trailingTimer.current)
      trailingTimer.current = setTimeout(() => {
        lastInvoke.current = Date.now()
        setThrottled(value)
      }, remaining)
    }
  }, [value, delay])

  // 卸载时清理 trailing 定时器
  useEffect(() => {
    return () => {
      if (trailingTimer.current) clearTimeout(trailingTimer.current)
    }
  }, [])

  return throttled
}
