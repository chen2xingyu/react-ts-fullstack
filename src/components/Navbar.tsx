import { NavLink } from 'react-router-dom'
import { useCounterStore } from '@/store'

export default function Navbar() {
  const count = useCounterStore((state) => state.count)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-primary-600 font-semibold'
      : 'text-gray-600 hover:text-primary-500 transition-colors'

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center space-x-8">
          <span className="text-xl font-bold text-primary-600">ReactTS</span>
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
            <NavLink to="/interview" className={linkClass}>
              面试
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>状态计数:</span>
          <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded font-mono">
            {count}
          </span>
        </div>
      </div>
    </header>
  )
}
