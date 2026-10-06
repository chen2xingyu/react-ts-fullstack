import { useEffect, useState } from 'react'

/**
 * 🎯 面试考点：前端性能监控（Web Vitals）
 *
 * 采集三大核心指标：
 * - LCP（Largest Contentful Paint）最大内容渲染时间 —— 衡量加载速度
 * - INP（Interaction to Next Paint）交互到下一次绘制 —— 衡量交互响应
 * - CLS（Cumulative Layout Shift）累计布局偏移 —— 衡量视觉稳定性
 *
 * 加分项：FCP（首次内容绘制）、TTFB（首字节时间）
 *
 * 采集原理：PerformanceObserver 监听对应 entryType；
 * 上报策略：页面隐藏时（visibilitychange）用 navigator.sendBeacon 批量发送，
 * 避免阻塞主线程、避免页面关闭时请求丢失。
 */

export interface WebVital {
  name: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB'
  value: number
  /** 评级：good / needs-improvement / poor */
  rating: 'good' | 'needs-improvement' | 'poor'
  /** 单位：ms 或 无单位（CLS） */
  unit: string
}

const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000], // good ≤2.5s, poor >4s
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
}

function rate(name: string, value: number): WebVital['rating'] {
  const [good, poor] = THRESHOLDS[name] ?? [0, 0]
  if (value <= good) return 'good'
  if (value <= poor) return 'needs-improvement'
  return 'poor'
}

/**
 * 采集并上报 Web Vitals
 * @param reportUrl 上报地址，默认 /api/v2/metrics
 */
export function useWebVitals(reportUrl = '/api/v2/metrics') {
  const [vitals, setVitals] = useState<WebVital[]>([])

  useEffect(() => {
    // 环境守卫：jsdom / 老浏览器无 PerformanceObserver，直接跳过采集
    if (typeof PerformanceObserver === 'undefined') return
    const collected: WebVital[] = []
    const push = (v: WebVital) => {
      collected.push(v)
      setVitals((prev) => {
        const next = prev.filter((item) => item.name !== v.name)
        return [...next, v].sort((a, b) => a.name.localeCompare(b.name))
      })
    }

    // 1. LCP：监听 largest-contentful-paint，取最后一条（页面加载过程中 LCP 会更新）
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
      push({ name: 'LCP', value: Math.round(last.startTime), rating: rate('LCP', last.startTime), unit: 'ms' })
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

    // 2. FCP：paint 类型里的 first-contentful-paint
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          push({ name: 'FCP', value: Math.round(entry.startTime), rating: rate('FCP', entry.startTime), unit: 'ms' })
        }
      }
    })
    paintObserver.observe({ type: 'paint', buffered: true })

    // 3. CLS：layout-shift 累计（排除用户输入后的偏移）
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
        if (!e.hadRecentInput) {
          clsValue += e.value ?? 0
        }
      }
      push({ name: 'CLS', value: Math.round(clsValue * 1000) / 1000, rating: rate('CLS', clsValue), unit: '' })
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })

    // 4. INP：监听 event 类型，取最大交互延迟（近似）
    let maxInp = 0
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { duration?: number }
        const duration = e.duration ?? 0
        if (duration > maxInp) {
          maxInp = duration
          push({ name: 'INP', value: Math.round(maxInp), rating: rate('INP', maxInp), unit: 'ms' })
        }
      }
    })
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit)

    // 5. TTFB：navigation entry
    const navObserver = new PerformanceObserver((list) => {
      const nav = list.getEntries()[0] as PerformanceNavigationTiming
      if (nav) {
        const ttfb = nav.responseStart
        push({ name: 'TTFB', value: Math.round(ttfb), rating: rate('TTFB', ttfb), unit: 'ms' })
      }
    })
    navObserver.observe({ type: 'navigation', buffered: true })

    // 页面隐藏时上报（sendBeacon 保证页面关闭也能发出）
    const report = () => {
      if (collected.length === 0) return
      const payload = JSON.stringify({ vitals: collected, url: location.pathname, ts: Date.now() })
      navigator.sendBeacon(reportUrl, new Blob([payload], { type: 'application/json' }))
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') report()
    })

    return () => {
      lcpObserver.disconnect()
      paintObserver.disconnect()
      clsObserver.disconnect()
      inpObserver.disconnect()
      navObserver.disconnect()
    }
  }, [reportUrl])

  return vitals
}
