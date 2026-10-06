import { useCallback, useEffect, useState } from 'react'

/**
 * 🎯 面试考点：useLocalStorage —— 泛型 + 容错 + 跨标签同步
 *
 * 设计要点：
 *   1. 泛型 <T>，与 useState 同 API
 *   2. 懒初始化（lazy initializer）：只在首次 render 读 localStorage
 *   3. JSON.parse 容错：存储损坏时回退到初始值，不白屏
 *   4. 跨标签页同步：监听 storage 事件，其他标签改了这里跟着变
 *   5. SSR 安全：typeof window 判断（虽然 Vite 一般跑浏览器，但作为通用库的习惯）
 *
 * 面试追问：useState(() => 初始值) 为什么能避免每次 render 都读 localStorage？
 *   lazy initializer 只在首次 render 执行，后续 render 忽略。
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch (error) {
      // 存储损坏（如被手动改坏）时降级，不影响主流程
      console.warn(`[useLocalStorage] parse "${key}" failed:`, error)
      return initialValue
    }
  }, [key, initialValue])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  // 对外暴露的 setter：同时更新 state 和 localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value
        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch (error) {
          // 配额满或隐私模式：state 仍更新（内存态），localStorage 写入失败仅告警
          console.warn(`[useLocalStorage] set "${key}" failed:`, error)
        }
        return next
      })
    },
    [key]
  )

  // 跨标签页同步：其他标签页修改同一 key 时，本页也更新
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T)
        } catch {
          setStoredValue(initialValue)
        }
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [key, initialValue])

  return [storedValue, setValue]
}
