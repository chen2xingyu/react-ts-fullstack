import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * 路由守卫 - 大厂标准权限控制
 * 
 * 未登录时自动跳转到登录页，登录后返回原页面
 * 已登录用户访问登录页时自动跳转到首页
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    // 保存当前路径，登录成功后返回
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

/**
 * 已登录用户专用路由守卫
 * 防止已登录用户重复访问登录/注册页
 */
export function GuestRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
