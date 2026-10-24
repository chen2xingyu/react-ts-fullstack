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
  // 🎯 面试考点：ref 镜像最新回调（latest-ref 模式）：把 onLoadMore/hasMore/isLoading
  // 存进 ref 并在每次渲染时同步 .current。下面 tryLoad 因此能用 useCallback([])
  // 既拿到最新值、又不把这些 prop 放进依赖数组——否则 effect 会因 onLoadMore
  // 引用变化反复 disconnect/observe，甚至"刚加载完又触发"的抖动。
  const callbackRef = useRef(onLoadMore)
  callbackRef.current = onLoadMore

  const loadingRef = useRef(isLoading)
  loadingRef.current = isLoading
  const hasMoreRef = useRef(hasMore)
  hasMoreRef.current = hasMore

  // 判断哨兵是否在视口内（含 rootMargin 提前量）；
  // getBoundingClientRect 是同步布局读取，这里仅在触发路径上调用一次，开销可忽略
  const isInView = () => {
    const el = sentinelRef.current
    if (!el) return false
    const rect = el.getBoundingClientRect()
    return rect.top <= window.innerHeight + 200
  }

  // 🎯 面试考点：请求竞态 / 防重入的三重闸门
  // 1. !loadingRef.current —— 上一页还在请求中就拒绝再发（防重复触发、防并发竞态）；
  // 2. hasMoreRef.current —— 后端告知"没有更多"后永久停止，不再观察；
  // 3. isInView() —— 哨兵确实进入可视区（含 200px 提前量）才加载。
  // 注意 loading 标志应由"发起请求的那一层"置位（本组件从外部 isLoading prop 读）；
  // 卸载或 hasMore=false 后 observer 自然不再回调，无需手动 disconnect 列表。
  const tryLoad = useCallback(() => {
    if (!loadingRef.current && hasMoreRef.current && isInView()) {
      callbackRef.current()
    }
  }, [])

  // 哨兵进入视口时触发
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    // 降级方案：环境无 IO（SSR 检测/极老浏览器）时退回 scroll 监听；
    // passive:true 让浏览器不等 handler 就滚，保证滚动流畅（passive 里不能 preventDefault）
    if (typeof IntersectionObserver === 'undefined') {
      const handler = () => tryLoad()
      window.addEventListener('scroll', handler, { passive: true })
      return () => window.removeEventListener('scroll', handler)
    }

    // 🎯 rootMargin:'200px' = 视口向下扩 200px 才算"交叉"：用户还没滚到底、
    // 距底部还有 200px 时就提前请求下一页，加载无感（预加载）。
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) tryLoad()
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    // cleanup 必须 disconnect：组件卸载/依赖变化时释放观察，防内存泄漏
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
