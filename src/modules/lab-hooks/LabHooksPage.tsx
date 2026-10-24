import {
  DebounceDemo,
  ThrottleDemo,
  PreviousDemo,
  IntervalTimeoutDemo,
  ClickOutsideDemo,
  LockBodyScrollDemo,
  LocalStorageDemo,
  MediaQueryDemo,
  IntersectionDemo,
  FetchDemo,
} from './demos'

/**
 * 🧪 M1 · Hooks 实验室
 *
 * 11 个高频面试手写 Hook 的可交互演示。每个 demo 上方有一句话说明核心考点，
 * 源码见 src/hacks/，测试见 src/hacks/__tests__/。
 *
 * 建议走读顺序：防抖/节流 → Previous → Interval/Timeout → ClickOutside/LockBodyScroll
 * → LocalStorage → MediaQuery → IntersectionObserver → Fetch（难度递增）
 */
// 🎯 as const：把数组“冻结”成字面量联合类型（h.id/h.name 成为精确字面量而非 string）。
//   TS→JS：as const 编译后完全擦除，运行时就是普通数组。
// 这里存的是【已创建好的 React 元素 <DebounceDemo />】（描述一次渲染结果的普通对象），
//   不是组件本身；后面 {h.node} 直接渲染，无需再 <DebounceDemo />。key={h.id} 是列表 diff 的稳定身份。
const HOOKS = [
  { id: 'debounce', name: 'useDebounce', node: <DebounceDemo /> },
  { id: 'throttle', name: 'useThrottle', node: <ThrottleDemo /> },
  { id: 'previous', name: 'usePrevious', node: <PreviousDemo /> },
  { id: 'interval', name: 'useInterval / useTimeout', node: <IntervalTimeoutDemo /> },
  { id: 'clickoutside', name: 'useClickOutside', node: <ClickOutsideDemo /> },
  { id: 'lockscroll', name: 'useLockBodyScroll', node: <LockBodyScrollDemo /> },
  { id: 'localstorage', name: 'useLocalStorage', node: <LocalStorageDemo /> },
  { id: 'mediaquery', name: 'useMediaQuery', node: <MediaQueryDemo /> },
  { id: 'intersection', name: 'useIntersectionObserver', node: <IntersectionDemo /> },
  { id: 'fetch', name: 'useFetch', node: <FetchDemo /> },
] as const

export default function LabHooksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* 标题 */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">🧪 Hooks 实验室</h1>
        <p className="mt-2 text-sm text-gray-500">
          11 个高频面试手写 Hook 的可交互演示。每个 demo 可直接操作，源码在{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">src/hacks/</code>，
          测试在 <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">src/hacks/__tests__/</code>。
        </p>
      </header>

      {/* 锚点导航 */}
      <nav className="mb-8 flex flex-wrap gap-2">
        {HOOKS.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:border-blue-300 hover:text-blue-600"
          >
            {h.name}
          </a>
        ))}
      </nav>

      {/* 演示区块 */}
      <div className="space-y-6">
        {HOOKS.map((h) => (
          <div key={h.id} id={h.id} className="scroll-mt-20">
            {h.node}
          </div>
        ))}
      </div>
    </div>
  )
}
