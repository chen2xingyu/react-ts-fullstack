import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * 🎯 面试考点：受保护路由（前端路由守卫）—— 它是 UX，不是安全
 *
 * 实现套路：条件渲染 + <Navigate>（声明式重定向，等价于 useNavigate 编程式跳转）。
 * - <Navigate to="/login" state={{ from: location }} replace />：
 *   未登录时，把“用户原本想去的地址”塞进路由 state 一起带给登录页；登录成功后读 state.from 回跳。
 *   replace 表示不留历史记录（否则用户后退会再次触发守卫，陷入 登录↔目标页 死循环）。
 *
 * 高频追问（必背，大厂最爱问）：
 * Q: 前端路由守卫能真正拦住未授权访问吗？
 * A: 不能。它只是“体验层”——没登录就别进页面、别白屏。真正的安全在【后端】：
 *    每个接口都要校验 token/权限，前端哪怕绕过守卫直接发请求，后端也必须 401/403。
 *    口诀：前端守卫防“误进”，后端鉴权防“真拿数据”。
 * Q: state 里存 from 会不会丢？
 * A: 存在 history state 里，F5 刷新当前登录页不丢；但直接新开标签页到 /login 就没有 from，
 *    所以登录页要给兜底默认值（见 Login.tsx 的 || '/'）。
 * Q: 权限粒度（普通用户/管理员）怎么做？
 * A: 这里只判“登录与否”；更细就从 store 读 roles/permissions，按 role 决定渲染哪条子树。
 *
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
 * 已登录用户专用路由守卫（GuestRoute，与 ProtectedRoute 互逆）
 * 防止已登录用户重复访问登录/注册页 —— 已登录还去 /login 直接踢回首页，
 * 对应 router 里 <GuestRoute><Login/></GuestRoute> 的用法。
 * 对照 Vue：相当于路由守卫里的 to.meta.public + next() 拦截。
 */
export function GuestRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
