import { useEffect, useRef, useState, type RefObject } from 'react'

interface IntersectionOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
  /** 首次进入视口后是否停止观察（无限滚动底部哨兵常用 true） */
  once?: boolean
}

/**
 * 🎯 面试考点：IntersectionObserver 封装 —— 无限滚动 / 懒加载的底座
 *
 * 用 IntersectionObserver 替代 scroll 监听，性能更好（浏览器原生，不阻塞主线程）。
 *
 * 实现要点：
 *   - 把 ref 暴露给调用方绑定到目标元素
 *   - once: 第一次 isIntersecting 后 disconnect，适合"加载更多"哨兵元素
 *   - 兼容不支持 IntersectionObserver 的环境（虽然现代浏览器都支持）
 *
 * 配合 useInfiniteQuery 是 Phase 2 无限滚动的核心。
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionOptions = {}
): { ref: RefObject<T | null>; isIntersecting: boolean } {
  const { root = null, rootMargin = '0px', threshold = 0, once = false } = options
  const ref = useRef<T | null>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // 极少数旧环境不支持，直接当作"已进入"避免无限加载卡死
    if (typeof IntersectionObserver === 'undefined') {
      setIsIntersecting(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setIsIntersecting(false)
        }
      },
      { root, rootMargin, threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [root, rootMargin, threshold, once])

  return { ref, isIntersecting }
}
