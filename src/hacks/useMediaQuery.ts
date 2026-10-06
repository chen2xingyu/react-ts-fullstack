import { useEffect, useState } from 'react'

/**
 * 🎯 面试考点：useMediaQuery —— 响应式断点的 JS 感知
 *
 * 用 window.matchMedia 监听媒体查询，返回 boolean。
 * SSR 安全：typeof window 检查，避免服务器端渲染时报错。
 *
 * 面试追问：和 CSS media query 比什么时候用 JS 版？
 *   - 需要根据视口切换组件逻辑（如移动端用抽屉、桌面用侧边栏）时
 *   - CSS 只处理样式，JS 版处理行为
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = (): boolean => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  }

  const [matches, setMatches] = useState<boolean>(getMatches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handleChange = () => setMatches(mql.matches)

    handleChange() // 确保首次和最新状态一致
    // Safari < 14 不支持 addEventListener，用 addListener 兜底
    if (mql.addEventListener) {
      mql.addEventListener('change', handleChange)
      return () => mql.removeEventListener('change', handleChange)
    }
    mql.addListener(handleChange)
    return () => mql.removeListener(handleChange)
  }, [query])

  return matches
}
