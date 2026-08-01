import { useCounterStore } from '@/store'

export default function Home() {
  const { count, increment, decrement, reset } = useCounterStore()

  return (
    <div className="space-y-8">
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          欢迎使用 <span className="text-primary-600">React + TypeScript</span> 工程
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          基于 Vite 构建，集成 React Router、Zustand、Axios、Tailwind CSS、React Query 等主流技术栈
        </p>
      </section>

      <section className="card max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4">Zustand 状态管理示例</h2>
        <div className="flex items-center justify-center space-x-4">
          <button onClick={decrement} className="btn-secondary">
            -1
          </button>
          <span className="text-3xl font-mono font-bold text-primary-600 w-16 text-center">
            {count}
          </span>
          <button onClick={increment} className="btn-primary">
            +1
          </button>
        </div>
        <div className="mt-4 text-center">
          <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700">
            重置
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'React Router', desc: '声明式路由配置，支持嵌套路由和导航守卫' },
          { title: 'Zustand', desc: '轻量级状态管理，API 简洁易用' },
          { title: 'Tailwind CSS', desc: '原子化 CSS 框架，快速构建 UI' },
          { title: 'Axios', desc: '完善的 HTTP 请求封装，拦截器支持' },
          { title: 'React Query', desc: '服务端状态管理，缓存与自动刷新' },
          { title: 'Node.js + Express', desc: '后端 RESTful API 服务' },
          { title: 'MySQL', desc: '通用关系型数据库，连接池支持' },
          { title: 'ESLint + Prettier', desc: '代码规范检查与格式化' },
        ].map((item) => (
          <div key={item.title} className="card hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-primary-600 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
