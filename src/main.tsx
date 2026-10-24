import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

// 🎯 面试考点：React Query 的全局默认配置（服务端状态缓存策略）
// QueryClient 是 React Query 的“全局缓存中枢”，Provider 注入后整棵树都能用 useQuery 读同一份缓存。
// staleTime: 60_000 —— 数据在 60s 内视为“新鲜”（stale=false），组件重挂载/窗口聚焦都不会重新请求；
//   0（默认）则一挂载就视为过期。对比 Vue：相当于 VueQuery 的 staleTime，区别于本地状态缓存。
// refetchOnWindowFocus: false —— 关掉“切回窗口自动重拉”的默认行为（生产常因无谓请求被吐槽）。
// retry: 1 —— 失败自动重试 1 次；注意 React Query 对 4xx（除 408/429）默认不重试，只有网络错误/5xx 才重试。
// 易错点：staleTime 只决定“要不要重拉”，数据从 mount 起就渲染（缓存优先）；它不做“缓存多久后清空”，
//   真正丢弃由 gcTime（旧称 cacheTime，默认 5 分钟）控制。
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

/**
 * 🎯 面试考点：React 18 根节点挂载 createRoot vs 旧版 ReactDOM.render
 *
 * 为什么 18 起必须用 createRoot：
 * - 旧版 ReactDOM.render( el, document.getElementById('root') ) 在 18 已废弃（控制台警告）。
 * - createRoot 开启并发渲染（Concurrent）能力：自动 batching（所有状态更新合并成一次渲染）、
 *   可中断渲染、Suspense 支持。render 同步递归挂载，享受不到这些。
 * - 它返回独立根实例，卸载用 root.unmount()，不再是 ReactDOM.unmountComponentAtNode。
 *
 * document.getElementById('root')! —— 非空断言（TS 语法，编译后整段擦除）：
 *   意为“我保证 #root 存在”。若 public/index.html 里没这个节点，运行时会在 null 上 .render 直接报错，
 *   断言只是骗过编译器、不做运行时保护。TS→JS：! 不产生任何运行时代码。
 *
 * 组件包裹顺序（从外到内）= 依赖注入顺序，内层要用外层 Provider 的能力：
 *   StrictMode(开发期检查) → QueryClientProvider(缓存) → BrowserRouter(路由上下文) → App。
 *
 * 🎯 面试考点：StrictMode 的作用（只在开发模式生效，生产构建自动剥离）
 * - 它【不会】改变渲染输出，纯粹是开发期“严格检查器”。
 * - 关键行为：把组件函数体、某些 useEffect 在挂载时【故意调用两次】（mount→unmount→再 mount），
 *   用来暴露“不干净的副作用”——比如 effect 里发请求不做 cleanup/去重，双调用就会发两次，你当场就能发现。
 * - 顺带检查：过时 API、意外的副作用、setState 于卸载组件等。
 * - 追问：“为什么我 effect 里请求发了两次？”—— 99% 是 StrictMode 开发期双调用，不是 bug；
 *   生产 build 里只跑一次。但它逼你写正确的 effect（幂等、可清理），这正是它的目的。
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
