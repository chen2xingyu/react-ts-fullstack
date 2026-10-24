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

// 🎯 阈值不是随便拍的，全部来自 W3C Web Vitals 官方标准（2024 版）：
//   LCP  good ≤2.5s / poor >4s；INP good ≤200ms / poor >500ms（2024-03 替代 FID）；
//   CLS  good ≤0.1 / poor >0.25；FCP good ≤1.8s；TTFB good ≤800ms。
//   面试追问「为什么是这些数？」——依据是「用户能否感知」：
//   200ms 约等于人眼分辨不出「延迟」，所以 INP 卡 200ms；CLS 0.1 约等于
//   一次不超过半个按钮大小的位移。
// TS 细节：Record<string, [number, number]> 是「字符串键 → 二元数值元组」的映射类型，
//   编译后是普通对象，元组 [number, number] 类型完全擦除，运行时就是个数组。
const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000], // good ≤2.5s, poor >4s
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
}

// 🎯 三档评级逻辑：≤good 优秀、good~poor 待优化、>poor 差。
//    注意实际 RUM 平台（如 web-vitals.js）上报时用的是「本次会话采样」而非单次值，
//    最终服务端按 P75 分位给出该指标的「代表性结论」。
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
    // 🎯 追问 1：为什么取「最后一条」而不是第一条/最大一条？
    //   LCP 的定义是「视口内最大内容元素完成渲染的时间点」，加载过程中这个「最大元素」
    //   可能从 H1 换成 hero 图再换成延迟加载的大图，浏览器每次都会发一个新 entry，
    //   且一旦用户开始交互（滚动/点击）就停止上报。所以「最后一条」才是最终 LCP。
    // 🎯 追问 2：buffered: true 是什么意思？
    //   我们注册 observer 时，LCP 可能已经发生过了（脚本加载晚于页面渲染）。
    //   buffered:true 让浏览器把「注册前的历史 entry」补发一遍，否则首屏 LCP 会漏采。
    // 🎯 TS→JS：as PerformanceEntry & { startTime: number } 是类型断言，
    //   告诉编译器「这个对象上有 startTime」；编译后整句被擦除，运行时只是个普通对象。
    //   （PerformanceEntry 基类本身就有 startTime，这里的断言更多是演示「扩展类型」的写法。）
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
    // 🎯 追问：hadRecentInput 为什么要排除？
    //   用户主动点「加载更多」导致的位移是「预期内」的，不该算稳定性问题；
    //   只有用户没操作、元素自己突然挪位置（字体闪烁、图片没设宽高、广告异步插入）
    //   才算 CLS。这是大厂面试最爱追问的细节。
    // 🎯 追问：CLS 为什么没有单位？它不是毫秒，而是「影响分数」——
    //   位移距离 × 视口影响面积，所以阈值是 0.1 / 0.25 这种小数。
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
    // 🎯 追问 1：durationThreshold: 16 是什么？
    //   只上报「持续时间 ≥16ms」的事件，过滤掉鼠标移动这类高频噪音；
    //   16ms ≈ 一帧（1000/60），低于一帧的交互用户基本无感。
    // 🎯 追问 2：为什么这里是「近似」而非标准 INP？
    //   标准 INP 要按「会话窗口（最长 5s 交互、10s 静默切窗）」分组并取 P99，
    //   本演示简化为「取所有事件里 duration 最大值」。生产环境直接用
    //   web-vitals.js 库（Google 官方）即可，不建议自己造。
    // 🎯 追问 3：INP 和已废弃的 FID 有什么区别？
    //   FID 只测「第一次点击」的输入延迟，采样率极低、不代表整页交互体验；
    //   INP 观测全程所有交互，取「最坏那次」，更贴近真实感受。
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
    // 🎯 追问 1：为什么不用 fetch / axios？
    //   页面卸载时主线程已经停了，普通 fetch 会被一起掐掉，数据丢失；
    //   navigator.sendBeacon 把请求交给浏览器「后台低优先级队列」，
    //   即使页面立刻关闭也保证发出去，且不阻塞下一导航。
    // 🎯 追问 2：为什么要在 visibilitychange=hidden 时上报，不能等 onload？
    //   INP/CLS 是「全程累计」指标，只有用户真正离开页面时才有最终值，
    //   此时 hidden 是最可靠的采样点（unload/pagehide 在 Safari 已不可靠）。
    // 🎯 追问 3：这和 RUM（Real User Monitoring）什么关系？
    //   RUM = 真实用户监控，和「合成监控（Synthetic，机器模拟点击）」相对。
    //   Web Vitals 采集就是 RUM 的前端埋点层：每个真实用户上报自己的指标，
    //   服务端按 P75 聚合 → 得到「75% 的用户体验 ≤ 该值」的业务结论。
    const report = () => {
      if (collected.length === 0) return
      const payload = JSON.stringify({ vitals: collected, url: location.pathname, ts: Date.now() })
      // 🎯 注意：sendBeacon 的第二个参数必须是 Blob/FormData，
      //   直接传 JSON 字符串会被当成「text/plain」且不预检，
      //   包成 Blob 并声明 application/json 才能让网关正确解析。
      navigator.sendBeacon(reportUrl, new Blob([payload], { type: 'application/json' }))
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') report()
    })

    // 🎯 cleanup：组件卸载时必须 disconnect 所有 observer，
    //   否则回调闭包会继续持有 collected/push 引用 → 内存泄漏；
    //   也会导致开发模式 StrictMode 双挂载时上报两次数据。
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
