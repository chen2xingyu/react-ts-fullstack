import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

/**
 * 🎯 面试考点：嵌套路由与 <Outlet/>（路由“占位出口”）
 * - 对照 router/index.tsx：<Route path="/" element={<Layout/>}> 下面挂了一堆子 Route。
 *   访问 /about 时，父路由渲染 Layout，子路由 <About/> 就渲染在 Layout 里 <Outlet/> 的位置。
 * - 与 Vue 对比：<Outlet/> ≈ Vue Router 的 <router-view/>；父 route 的 children ≈ Vue 的 children 配置。
 * - 意义：Navbar/Footer 这种“每个页面都有”的壳只需写一次，切子路由时壳不重渲染，只换出口内容。
 * - 易错点：Outlet 只是“出口”，自己不渲染任何额外 DOM；忘了写它，子路由就“静默不显示”且不报错。
 */
export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-gray-500 text-sm">
        React + TypeScript + Vite - 主流技术栈工程
      </footer>
    </div>
  )
}
