import { useState } from 'react'
import { Link } from 'react-router-dom'

// ============ 数据定义 ============

interface TechItem {
  name: string
  version: string
  role: string
  highlight: string
  icon: string
  color: string
}

interface InterviewPoint {
  category: string
  question: string
  answer: string
  link: string
}

const frontendTechs: TechItem[] = [
  {
    name: 'React 18',
    version: 'v18.3.1',
    role: 'UI 框架',
    highlight: '使用并发渲染（Concurrent Mode）、自动批处理、Suspense 等新特性，配合 StrictMode 提前暴露潜在问题',
    icon: '⚛️',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'TypeScript',
    version: 'v5.5.3',
    role: '类型系统',
    highlight: '全量 TS 编写，利用泛型、条件类型、工具类型（Partial/Pick/Omit）实现类型安全的 API 请求封装',
    icon: '📘',
    color: 'from-blue-600 to-indigo-600',
  },
  {
    name: 'Vite',
    version: 'v5.4.1',
    role: '构建工具',
    highlight: '基于原生 ESM 的按需编译，冷启动 <500ms；配置路径别名 @/ 和 dev server proxy 解决跨域',
    icon: '⚡',
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: 'React Router',
    version: 'v6.26.0',
    role: '路由管理',
    highlight: '嵌套路由 + Layout 组件 + 404 兜底 + Navigate 重定向，声明式配置清晰可维护',
    icon: '🧭',
    color: 'from-red-500 to-orange-500',
  },
  {
    name: 'Zustand',
    version: 'v4.5.4',
    role: '状态管理',
    highlight: '替代 Redux 的轻量方案，API 极简，基于 useSyncExternalStore 订阅，无 Provider 嵌套',
    icon: '🐻',
    color: 'from-orange-500 to-amber-500',
  },
  {
    name: 'TanStack Query',
    version: 'v5.52.0',
    role: '数据请求',
    highlight: '服务端状态管理，自动缓存、stale-while-revalidate 策略、window focus 自动刷新',
    icon: '🔄',
    color: 'from-red-600 to-rose-600',
  },
  {
    name: 'Axios',
    version: 'v1.7.7',
    role: 'HTTP 客户端',
    highlight: '拦截器统一注入 Token、统一错误处理、响应数据剥离，泛型封装 get/post/put/delete',
    icon: '📡',
    color: 'from-green-500 to-emerald-500',
  },
  {
    name: 'Tailwind CSS',
    version: 'v3.4.7',
    role: '样式方案',
    highlight: '原子化 CSS，@layer 自定义组件类（btn-primary/card），JIT 编译零冗余，响应式开发高效',
    icon: '🎨',
    color: 'from-cyan-500 to-teal-500',
  },
]

const backendTechs: TechItem[] = [
  {
    name: 'Node.js',
    version: 'Runtime',
    role: '运行时',
    highlight: '基于 V8 引擎的非阻塞 I/O，单线程事件循环处理高并发请求，适合 I/O 密集型场景',
    icon: '🟢',
    color: 'from-green-600 to-lime-600',
  },
  {
    name: 'Express',
    version: 'v4.19.2',
    role: 'Web 框架',
    highlight: '极简灵活的中间件机制，分层架构：路由 → 控制器 → 模型，职责清晰',
    icon: '🚂',
    color: 'from-gray-600 to-slate-700',
  },
  {
    name: 'MySQL2',
    version: 'v3.11.0',
    role: '数据库驱动',
    highlight: 'Promise API + 连接池（connectionLimit:10），预处理语句防 SQL 注入，支持事务',
    icon: '🗄️',
    color: 'from-blue-500 to-blue-700',
  },
  {
    name: 'Joi',
    version: 'v17.13.3',
    role: '参数校验',
    highlight: '声明式 Schema 校验，区分 create/update 场景，错误信息精确到字段，提前拦截非法请求',
    icon: '✅',
    color: 'from-emerald-500 to-green-600',
  },
  {
    name: 'CORS',
    version: 'v2.8.5',
    role: '跨域处理',
    highlight: '配置 credentials: true 支持携带 Cookie，origin 白名单精确控制，配合 Vite proxy 开发',
    icon: '🔗',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    name: 'Morgan',
    version: 'v1.10.0',
    role: '日志中间件',
    highlight: 'dev 模式下彩色 HTTP 请求日志，便于调试接口响应时间和状态码',
    icon: '📋',
    color: 'from-slate-500 to-gray-600',
  },
  {
    name: 'dotenv',
    version: 'v16.4.5',
    role: '环境配置',
    highlight: '环境变量隔离开发/生产配置，敏感信息（DB 密码）不入库，.env.example 提供模板',
    icon: '🔐',
    color: 'from-yellow-500 to-amber-600',
  },
  {
    name: 'Nodemon',
    version: 'v3.1.4',
    role: '开发工具',
    highlight: '文件变更自动重启服务，提升后端开发体验，等效于前端的 HMR',
    icon: '🔁',
    color: 'from-teal-500 to-cyan-600',
  },
]

const engineeringHighlights = [
  {
    title: '分层架构',
    desc: '后端严格遵循 Routes → Controllers → Models 三层架构，前端 API → Hooks → Components 分层，职责单一',
    icon: '🏗️',
  },
  {
    title: '统一错误处理',
    desc: 'Express 全局 errorHandler 中间件 + notFoundHandler 兜底，开发环境输出 stack trace',
    icon: '🛡️',
  },
  {
    title: '类型安全',
    desc: '前后端共享 ApiResponse<T> 泛型接口，TS 编译期拦截类型错误，API 契约一致',
    icon: '🔒',
  },
  {
    title: '代码规范',
    desc: 'ESLint 9 + Prettier 3 + eslint-plugin-react-hooks，提交前统一格式，强制 Hooks 规则',
    icon: '📏',
  },
]

const interviewPoints: InterviewPoint[] = [
  {
    category: 'React 原理',
    question: 'React Fiber 架构与并发渲染',
    answer: '项目使用 React 18 的 Concurrent Mode，Fiber 链表结构实现可中断渲染，时间切片利用 MessageChannel 让出主线程',
    link: '/interview',
  },
  {
    category: '状态管理',
    question: 'Zustand vs Redux 的设计哲学',
    answer: 'Zustand 基于 useSyncExternalStore，无 Provider 嵌套，store 即 hook；Redux 强调单一数据流和中间件',
    link: '/interview',
  },
  {
    category: '网络协议',
    question: 'CORS 跨域与 Vite Proxy 原理',
    answer: '开发环境 Vite dev server 代理 /api 到 3000 端口绕过浏览器同源策略；生产环境 Express 配置 CORS 中间件',
    link: '/interview',
  },
  {
    category: '工程化',
    question: 'Vite 为什么比 Webpack 快',
    answer: 'Vite 利用浏览器原生 ESM 按需编译，esbuild 预构建依赖，冷启动无需打包；Webpack 需全量打包',
    link: '/interview',
  },
  {
    category: '数据库',
    question: 'MySQL 连接池的工作原理',
    answer: '预先创建 10 个连接复用，避免频繁 TCP 握手；queueLimit:0 表示无上限排队，waitForConnections 阻塞等待',
    link: '/interview',
  },
  {
    category: '安全',
    question: 'SQL 注入防御与 Joi 校验',
    answer: 'mysql2 使用预处理语句（参数化查询）防注入；Joi 在业务层校验输入合法性，双重保障',
    link: '/interview',
  },
]

const projectMetrics = [
  { label: '前端依赖', value: '10+', unit: '个' },
  { label: '后端依赖', value: '8', unit: '个' },
  { label: 'API 接口', value: '6', unit: '个' },
  { label: '面试题库', value: '25', unit: '道' },
  { label: '技术方向', value: '8', unit: '大' },
  { label: 'TS 覆盖率', value: '100', unit: '%' },
]

// ============ 组件 ============

function TechCard({ tech }: { tech: TechItem }) {
  return (
    <div className="card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tech.color} flex items-center justify-center text-2xl shadow-md`}>
          {tech.icon}
        </div>
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
          {tech.version}
        </span>
      </div>
      <h3 className="font-bold text-gray-900 text-lg mb-1">{tech.name}</h3>
      <p className="text-xs text-primary-600 font-medium mb-2">{tech.role}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{tech.highlight}</p>
    </div>
  )
}

function ArchitectureFlow() {
  const layers = [
    { name: '浏览器', items: ['React 18', 'React Router', 'Zustand', 'React Query'], color: 'bg-blue-50 border-blue-300' },
    { name: '前端工具链', items: ['Vite (ESM)', 'TypeScript', 'Tailwind CSS', 'Axios'], color: 'bg-purple-50 border-purple-300' },
    { name: 'Dev Server', items: ['Vite Proxy /api → :3000'], color: 'bg-amber-50 border-amber-300' },
    { name: '后端服务', items: ['Express', 'CORS', 'Morgan', 'Joi 校验'], color: 'bg-green-50 border-green-300' },
    { name: '数据层', items: ['MySQL 连接池', '预处理语句', 'utf8mb4'], color: 'bg-cyan-50 border-cyan-300' },
  ]

  return (
    <div className="space-y-2">
      {layers.map((layer, idx) => (
        <div key={layer.name}>
          <div className={`border-2 ${layer.color} rounded-xl p-4`}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">{layer.name}</span>
              <div className="flex flex-wrap gap-2">
                {layer.items.map((item) => (
                  <span key={item} className="text-xs bg-white px-3 py-1.5 rounded-md font-medium text-gray-700 shadow-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {idx < layers.length - 1 && (
            <div className="flex justify-center py-1">
              <span className="text-gray-400 text-xl">↓</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function Project() {
  const [activeTab, setActiveTab] = useState<'frontend' | 'backend'>('frontend')

  return (
    <div className="space-y-8 pb-12">
      {/* ===== Hero 区 ===== */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 text-white p-8 md:p-12 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="relative z-10">
          <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            🚀 全栈项目经历
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            React + TypeScript 全栈工程
          </h1>
          <p className="text-lg md:text-xl text-primary-100 max-w-3xl leading-relaxed mb-6">
            一套覆盖前端主流技术栈 + Node.js 后端 + MySQL 数据库的全栈解决方案，
            集成面试题库功能与微信小程序多端部署能力
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="bg-white/15 px-4 py-2 rounded-lg">📅 2026.07 - 至今</span>
            <span className="bg-white/15 px-4 py-2 rounded-lg">👤 独立开发</span>
            <span className="bg-white/15 px-4 py-2 rounded-lg">🔧 全栈工程师</span>
            <span className="bg-white/15 px-4 py-2 rounded-lg">🌐 Web + 小程序</span>
          </div>
        </div>
      </section>

      {/* ===== 项目数据指标 ===== */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {projectMetrics.map((metric) => (
          <div key={metric.label} className="card text-center py-5">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold text-primary-600">{metric.value}</span>
              <span className="text-sm text-gray-400">{metric.unit}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{metric.label}</p>
          </div>
        ))}
      </section>

      {/* ===== 技术架构图 ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🗺️</span>
          <h2 className="text-2xl font-bold text-gray-900">技术架构</h2>
          <span className="text-sm text-gray-400">从浏览器到数据库的完整链路</span>
        </div>
        <div className="card">
          <ArchitectureFlow />
        </div>
      </section>

      {/* ===== 技术栈详情（Tab 切换） ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🛠️</span>
          <h2 className="text-2xl font-bold text-gray-900">技术栈详解</h2>
        </div>

        {/* Tab 按钮 */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('frontend')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'frontend'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🖥️ 前端技术 ({frontendTechs.length})
          </button>
          <button
            onClick={() => setActiveTab('backend')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'backend'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⚙️ 后端技术 ({backendTechs.length})
          </button>
        </div>

        {/* 技术卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {(activeTab === 'frontend' ? frontendTechs : backendTechs).map((tech) => (
            <TechCard key={tech.name} tech={tech} />
          ))}
        </div>
      </section>

      {/* ===== 工程化亮点 ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">💎</span>
          <h2 className="text-2xl font-bold text-gray-900">工程化亮点</h2>
          <span className="text-sm text-gray-400">项目中的最佳实践</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {engineeringHighlights.map((item) => (
            <div key={item.title} className="card flex gap-4 items-start hover:shadow-md transition-shadow">
              <div className="text-3xl flex-shrink-0">{item.icon}</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 核心代码片段 ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">💻</span>
          <h2 className="text-2xl font-bold text-gray-900">核心代码亮点</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Axios 封装 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">📡 Axios 泛型封装</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">前端</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{`// 统一响应类型
interface ApiResponse<T> {
  code: number; message: string; data: T
}

// 泛型请求方法
export const http = {
  get<T>(url: string): Promise<ApiResponse<T>> {
    return request.get(url) as Promise<ApiResponse<T>>
  },
  // post/put/delete 同理
}

// 拦截器：自动注入 Token + 剥离响应数据
request.interceptors.response.use(
  (res) => res.data // 直接返回业务数据
)`}</code></pre>
          </div>

          {/* MySQL 连接池 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">🗄️ MySQL 连接池</h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">后端</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{`const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  database: 'react_ts_db',
  waitForConnections: true,
  connectionLimit: 10,  // 连接池大小
  queueLimit: 0,        // 无限排队
})

// 预处理语句防 SQL 注入
await pool.query(
  'SELECT * FROM users WHERE id = ?',
  [id]  // 参数化查询
)`}</code></pre>
          </div>

          {/* Zustand Store */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">🐻 Zustand 状态管理</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">前端</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{`// 无 Provider，store 即 hook
export const useCounterStore = create<CounterState>(
  (set) => ({
    count: 0,
    increment: () => set((s) => ({
      count: s.count + 1
    })),
    reset: () => set({ count: 0 }),
  })
)

// 组件中直接使用
const { count, increment } = useCounterStore()`}</code></pre>
          </div>

          {/* Joi 校验 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">✅ Joi 参数校验</h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">后端</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{`// 声明式 Schema
const userSchema = Joi.object({
  name: Joi.string().min(1).max(100)
    .required(),
  email: Joi.string().email().max(100)
    .required(),
  phone: Joi.string().max(20).allow(''),
})

// 控制器中校验
const { error, value } = userSchema
  .validate(req.body)
if (error) {
  return res.status(400).json({
    code: 400,
    message: error.details[0].message,
  })
}`}</code></pre>
          </div>
        </div>
      </section>

      {/* ===== 面试知识点关联 ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🎯</span>
          <h2 className="text-2xl font-bold text-gray-900">涉及面试知识点</h2>
          <span className="text-sm text-gray-400">项目背后的原理与深度</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {interviewPoints.map((point, idx) => (
            <Link
              key={idx}
              to={point.link}
              className="card block hover:shadow-lg hover:border-primary-300 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded font-medium">
                  {point.category}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                {point.question}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{point.answer}</p>
              <span className="text-xs text-primary-500 group-hover:text-primary-700 font-medium">
                查看完整解析 →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== 项目成果 ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📊</span>
          <h2 className="text-2xl font-bold text-gray-900">项目成果</h2>
        </div>
        <div className="card bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-green-500">✓</span> 已实现
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  前后端分离架构，RESTful API 设计，6 个完整 CRUD 接口
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  TypeScript 全覆盖，编译期类型安全，零 any 逃逸
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  25 道高级前端面试题库，8 大技术方向，含代码示例与外链
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  Taro 4 微信小程序多端编译，一套代码 Web + 小程序
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  MySQL 连接池 + 预处理语句，性能与安全并重
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-amber-500">⚡</span> 技术深度
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  深入 React 18 并发渲染、Fiber 架构、批量更新原理
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  手写 Axios 泛型封装，拦截器 + 统一错误处理
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  Vite ESM 原理、HMR 机制、dev server proxy 跨域方案
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  Express 中间件洋葱模型、错误传播机制
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  CORS 完整流程、CSRF 防御、XSS 转义、SQL 注入防护
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 底部 CTA ===== */}
      <section className="text-center py-8">
        <div className="inline-flex flex-wrap justify-center gap-4">
          <Link to="/interview" className="btn-primary">
            📚 查看面试题库
          </Link>
          <Link to="/users" className="btn-secondary">
            👥 查看 CRUD 示例
          </Link>
          <Link to="/" className="btn-secondary">
            🏠 返回首页
          </Link>
        </div>
      </section>
    </div>
  )
}
