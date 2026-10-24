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
 *
 * 为什么不能用普通局部变量？
 *   组件每次 render 都是一次独立的函数调用，局部变量会被重建为初始值，跨 render 留不住；
 *   useRef 在组件整个生命周期内持有同一个对象（挂在 Fiber 节点上），所以能跨 render 保留。
 *
 * render 阶段 vs 副作用阶段读 ref（易错点）：
 *   本 Hook 在 render 阶段 return ref.current，此时它还是"上一次"的值——这正是目的；
 *   若把 ref.current = value 也放在 render 阶段（而非 effect），同一轮 render 内就把 ref 改了，
 *   读到的会是当前值而非上一次，逻辑立刻错乱。
 *   即：读可以在 render 期，写（基于提交后的状态/DOM）要放 effect。
 *
 * TS→JS：useRef<T | undefined>(undefined) 编译后就是个普通 { current: undefined } 对象，
 *   泛型 T 被擦除，ref 不带来任何运行时类型保证。
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}
