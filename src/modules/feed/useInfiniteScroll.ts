import { useEffect, useRef, useCallback } from 'react'

/**
 * 无限滚动 Hook（IntersectionObserver 哨兵模式）
 *
 * 🎯 面试考点：无限滚动的两种实现
 * 1. scroll 事件 + 滚动位置计算：频繁触发、需节流、兼容差
 * 2. IntersectionObserver 哨兵：浏览器原生异步回调，性能好，推荐
 *
 * 用法：在列表底部放一个空 div，把 ref 传进来，它进入视口时触发 onLoadMore。
 *
 * 注意坑：IntersectionObserver 只在"交叉状态变化"时回调。
 * 如果加载新数据后哨兵仍在视口内（短列表/高屏幕场景），IO 不会再次触发。
 * 解决：加载完成后主动检查哨兵是否仍在视口内，是则继续触发。
 *
 * @param onLoadMore 加载下一页的回调
 * @param hasMore    是否还有更多
 * @param isLoading  当前是否加载中
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  isLoading: boolean,
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const callbackRef = useRef(onLoadMore)
  callbackRef.current = onLoadMore

  const loadingRef = useRef(isLoading)
  loadingRef.current = isLoading
  const hasMoreRef = useRef(hasMore)
  hasMoreRef.current = hasMore

  // 判断哨兵是否在视口内（含 rootMargin 提前量）
  const isInView = () => {
    const el = sentinelRef.current
    if (!el) return false
    const rect = el.getBoundingClientRect()
    return rect.top <= window.innerHeight + 200
  }

  const tryLoad = useCallback(() => {
    if (!loadingRef.current && hasMoreRef.current && isInView()) {
      callbackRef.current()
    }
  }, [])

  // 哨兵进入视口时触发
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      const handler = () => tryLoad()
      window.addEventListener('scroll', handler, { passive: true })
      return () => window.removeEventListener('scroll', handler)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) tryLoad()
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [tryLoad])

  // 🎯 关键修复：每次 loading 从 true→false（一次加载完成）后，
  // 若哨兵仍在视口内，主动触发下一次加载，避免 IO 不触发的死锁
  useEffect(() => {
    if (!isLoading) {
      // 微任务延迟，确保 DOM 已更新（新列表项已渲染，哨兵位置已下移）
      const t = setTimeout(tryLoad, 0)
      return () => clearTimeout(t)
    }
  }, [isLoading, tryLoad])

  return sentinelRef
}
