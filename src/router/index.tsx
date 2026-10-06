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
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  )
}
