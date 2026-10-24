import { useWebVitals } from './useWebVitals'

/**
 * 🎯 面试考点：性能监控页
 *
 * 实时显示当前页面的 Web Vitals 指标，用颜色区分评级：
 * - 🟢 good（绿）≤ 阈值
 * - 🟡 needs-improvement（黄）
 * - 🔴 poor（红）
 *
 * 面试话术：「上线后通过 PerformanceObserver 采集 LCP/INP/CLS，
 * 页面隐藏时 sendBeacon 批量上报到 /api/v2/metrics，服务端聚合出 P75/P95。」
 */

// 🎯 为什么 Tailwind 类名要「完整写死」成对象值，而不是用模板字符串拼接？
//    Tailwind v3 的 JIT 引擎靠扫描源码里「完整类名字符串」来生成 CSS，
//    如果你写 `bg-${color}-50`，扫描器找不到这个完整 token，样式就不会被打包。
//    这是 React + Tailwind 项目最常见的「样式突然失效」坑，面试常问。
const RATING_STYLE = {
  good: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  'needs-improvement': 'bg-amber-50 border-amber-200 text-amber-700',
  poor: 'bg-red-50 border-red-200 text-red-700',
}

const RATING_LABEL = {
  good: '优秀',
  'needs-improvement': '待优化',
  poor: '差',
}

export default function MetricsPage() {
  const vitals = useWebVitals()

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">📊 Web Vitals 性能监控</h1>
      <p className="mb-6 text-sm text-gray-500">
        实时采集当前页面的 LCP / INP / CLS / FCP / TTFB，页面隐藏时 sendBeacon 批量上报到 /api/v2/metrics。
      </p>

      {/* 🎯 为什么 key 用 v.name 而不是数组下标？
          useWebVitals 内部 push 时已按 name 去重（同指标只保留最新一条），
          所以每个 name 在列表里唯一且稳定 → 用 name 做 key 既能让 React
          复用 DOM，又避免了「新数据插到前面时下标错位」导致的状态丢失。
          追问：什么场景下 index 做 key 也没问题？——列表完全静态、不排序、不插入。 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {vitals.map((v) => (
          <div
            key={v.name}
            className={`rounded-xl border p-4 ${RATING_STYLE[v.rating]}`}
            data-testid={`metric-${v.name}`}
          >
            <div className="text-xs font-medium uppercase tracking-wide opacity-75">{v.name}</div>
            <div className="mt-1 text-2xl font-bold">
              {v.value}
              <span className="text-sm font-normal">{v.unit}</span>
            </div>
            <div className="mt-1 text-xs">{RATING_LABEL[v.rating]}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-800">🎯 面试考点</h3>
        <ul className="list-disc space-y-1 pl-5 text-xs text-blue-700">
          <li>LCP 记录页面加载过程中「最大内容块」的渲染时间，会随着图片/文本加载不断更新，取最后一次</li>
          <li>INP 监听所有交互事件，取最大延迟（替代已废弃的 FID）</li>
          <li>CLS 累计意外布局偏移（排除用户输入后的偏移），越小越稳定</li>
          <li>上报用 sendBeacon：页面关闭时也能发出，不阻塞主线程，不占用 keepalive 连接配额</li>
          <li>服务端聚合：按 P75（第 75 百分位）评估，避免长尾极端值干扰</li>
          {/* 代码侧补一句：性能指标分布是「右偏长尾」（少量慢用户把均值拉高），
              用平均数会被极端值带偏；P75 代表「75% 用户 ≤ 该值」，
              是行业默认口径（CrUX 公开数据集也用 P75）。 */}
        </ul>
      </div>
    </div>
  )
}
