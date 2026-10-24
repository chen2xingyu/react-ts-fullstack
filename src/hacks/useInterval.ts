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
 *
 * setTimeout vs setInterval（对比）：
 *   setTimeout 是"到点执行一次"，要周期执行需在回调里再排下一次（递归 setTimeout）；
 *   setInterval 是"每隔固定周期执行"，但不保证上次回调跑完才排下一次——
 *   若回调耗时 > delay，会出现多次回调堆叠。要严格"跑完再等 delay"用递归 setTimeout。
 *
 * 暂停 / 恢复 / 动态 delay：
 *   delay 传 null 即暂停（effect 里 if (delay===null) return，不建定时器）；
 *   再传数值即恢复。delay 变化时 effect 重跑，旧定时器被 cleanup 清掉、按新 delay 重建。
 *
 * ReturnType<typeof setTimeout>：浏览器返回 number，Node(@types/node) 返回 NodeJS.Timeout；
 *   直接写 number 在 Node 会类型报错，用 ReturnType<typeof setTimeout> 两端都成立。
 *   TS→JS：这只是类型层兼容写法，编译后 setInterval 调用本身不变。
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
