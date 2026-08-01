export default function About() {
  const frontendStack = [
    { name: 'React', version: '18.x', desc: 'UI 框架' },
    { name: 'TypeScript', version: '5.x', desc: '类型安全' },
    { name: 'Vite', version: '5.x', desc: '构建工具' },
    { name: 'React Router', version: '6.x', desc: '路由管理' },
    { name: 'Zustand', version: '4.x', desc: '状态管理' },
    { name: 'Axios', version: '1.x', desc: 'HTTP 客户端' },
    { name: 'Tailwind CSS', version: '3.x', desc: '样式框架' },
    { name: 'React Query', version: '5.x', desc: '数据获取' },
    { name: 'ESLint', version: '9.x', desc: '代码检查' },
    { name: 'Prettier', version: '3.x', desc: '代码格式化' },
  ]

  const backendStack = [
    { name: 'Node.js', version: '18+', desc: '服务端运行时' },
    { name: 'Express', version: '4.x', desc: 'Web 框架' },
    { name: 'MySQL', version: '8.x', desc: '关系型数据库' },
    { name: 'mysql2', version: '3.x', desc: 'MySQL 驱动 (连接池)' },
    { name: 'Joi', version: '17.x', desc: '数据校验' },
    { name: 'CORS', version: '2.x', desc: '跨域支持' },
    { name: 'Morgan', version: '1.x', desc: '请求日志' },
    { name: 'Nodemon', version: '3.x', desc: '开发热重载' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">关于此工程</h1>
      <p className="text-gray-600 mb-8 leading-relaxed">
        这是一个前后端分离的现代化全栈工程模板，前端基于 React + TypeScript + Vite，后端基于 Node.js + Express + MySQL，适合快速启动企业级项目。
      </p>

      <h2 className="text-xl font-semibold mb-4">前端技术栈</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {frontendStack.map((tech) => (
          <div key={tech.name} className="card flex flex-col">
            <span className="font-semibold text-gray-900">{tech.name}</span>
            <span className="text-sm text-primary-600 font-mono">{tech.version}</span>
            <span className="text-xs text-gray-500 mt-1">{tech.desc}</span>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-4">后端技术栈</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {backendStack.map((tech) => (
          <div key={tech.name} className="card flex flex-col">
            <span className="font-semibold text-gray-900">{tech.name}</span>
            <span className="text-sm text-primary-600 font-mono">{tech.version}</span>
            <span className="text-xs text-gray-500 mt-1">{tech.desc}</span>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-4">项目结构</h2>
      <pre className="card text-sm font-mono bg-gray-50 overflow-x-auto mb-8">
{`d:\\reactTs/
├── src/                     # 前端源码
│   ├── api/                  # API 接口与请求封装
│   │   ├── request.ts         # Axios 实例与拦截器
│   │   └── user.ts            # 用户相关 API
│   ├── components/           # 通用组件
│   │   ├── Layout.tsx         # 页面布局
│   │   └── Navbar.tsx         # 导航栏
│   ├── hooks/                # 自定义 Hooks
│   │   └── useUsers.ts        # 用户数据 Hook
│   ├── pages/                # 页面组件
│   │   ├── Home.tsx           # 首页
│   │   ├── About.tsx          # 关于页
│   │   ├── Users.tsx          # 用户管理(CRUD)
│   │   └── NotFound.tsx       # 404 页面
│   ├── router/               # 路由配置
│   │   └── index.tsx
│   ├── store/                # Zustand 状态管理
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server/                  # 后端服务
│   ├── config/               # 配置
│   │   ├── index.js           # 环境配置
│   │   └── db.js              # MySQL 连接池
│   ├── controllers/          # 控制器
│   │   └── userController.js  # 用户业务逻辑
│   ├── models/               # 数据模型
│   │   └── userModel.js       # 用户数据库操作
│   ├── routes/               # 路由
│   │   ├── index.js           # 路由汇总
│   │   └── userRoutes.js      # 用户路由
│   ├── middleware/           # 中间件
│   │   └── errorHandler.js    # 错误处理
│   ├── scripts/              # 脚本
│   │   └── init-db.js         # 数据库初始化
│   ├── app.js                # 服务入口
│   └── .env                  # 环境变量
├── vite.config.ts
├── tailwind.config.js
└── package.json`}
      </pre>

      <h2 className="text-xl font-semibold mb-4">后端 API 接口</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2 pr-4">方法</th>
              <th className="pb-2 pr-4">路径</th>
              <th className="pb-2">说明</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            <tr className="border-b border-gray-100"><td className="py-2 pr-4 text-green-600">GET</td><td className="py-2 pr-4">/api/health</td><td className="py-2 text-gray-600">健康检查</td></tr>
            <tr className="border-b border-gray-100"><td className="py-2 pr-4 text-green-600">GET</td><td className="py-2 pr-4">/api/users</td><td className="py-2 text-gray-600">获取用户列表</td></tr>
            <tr className="border-b border-gray-100"><td className="py-2 pr-4 text-green-600">GET</td><td className="py-2 pr-4">/api/users/:id</td><td className="py-2 text-gray-600">获取单个用户</td></tr>
            <tr className="border-b border-gray-100"><td className="py-2 pr-4 text-blue-600">POST</td><td className="py-2 pr-4">/api/users</td><td className="py-2 text-gray-600">创建用户</td></tr>
            <tr className="border-b border-gray-100"><td className="py-2 pr-4 text-amber-600">PUT</td><td className="py-2 pr-4">/api/users/:id</td><td className="py-2 text-gray-600">更新用户</td></tr>
            <tr><td className="py-2 pr-4 text-red-600">DELETE</td><td className="py-2 pr-4">/api/users/:id</td><td className="py-2 text-gray-600">删除用户</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
