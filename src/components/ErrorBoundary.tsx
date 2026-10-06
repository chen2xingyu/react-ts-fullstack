import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** 自定义降级 UI；不传用默认 */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

/**
 * 🎯 面试考点：错误边界（Error Boundary）
 *
 * 为什么必须是 class 组件？
 * - React 只给 class 生命周期提供了 getDerivedStateFromError / componentDidCatch，
 *   函数组件目前没有等价 Hook（React 19 依然如此）。
 *
 * 能捕获什么：渲染期错误、生命周期错误、构造函数错误（含懒加载 chunk 加载失败）。
 * 不能捕获：事件回调里的错误（自己 try/catch）、异步错误、SSR 错误。
 *
 * 懒加载场景：发布新版后旧 chunk 哈希失效，用户还停在旧页面一点路由就会
 * ChunkLoadError，生产惯例是捕获后刷新一次页面（下方已处理）。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 生产环境这里应上报到监控平台（Sentry / 自建日志）
    console.error('[ErrorBoundary] 捕获到渲染错误:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    // 懒加载 chunk 失效（发新版后常见）：自动刷新一次
    if (isChunkLoadError(error)) {
      window.location.reload()
      return null
    }

    if (this.props.fallback) return this.props.fallback(error, this.reset)

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="text-4xl">💥</div>
        <h2 className="text-xl font-semibold text-gray-800">页面开小差了</h2>
        <p className="max-w-md text-sm text-gray-500 break-words">{error.message}</p>
        <div className="flex gap-3">
          <button
            onClick={this.reset}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            重试
          </button>
          <button
            onClick={() => window.location.assign('/')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            回首页
          </button>
        </div>
      </div>
    )
  }
}

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i.test(
      error.message,
    )
  )
}
