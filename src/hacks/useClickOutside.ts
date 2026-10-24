import { useEffect, useRef, type RefObject } from 'react'

/**
 * 🎯 面试考点：点击外部关闭弹层
 *
 * 实现：在 document 上监听 mousedown/touchstart，判断事件目标是否在 ref 容器内。
 * 要点：
 *   - 用 contains 做包含判断，支持嵌套元素
 *   - 监听捕获/冒泡？用默认冒泡即可
 *   - 必须在 cleanup 移除监听，否则会内存泄漏
 *
 * 面试追问：为什么用 mousedown 而不是 click？
 *   click 事件在 mousedown+mouseup 都发生在同一元素才触发。
 *   用户在弹层内按下、拖到弹层外松开 → click 不触发，mousedown 能更早响应，体验更自然。
 *
 * 事件委托：不在弹层自身绑事件，而是统一在 document 上监听一次，
 *   用 event.target.contains 判断落点——把子元素的点击冒泡到根节点统一处理，
 *   省掉 N 个监听，且弹层内部动态增删子节点也不用重绑。
 *
 * ref 回调时机：effect 在 DOM commit 之后运行，此时 ref.current 已绑定真实节点，
 *   所以在 effect 里读 ref.current 安全；不要在 render 阶段读（首次可能为 null）。
 *
 * SSR 安全：访问 document 都在 effect 内，而 effect 不跑在服务端，故 SSR 下不会因 document 未定义而崩。
 *
 * 对比 Vue：Vue 常用自定义指令 v-click-outside 在 mounted/unmounted 绑定/解绑；
 *   React 没有指令体系，用 Hook + ref 是等价写法，思路一致（document 监听 + contains 判断）。
 *
 * @param ref 容器 ref
 * @param handler 点击外部时的回调
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (e: MouseEvent | TouchEvent) => void
) {
  // 用 ref 保存 handler，避免每次 callback 变化都重新 addEventListener
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current
      if (!el || el.contains(event.target as Node)) return
      handlerRef.current(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref])
}
