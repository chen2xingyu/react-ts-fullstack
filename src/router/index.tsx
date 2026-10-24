import { lazy, Suspense, type ReactElement } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute'

/**
 * 🎯 面试考点：路由级代码分割（Code Splitting）
 *
 * React.lazy + 动态 import() 让每个页面打成独立 chunk，首屏只加载当前页，
 * 构建产物里能看到 dist/assets/TradingPage-xxxx.js 这样的分包。
 * Suspense fallback 负责 chunk 加载中的占位；ErrorBoundary 负责加载失败兜底。
 */
const Home = lazy(() => import('@/pages/Home'))
const About = lazy(() => import('@/pages/About'))
const Users = lazy(() => import('@/pages/Users'))
const Tech = lazy(() => import('@/pages/Tech'))
const Project = lazy(() => import('@/pages/Project'))
const TradingPage = lazy(() => import('@/pages/trading/TradingPage'))
const PythonRunner = lazy(() => import('@/pages/PythonRunner'))
const Login = lazy(() => import('@/pages/Login'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const LabHooks = lazy(() => import('@/modules/lab-hooks/LabHooksPage'))
const FeedPage = lazy(() => import('@/modules/feed/FeedPage'))
const PostDetailPage = lazy(() => import('@/modules/feed/PostDetailPage'))
const KanbanPage = lazy(() => import('@/modules/kanban/KanbanPage'))
const TypeLabPage = lazy(() => import('@/modules/type-lab/TypeLabPage'))
const PerfPage = lazy(() => import('@/modules/perf/PerfPage'))
const PatternsPage = lazy(() => import('@/modules/patterns/PatternsPage'))
const ArchPage = lazy(() => import('@/modules/arch/ArchPage'))
const MetricsPage = lazy(() => import('@/modules/metrics/MetricsPage'))
const SecurityPage = lazy(() => import('@/modules/security/SecurityPage'))

function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
      <span className="ml-3 text-sm">页面加载中…</span>
    </div>
  )
}

/** 单页守卫：每页一个 Suspense + ErrorBoundary，错误隔离，切路由自动重置 */
function guard(el: ReactElement) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>{el}</Suspense>
    </ErrorBoundary>
  )
}

/**
 * 🎯 面试考点补强：声明式路由 <Routes>/<Route> 结构（本工程用的是这套，不是 createBrowserRouter）
 * - <Routes> 是“路由匹配器”：从上到下找第一个 path 命中的 <Route> 渲染其 element，命中即停（排他）。
 * - 嵌套：父 <Route path="/" element={<Layout/>}> 不写 index 时，匹配 / 后把子路由渲染进 Layout 的 <Outlet/>。
 *   子 Route 的 path 是【相对路径】（如 "about"，不要写 "/about"），拼出来就是 /about。
 * - <Route index>：“索引路由”——访问父路径 / 本身时渲染（不指定就 Outlet 空着），对应 Vue 的默认子路由。
 * - path="*"：通配兜底。这里不直接渲染 404 组件，而是 <Navigate to="/404" replace/> 重定向到真实 /404 页；
 *   好处是地址栏统一显示 /404，刷新/分享不会因路径怪而二次 404。
 * - 与 Vue Router 对比：v6 的 <Route children> ≈ Vue 的 children；守卫组件 <ProtectedRoute>
 *   替代 Vue 里 router.beforeRouteEnter 全局守卫（React 是“组件化”思维，把守卫包成布局/元素）。
 * - 版本追问：v6.4+ 推荐 createBrowserRouter + RouterProvider（数据路由 loader/action）；
 *   本工程仍是经典的 <Routes> 声明式，面试说清两者关系即可：都是 v6，前者主打数据获取集成。
 */
export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={guard(<Home />)} />
        <Route path="about" element={guard(<About />)} />

        {/* 🧪 面试实验室 - 公开路由，无需登录 */}
        <Route path="lab/hooks" element={guard(<LabHooks />)} />
        <Route path="lab/feed" element={guard(<FeedPage />)} />
        <Route path="lab/feed/:id" element={guard(<PostDetailPage />)} />
        <Route path="lab/kanban" element={guard(<KanbanPage />)} />
        <Route path="lab/types" element={guard(<TypeLabPage />)} />
        <Route path="lab/perf" element={guard(<PerfPage />)} />
        <Route path="lab/patterns" element={guard(<PatternsPage />)} />
        <Route path="lab/arch" element={guard(<ArchPage />)} />
        <Route path="lab/metrics" element={guard(<MetricsPage />)} />
        <Route path="lab/security" element={guard(<SecurityPage />)} />

        {/* 公开路由 - 任何人可访问 */}
        <Route
          path="login"
          element={
            <GuestRoute>
              {guard(<Login />)}
            </GuestRoute>
          }
        />

        {/* 需登录路由 - 未登录自动跳转 */}
        <Route
          path="users"
          element={
            <ProtectedRoute>{guard(<Users />)}</ProtectedRoute>
          }
        />
        <Route
          path="tech"
          element={
            <ProtectedRoute>{guard(<Tech />)}</ProtectedRoute>
          }
        />
        <Route
          path="project"
          element={
            <ProtectedRoute>{guard(<Project />)}</ProtectedRoute>
          }
        />
        <Route
          path="trading"
          element={
            <ProtectedRoute>{guard(<TradingPage />)}</ProtectedRoute>
          }
        />
        <Route
          path="runner"
          element={
            <ProtectedRoute>{guard(<PythonRunner />)}</ProtectedRoute>
          }
        />

        <Route path="404" element={guard(<NotFound />)} />
        {/* 兜底：任何未命中路径都重定向到 /404；放在最后因为 Routes 是“首个命中即停” */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  )
}
