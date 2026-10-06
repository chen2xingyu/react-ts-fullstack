import { useEffect, useRef } from 'react'

/**
 * 🎯 面试考点：usePrevious —— 获取上一次 render 的 props/state
 *
 * 原理：用 ref 保存"当前值"，但 ref 的更新放在 effect 里（effect 在 commit 之后执行），
 * 所以 ref.current 在本次 render 期间读到的仍是"上一次"的值。
 *
 * 时序：
 *   render(n) → commit → effect(n) 把 ref 更新为 value(n)
 *   render(n+1) 时 ref.current 仍是 value(n) → 返回上一次值
 *
 * 这是 useRef 最经典的用途之一：跨 render 保存可变数据，且不触发重渲染。
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}
