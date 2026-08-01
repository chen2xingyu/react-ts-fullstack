import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">抱歉，您访问的页面不存在</p>
      <Link to="/" className="btn-primary">
        返回首页
      </Link>
    </div>
  )
}
