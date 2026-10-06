import { useEffect, useRef } from 'react'

/**
 * useTimeout —— setTimeout 的 Hook 版，与 useInterval 同源（回调 ref 模式）。
 * 延迟到指定时间后执行 callback；delay 变化或组件卸载时自动清理。
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
