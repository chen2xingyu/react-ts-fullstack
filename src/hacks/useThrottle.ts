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
 *
 * 两种经典实现差异（追问常考）：
 *   ① 时间戳版（本文件）：记录 lastInvoke，到点立即 leading 执行，零定时器；
 *      但窗口内的最后一次值要用额外的 trailing 定时器补上。
 *   ② 定时器版：用 timer 锁住窗口，到点执行后再开下一个，结构简单、天然偏 trailing，
 *      但每次都要挂一个定时器。
 *   取舍：纯 leading 用时间戳最省；需要 trailing 精确补末帧时常两者结合（如本文件）。
 *
 * 防抖 vs 节流对照（高频背诵）：
 *   | 维度 | 防抖 debounce       | 节流 throttle        |
 *   | 触发 | 停止后只执行一次    | 每个窗口至多执行一次 |
 *   | 响应 | 慢但更省            | 有节奏、更及时       |
 *   | 场景 | 搜索/校验/resize    | 滚动/拖拽/高频按钮   |
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
