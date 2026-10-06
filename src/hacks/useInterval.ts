import { useEffect, useRef } from 'react'

/**
 * 🎯 面试考点：解决 setInterval 闭包过期问题
 *
 * 反例（会出 bug）：
 *   setInterval(() => setCount(count + 1), 1000)
 *   闭包捕获的 count 永远是定义时的初始值，setInterval 不会重设。
 *
 * 正解（回调 ref 模式，来自 Dan Abramov 的经典文章）：
 *   - 用 ref 保存最新的 callback
 *   - setInterval 只设一次（或在 delay 变化时重设），内部读 ref.current() 永远是最新闭包
 *   - 这样 callback 可以任意变化而定时器不停、不漏
 *
 * 面试追问：为什么不用 useCallback 包裹 callback？
 *   callback 依赖 state 时每次都会变，导致 interval 频繁重建（计时不准）。
 *   ref 模式解耦了"何时执行"和"执行什么"。
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  // 每次 render 都更新 ref，确保 interval 里取到的是最新 callback
  savedCallback.current = callback

  useEffect(() => {
    if (delay === null) return

    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
