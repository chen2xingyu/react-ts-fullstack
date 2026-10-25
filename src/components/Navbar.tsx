import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { logout as apiLogout } from '@/api/auth'

/**
 * 🎯 面试考点：NavLink 与“激活态”样式
 * - <NavLink> 比 <Link> 多了一个能力：知道自己是否匹配当前 URL。传 className 时可以给一个
 *   函数 ({ isActive }) => string，React Router 会在当前路由匹配/失配时重新调用，自动高亮。
 * - 对照 Vue：<RouterLink> 默认加 .router-link-active / .router-link-exact-active 两个类；
 *   React 没有内置类，要自己用 isActive 函数映射样式（更显式、无魔法类名）。
 * - 易错点（active 匹配是“前缀匹配”）：to="/" 会让【所有】页面都命中 active；
 *   这里首页用单独的 Logo NavLink、且链接都是精确子路径，才没暴露问题。
 *   真要精确匹配写 className={({isActive,isPending})=>...} 或加 end 属性。
 * - 代码分割挂载点：这些 NavLink 只是声明 to="/lab/hooks"，真正的页面 chunk 在 router/index.tsx
 *   用 React.lazy 动态 import —— 点击时才下载对应 chunk（首屏不带这一大坨 lab 页面代码）。
 *
 * Zustand 选择器用法：useAuthStore((s) => s.isAuthenticated) —— 只订阅我关心的那一小片 state，
 * 该片变化才重渲染，避免整 store 一变就重渲染整个导航栏。
 */
export default function Navbar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-primary-600 ${
      isActive ? 'text-primary-600' : 'text-gray-600'
    }`

  const handleLogout = async () => {
    // 🎯 安全考点：先通知服务端「吊销 refresh token + 清 httpOnly Cookie」，再清本地。
    // 只清内存的话，Cookie 还在浏览器里，换新标签页/重新打开仍能静默刷新出登录态，
    // 「退出登录」就不彻底。网络失败也要继续本地登出（用户意图优先），所以 catch 后不阻断。
    try {
      await apiLogout()
    } catch {
      /* 服务端不可达/已过期：本地照常登出 */
    }
    logout()
    // replace:true —— 退出后用历史记录替换当前项，用户点“浏览器后退”不会又回到需要登录的页
    // （那会被守卫再弹回登录页，形成尴尬循环）。这是登出/登录跳转的标准做法。
    navigate('/', { replace: true })
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2">
              <span className="text-2xl">⚛️</span>
              <span className="font-bold text-lg text-gray-900">React+TS 工程</span>
            </NavLink>
            <nav className="flex space-x-6">
              <NavLink to="/" className={linkClass}>
                首页
              </NavLink>
              <NavLink to="/project" className={linkClass}>
                项目经历
              </NavLink>
              <NavLink to="/about" className={linkClass}>
                关于
              </NavLink>
              <NavLink to="/users" className={linkClass}>
                用户
              </NavLink>
              <NavLink to="/tech" className={linkClass}>
                技术难点
              </NavLink>
              <NavLink to="/lab/hooks" className={linkClass}>
                🧪 Hooks 实验室
              </NavLink>
              <NavLink to="/lab/feed" className={linkClass}>
                📰 Feed 流
              </NavLink>
              <NavLink to="/lab/kanban" className={linkClass}>
                📋 任务看板
              </NavLink>
              <NavLink to="/lab/types" className={linkClass}>
                📐 TS 展厅
              </NavLink>
              <NavLink to="/lab/perf" className={linkClass}>
                ⚡ 性能实验室
              </NavLink>
              <NavLink to="/lab/patterns" className={linkClass}>
                🧩 设计模式
              </NavLink>
              <NavLink to="/lab/arch" className={linkClass}>
                🗺️ 架构图
              </NavLink>
              <NavLink to="/lab/metrics" className={linkClass}>
                📊 性能监控
              </NavLink>
              <NavLink to="/lab/security" className={linkClass}>
                🔒 安全实验室
              </NavLink>
              {isAuthenticated && (
                <>
                  <NavLink to="/trading" className={linkClass}>
                    交易
                  </NavLink>
                  <NavLink to="/runner" className={linkClass}>
                    Python 运行器
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          {/* 认证状态 */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                {/* 用户信息 */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">{user.name}</span>
                    <span className="text-gray-400 ml-1">·</span>
                    <span className="text-gray-500 ml-1 text-xs">{user.company || '游客'}</span>
                  </div>
                </div>
                {/* 退出按钮 */}
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                >
                  退出
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="btn-primary text-sm !py-1.5 !px-4"
              >
                登录 / 注册
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
