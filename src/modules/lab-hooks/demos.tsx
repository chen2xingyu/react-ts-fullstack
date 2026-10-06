import { useState, useRef, type ReactNode } from 'react'
import {
  useDebounce,
  useThrottle,
  usePrevious,
  useInterval,
  useTimeout,
  useClickOutside,
  useLockBodyScroll,
  useLocalStorage,
  useMediaQuery,
  useIntersectionObserver,
  useFetch,
} from '@/hacks'

/* ============================================================
 * 每个 Demo 是一个独立的小组件，演示一个 Hook 的真实使用场景
 * 顶部 <Note> 是说明文字的样式容器
 * ============================================================ */

function DemoCard({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 leading-relaxed">{desc}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/* ---------- 1. useDebounce ---------- */
export function DebounceDemo() {
  const [input, setInput] = useState('')
  const debounced = useDebounce(input, 600)
  return (
    <DemoCard
      title="useDebounce · 防抖搜索"
      desc="输入后停 600ms 才会更新下方的“真实查询”，模拟搜索框防抖。期间输入会被丢弃。"
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="在这里输入，下面的值 600ms 后才跟上"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="mt-3 text-sm">
        <div>输入值：<span className="font-mono text-blue-600">{input || '(空)'}</span></div>
        <div>防抖后：<span className="font-mono text-emerald-600">{debounced || '(空)'}</span></div>
      </div>
    </DemoCard>
  )
}

/* ---------- 2. useThrottle ---------- */
export function ThrottleDemo() {
  const [pos, setPos] = useState(0)
  const throttled = useThrottle(pos, 1000)
  return (
    <DemoCard
      title="useThrottle · 节流拖动"
      desc="拖动滑块，下方“节流值”每 1 秒最多更新一次（leading 立即 + trailing 补最后一帧）。"
    >
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="w-full"
      />
      <div className="mt-2 text-sm">
        <div>原始值：<span className="font-mono text-blue-600">{pos}</span></div>
        <div>节流值：<span className="font-mono text-emerald-600">{throttled}</span></div>
      </div>
    </DemoCard>
  )
}

/* ---------- 3. usePrevious ---------- */
export function PreviousDemo() {
  const [count, setCount] = useState(0)
  const prev = usePrevious(count)
  return (
    <DemoCard
      title="usePrevious · 记住上一次的值"
      desc="点击按钮，观察“上一次值”是如何延迟一拍更新的。原理是 ref 在 effect（commit 后）里才更新。"
    >
      <button
        onClick={() => setCount((c) => c + 1)}
        className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
      >
        加一
      </button>
      <div className="mt-3 text-sm">
        <div>当前值：<span className="font-mono text-blue-600">{count}</span></div>
        <div>上一次值：<span className="font-mono text-amber-600">{prev ?? '（无）'}</span></div>
      </div>
    </DemoCard>
  )
}

/* ---------- 4. useInterval + useTimeout ---------- */
export function IntervalTimeoutDemo() {
  const [count, setCount] = useState(0)
  const [running, setRunning] = useState(true)
  // 经典用法：倒计时/轮询。delay 可随时改、可暂停（null）
  useInterval(() => setCount((c) => c + 1), running ? 1000 : null)

  const [flash, setFlash] = useState(false)
  useTimeout(() => setFlash(false), flash ? 1500 : null)

  return (
    <DemoCard
      title="useInterval / useTimeout · 解决闭包过期"
      desc="计数器每秒 +1，可暂停。回调 ref 模式保证 interval 内部永远拿到最新闭包。闪烁按钮演示 setTimeout。"
    >
      <div className="flex items-center gap-4 text-sm">
        <div>计数器：<span className="font-mono text-blue-600">{count}</span></div>
        <button
          onClick={() => setRunning((r) => !r)}
          className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200"
        >
          {running ? '暂停' : '继续'}
        </button>
        <button
          onClick={() => setFlash(true)}
          className={`rounded px-3 py-1 ${flash ? 'bg-amber-400 text-white' : 'bg-gray-100'}`}
        >
          {flash ? '闪烁中…' : '点我闪 1.5s'}
        </button>
      </div>
    </DemoCard>
  )
}

/* ---------- 5. useClickOutside ---------- */
export function ClickOutsideDemo() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))
  return (
    <DemoCard
      title="useClickOutside · 点击外部关闭弹层"
      desc="点击按钮打开下拉，再点击下拉外部（任意空白处）即可关闭。用 mousedown 监听。"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white"
      >
        {open ? '已打开' : '打开下拉'}
      </button>
      {open && (
        <div
          ref={ref}
          className="mt-2 w-48 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
        >
          下拉内容 · 点外面关闭
        </div>
      )}
    </DemoCard>
  )
}

/* ---------- 6. useLockBodyScroll ---------- */
export function LockBodyScrollDemo() {
  const [locked, setLocked] = useState(false)
  useLockBodyScroll(locked)
  return (
    <DemoCard
      title="useLockBodyScroll · 弹层锁定背景滚动"
      desc="打开开关后 body 滚动被锁定（overflow:hidden），关闭时还原。打开状态下尝试滚动页面。"
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
        锁定 body 滚动
      </label>
    </DemoCard>
  )
}

/* ---------- 7. useLocalStorage ---------- */
export function LocalStorageDemo() {
  const [name, setName] = useLocalStorage<string>('lab.hooks.name', '')
  return (
    <DemoCard
      title="useLocalStorage · 持久化 + 跨标签同步"
      desc="输入的名字会写入 localStorage，刷新页面仍在。打开两个标签页修改，另一页会同步更新（storage 事件）。"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="你的名字（持久化保存）"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="mt-2 text-sm text-gray-500">
        localStorage 值：<span className="font-mono text-emerald-600">{name || '(空)'}</span>
      </div>
    </DemoCard>
  )
}

/* ---------- 8. useMediaQuery ---------- */
export function MediaQueryDemo() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isDark = useMediaQuery('(prefers-color-scheme: dark)')
  return (
    <DemoCard
      title="useMediaQuery · JS 感知响应式断点"
      desc="调整浏览器窗口宽度或切换系统深色模式，下面的值会实时变化。"
    >
      <ul className="text-sm space-y-1">
        <li>是否桌面端（≥1024px）：<span className="font-mono text-blue-600">{String(isDesktop)}</span></li>
        <li>系统深色模式：<span className="font-mono text-blue-600">{String(isDark)}</span></li>
      </ul>
    </DemoCard>
  )
}

/* ---------- 9. useIntersectionObserver ---------- */
export function IntersectionDemo() {
  const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    rootMargin: '0px',
    threshold: 0.5,
  })
  return (
    <DemoCard
      title="useIntersectionObserver · 进入视口检测"
      desc="滚动让下方色块进入视口一半时，状态变为 true。这是无限滚动哨兵元素的原理。"
    >
      <div className="text-sm">当前状态：<span className="font-mono text-blue-600">{String(isIntersecting)}</span></div>
      <div className="mt-3 h-32 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3">
        <div className="h-40" />
        <div
          ref={ref}
          className={`flex h-24 items-center justify-center rounded text-white ${
            isIntersecting ? 'bg-emerald-500' : 'bg-gray-400'
          }`}
        >
          {isIntersecting ? '✅ 我进入视口一半了' : '⬇️ 滚动让我进入视口'}
        </div>
        <div className="h-40" />
      </div>
    </DemoCard>
  )
}

/* ---------- 10. useFetch ---------- */
export function FetchDemo() {
  const [keyword, setKeyword] = useState('')
  // 真实的 GitHub 用户搜索 API，演示请求状态机 + 竞态
  const { status, data, error, refetch } = useFetch<{ items: Array<{ id: number; login: string }> }>(
    keyword ? `https://api.github.com/search/users?q=${encodeURIComponent(keyword)}&per_page=5` : '',
    { immediate: false }
  )

  return (
    <DemoCard
      title="useFetch · 请求状态机 + 竞态处理"
      desc="输入用户名并搜索。快速切换关键词时，旧请求会被 AbortController 取消，不会覆盖新结果。"
    >
      <div className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="GitHub 用户名，如 react"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={refetch}
          disabled={!keyword || status === 'loading'}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {status === 'loading' ? '搜索中…' : '搜索'}
        </button>
      </div>
      <div className="mt-3 text-sm">
        {status === 'idle' && <span className="text-gray-400">输入关键词后点搜索</span>}
        {status === 'loading' && <span className="text-blue-500">加载中…</span>}
        {status === 'error' && <span className="text-red-500">错误：{error?.message}</span>}
        {status === 'success' && (
          <ul className="list-disc pl-5">
            {data?.items.slice(0, 5).map((u) => (
              <li key={u.id} className="font-mono">{u.login}</li>
            ))}
          </ul>
        )}
      </div>
    </DemoCard>
  )
}
