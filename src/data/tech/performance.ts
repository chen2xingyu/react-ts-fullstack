import { TechPoint } from './types'

export const performancePoints: TechPoint[] = [
  {
    id: 'web-vitals',
    category: '性能优化',
    depth: 'implementation',
    title: 'Web Vitals 指标有哪些？LCP、FID、CLS 分别衡量什么？如何优化？',
    summary:
      'Core Web Vitals 是 Google 衡量用户体验的核心指标：LCP 衡量加载性能，FID 衡量交互响应，CLS 衡量视觉稳定性。优化需要从加载、交互、布局三方面入手。',
    answer: `## Core Web Vitals
### LCP (Largest Contentful Paint) - 加载性能
- **衡量**：主要内容（最大元素）何时渲染完成
- **目标**：< 2.5s（good）/ < 4s（needs improvement）/ > 4s（poor）
- **优化**：
  - 预加载关键资源（<link rel="preload">）
  - 优化图片大小和格式
  - 使用 CDN 加速静态资源
  - 减少首屏 JS 体积

### FID (First Input Delay) → INP (Interaction to Next Paint) - 交互响应
- **衡量**：用户首次交互到浏览器响应的时间
- **目标**：< 100ms（good）/ < 300ms（needs improvement）/ > 300ms（poor）
- **优化**：
  - 拆分长任务（使用 setTimeout/requestIdleCallback）
  - 减少主线程阻塞
  - 使用 Web Worker 处理计算密集任务
  - 代码分割，按需加载

### CLS (Cumulative Layout Shift) - 视觉稳定性
- **衡量**：元素意外移动的累积偏移
- **目标**：< 0.1（good）/ < 0.25（needs improvement）/ > 0.25（poor）
- **优化**：
  - 预留图片/视频尺寸占位
  - 避免在渲染后插入内容
  - 使用 transition 替代位置突变
  - 为动态内容预留固定空间`,
    code: `// 使用 web-vitals 库采集指标
import { onLCP, onFID, onCLS } from 'web-vitals'

onLCP(metric => {
  console.log('LCP:', metric.value, metric.url)
  // 发送到监控系统
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({ name: 'LCP', value: metric.value }),
  })
})

onFID(metric => console.log('FID:', metric.value))
onCLS(metric => console.log('CLS:', metric.value))

// 预加载关键资源
// <link rel="preload" href="/hero.jpg" as="image" />
// <link rel="preconnect" href="https://api.example.com" />

// 代码分割
const HeavyComponent = lazy(() => import('./HeavyComponent'))

// Web Worker 处理计算
const worker = new Worker('./calculator.js')
worker.postMessage({ data: largeArray })
worker.onmessage = (e) => console.log(e.data)`,
    links: [
      { title: 'Web Vitals 优化完全指南 - 掘金', url: 'https://juejin.cn/post/6952883719878174734', site: '掘金' },
      { title: 'Core Web Vitals 官方文档 - Google', url: 'https://web.dev/vitals/', site: '其他' },
      { title: '性能指标详解 - 知乎', url: 'https://zhuanlan.zhihu.com/p/340957998', site: '知乎' },
    ],
  },
  {
    id: 'code-splitting',
    category: '性能优化',
    depth: 'implementation',
    title: '代码分割（Code Splitting）有哪些方式？React.lazy、动态 import、路由级分割怎么用？',
    summary:
      '代码分割将代码按模块拆分，按需加载。方式包括：路由级分割、组件级分割、第三方库分离、动态 import。React.lazy + Suspense 实现优雅的加载体验。',
    answer: `## 代码分割方式

### 1. 路由级分割（推荐优先使用）
- 每个路由生成独立 chunk
- 用户只加载当前路由的代码
- 使用 React.lazy + Suspense

### 2. 组件级分割
- 按组件粒度分割
- 适合大组件（如图表、编辑器）
- 使用 dynamic import

### 3. 第三方库分离
- 将 react/lodash 等打包为 vendor chunk
- 利用浏览器缓存，减少重复下载
- 使用 splitChunks 配置

### 4. 动态 import
- 按需加载模块
- 适合条件加载的功能
- 返回 Promise

## Vite 自动代码分割
Vite/Rollup 默认自动：
- 动态 import 的模块自动分离
- node_modules 自动分离
- 可通过 manualChunks 自定义`,
    code: `// 1. 路由级分割
import { lazy, Suspense } from 'react'
const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Suspense>
  )
}

// 2. 组件级分割
const Chart = lazy(() => import('./components/Chart'))

function Dashboard() {
  const [show, setShow] = useState(false)
  return (
    <Suspense fallback={<Skeleton />}>
      {show && <Chart />}
    </Suspense>
  )
}

// 3. 动态 import
async function loadModule() {
  const module = await import('./heavy-module')
  module.doSomething()
}

// 4. Vite 自定义分割
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          utils: ['lodash-es', 'dayjs'],
        },
      },
    },
  },
})`,
    links: [
      { title: '代码分割最佳实践 - 掘金', url: 'https://juejin.cn/post/3497134447257359964', site: '掘金' },
      { title: 'React 代码分割指南 - React 官方', url: 'https://react.dev/reference/react/lazy', site: '其他' },
    ],
  },
  {
    id: 'perf-realtime-kline',
    category: '性能优化',
    depth: 'principle',
    title: '实时 K 线图如何高效渲染？首根 setData、后续 update 的区别是什么？',
    summary:
      'lightweight-charts 用 Canvas 绘制，首根 kline 用 setData 建立时间轴避免蜡烛落不可见区间，后续同分钟 update 更新最后一根、跨分钟 update 追加。ResizeObserver 自适应。',
    answer: `## 实时 K 线渲染的难点
1. **高频更新**：每秒一个 tick，同分钟内不断更新最后一根蜡烛
2. **时间轴建立**：空图直接 update，蜡烛可能落在未建立的时间区间看不见
3. **跨分钟切换**：新分钟要追加新蜡烛，不能覆盖旧根
4. **性能**：不能用 React state 驱动每帧重绘，否则卡顿

## 为什么用 lightweight-charts 而非 ECharts/自绘
- **lightweight-charts**：TradingView 出品，专为金融 K 线优化，Canvas 绘制，万级数据点流畅
- ECharts：通用图表库，K 线场景下体积大、过度封装
- 自绘 Canvas：灵活但工作量大（坐标轴/缩放/十字光标都要自己写）

## setData vs update 的关键区别
- **setData(数组)**：全量替换数据，重建时间轴，O(n)。首次必须用它建立时间轴
- **update(单根)**：增量更新，若时间戳已存在则更新该根，不存在则追加，O(1)

## 本项目的 bootstrap 策略
历史 K 线接口可能返回空（Python 只发 Redis 不落 MySQL）：
1. \`hasDataRef = false\` 时收到实时 kline → \`setData([candle])\` 建立时间轴 + fitContent
2. \`hasDataRef = true\` 后 → \`update(candle)\` 增量更新最后一根/追加新根
3. 切标的 → \`setData([])\` 清空 + 重置 hasDataRef，等新标的首根重建

## 性能要点
- 图表实例存 useRef，不进 React state，避免重渲染
- ResizeObserver 监听容器宽度变化，applyOptions 自适应
- time 不能回退，update 异常时 catch 忽略
- 卸载时 chart.remove() 释放 Canvas 内存`,
    code: `// 首根 bootstrap：建立时间轴
useEffect(() => {
  if (!kline || !seriesRef.current) return
  const candle = toCandle(kline)
  if (!hasDataRef.current) {
    // 空图首根：setData 建立时间轴，否则蜡烛落在不可见区间
    seriesRef.current.setData([candle])
    hasDataRef.current = true
    chartRef.current?.timeScale().fitContent()
  } else {
    // 后续：update 增量（同分钟更新末根，跨分钟追加）
    seriesRef.current.update(candle)
    chartRef.current?.timeScale().scrollToRealTime()
  }
}, [kline])

// 自适应宽度：ResizeObserver
const ro = new ResizeObserver(() => {
  if (containerRef.current) {
    chart.applyOptions({ width: containerRef.current.clientWidth })
  }
})
ro.observe(containerRef.current)`,
    links: [
      { title: 'lightweight-charts 实时数据更新 - 掘金', url: 'https://juejin.cn/post/6844904199708950536', site: '掘金' },
      { title: 'Canvas K 线图性能优化 - 知乎', url: 'https://zhuanlan.zhihu.com/p/40242267', site: '知乎' },
    ],
  },
]
