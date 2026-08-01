import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import About from '@/pages/About'
import Users from '@/pages/Users'
import Interview from '@/pages/Interview'
import Project from '@/pages/Project'
import TradingPage from '@/pages/trading/TradingPage'
import PythonRunner from '@/pages/PythonRunner'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />

        {/* 公开路由 - 任何人可访问 */}
        <Route
          path="login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />

        {/* 需登录路由 - 未登录自动跳转 */}
        <Route
          path="users"
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="interview"
          element={
            <ProtectedRoute>
              <Interview />
            </ProtectedRoute>
          }
        />
        <Route
          path="project"
          element={
            <ProtectedRoute>
              <Project />
            </ProtectedRoute>
          }
        />
        <Route
          path="trading"
          element={
            <ProtectedRoute>
              <TradingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="runner"
          element={
            <ProtectedRoute>
              <PythonRunner />
            </ProtectedRoute>
          }
        />

        <Route path="404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  )
}
