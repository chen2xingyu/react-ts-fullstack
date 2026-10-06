import type { ComponentType } from 'react'

/**
 * 🎯 面试考点：HOC（高阶组件）
 *
 * 定义：接收组件、返回新组件的【纯函数】，用于横切逻辑复用（鉴权/埋点/加载态）。
 *
 * 考点细节：
 * 1. 泛型 `P extends object` —— 被包裹组件的 props 类型不丢失（写错会编译报错）
 * 2. HOC 不能在 render 里动态创建：每次渲染生成新组件类型 → React 卸载重挂整棵子树
 * 3. 约定 displayName，方便 React DevTools 调试
 * 4. 局限：props 命名冲突、ref 不透传（需 forwardRef 额外处理）、嵌套地狱
 *    → 现代 React 优先 Hooks，HOC 适合「给已有组件无侵入包一层」的场景
 */

export interface WithLoadingProps {
  /** true 时渲染加载占位，不渲染被包裹组件 */
  loading?: boolean
}

export function withLoading<P extends object>(Wrapped: ComponentType<P>) {
  function WithLoading({ loading, ...props }: P & WithLoadingProps) {
    if (loading) {
      return (
        <div role="status" className="flex items-center gap-2 py-4 text-sm text-gray-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
          加载中…
        </div>
      )
    }
    // HOC 内部透传剩余 props；as P 是因为 TS 无法推导 rest 排除 loading 后的类型
    return <Wrapped {...(props as P)} />
  }
  // 面试加分：displayName 约定
  WithLoading.displayName = `withLoading(${Wrapped.displayName || Wrapped.name || 'Component'})`
  return WithLoading
}
