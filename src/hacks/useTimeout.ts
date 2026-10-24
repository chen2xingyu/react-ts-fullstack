import { useEffect, useRef } from 'react'

/**
 * 🎯 面试考点：useTimeout —— setTimeout 的 Hook 版（回调 ref 模式）
 *
 * 与 useInterval 同源：用 ref 始终指向最新 callback，定时器只按 delay 建立一次。
 * 这样 callback 随便变，timer 都执行"最新那份"，不会像闭包那样抓着旧回调。
 *
 * 关键点：
 *   - delay 传 null：暂停/不执行（effect 直接 return，不建 timer）；
 *   - delay 变化：cleanup 清旧 timer → 用新 delay 重排（实现"动态改时间"）；
 *   - 组件卸载：cleanup 里 clearTimeout，避免"卸载后 setState"警告与内存泄漏。
 *
 * setTimeout vs setInterval：
 *   setTimeout 只执行一次；要周期执行用 setInterval。
 *   注意 setTimeout 不会自动重复，别误把它当间隔定时器。
 *
 * ReturnType<typeof setTimeout>：浏览器 setTimeout 返回 number，
 *   Node(@types/node) 返回 NodeJS.Timeout。若要显式标注 timer 类型，用
 *   ReturnType<typeof setTimeout> 兼容两端；本文件 id 交给 TS 自动推断。
 *
 * @param callback 到期执行的回调
 * @param delay 延迟毫秒数；传 null 表示不执行
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)
  savedCallback.current = callback

  useEffect(() => {
    if (delay === null) return

    const id = setTimeout(() => savedCallback.current(), delay)
    return () => clearTimeout(id)
  }, [delay])
}
