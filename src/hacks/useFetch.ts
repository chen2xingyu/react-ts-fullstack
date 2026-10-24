import { useEffect, useRef, useState } from 'react'

/**
 * 🎯 面试考点：请求状态机（discriminated union）+ AbortController 竞态处理
 *
 * 状态用判别联合类型，TypeScript 能在 switch(status) 后精确收窄 data/error 类型，
 * 避免 "data 可能是 undefined" 的困扰。
 *
 * 竞态处理：
 *   - 每次 url 变化创建新的 AbortController，发请求前 abort 上一个
 *   - 用 ref 标记"本次请求是否还有效"，防止过期请求的 setState 覆盖新结果
 *
 * 面试追问：AbortController vs 全局请求 id 计数器？
 *   - AbortController 是浏览器原生，能真正取消网络请求（省带宽）
 *   - 请求 id 只忽略过期响应，请求已发出且返回了
 *   - 最好两者结合：abort 取消 + ref 忽略双重保险
 *
 * 竞态具体场景（必懂）：url 快速从 A 切到 B，A 的请求却后返回。
 *   若不处理，A 的旧数据会晚到、覆盖 B 的新数据（界面闪回旧内容）。
 *   这里 url 一变就 abort 旧 controller，A 的 await 直接抛 AbortError 被静默吞掉，
 *   绝不可能再 setState——aborted 判断就是这道闸门。
 *
 * 状态机 / 类型收窄（TS→JS）：
 *   FetchState 是判别联合（discriminated union），靠 status 这个字面量字段做"判别键"，
 *   于是 if/switch(status==='success') 后 TS 能把 data 精确收窄成 T。
 *   编译后这些联合类型、T 泛型全部擦除，运行时只是普通对象 { status, data, error }。
 *   末尾 eslint-disable-next-line react-hooks/exhaustive-deps 是有意为之：
 *   靠 url 变化驱动重新请求，不把 init/runFetch 放进依赖，避免 init 引用抖动导致重复发请求。
 */
export type FetchState<T> =
  | { status: 'idle'; data: undefined; error: undefined }
  | { status: 'loading'; data: T | undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: T | undefined; error: Error }

interface UseFetchOptions {
  /** 是否立即发请求（默认 true）；false 时需手动 refetch */
  immediate?: boolean
  /** 请求初始化参数 */
  init?: RequestInit
}

export function useFetch<T>(url: string, options: UseFetchOptions = {}) {
  const { immediate = true, init } = options
  const [state, setState] = useState<FetchState<T>>({
    status: 'idle',
    data: undefined,
    error: undefined,
  })

  // 保存最新的 abort controller，新请求到来时取消旧请求
  const abortControllerRef = useRef<AbortController | null>(null)

  const runFetch = async (abortSignal: AbortSignal) => {
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }))
    try {
      const res = await fetch(url, { ...init, signal: abortSignal })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = (await res.json()) as T
      // 组件可能已卸载或请求已被 abort，避免 setState 报警告
      if (!abortSignal.aborted) {
        setState({ status: 'success', data, error: undefined })
      }
    } catch (err) {
      // abort 不算错误，静默忽略
      if ((err as Error).name === 'AbortError') return
      if (!abortSignal.aborted) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err : new Error(String(err)),
        }))
      }
    }
  }

  useEffect(() => {
    if (!immediate) return
    // 取消上一次未完成的请求
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    runFetch(controller.signal)

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, immediate])

  // 手动重新请求（搜索场景用）
  const refetch = () => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    runFetch(controller.signal)
  }

  return { ...state, refetch }
}
