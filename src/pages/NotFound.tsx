import { Link } from 'react-router-dom'

/**
 * 🎯 面试考点：404 兜底页（路由层，不是后端 404）
 * 访问任何未注册路径时，router/index.tsx 的 path="*" 会把它重定向到 /404 渲染本组件。
 * 注意区分：这是【前端路由】兜底（浏览器地址栏变了、服务器 200 返回 index.html），
 * 与后端返回的 HTTP 404 完全两回事。<Link to="/"> 是站内声明式跳转，不要用 <a>（会整页刷新）。
 */
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
