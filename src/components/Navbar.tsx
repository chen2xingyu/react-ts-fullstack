import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

export default function Navbar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-primary-600 ${
      isActive ? 'text-primary-600' : 'text-gray-600'
    }`

  const handleLogout = () => {
    logout()
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
