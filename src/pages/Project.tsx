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

// ---------- 前端技术栈 ----------
const frontendTechs: TechItem[] = [
  {
    name: 'React 18',
    version: 'v18.3.1',
    role: 'UI 框架',
    highlight: '并发渲染（Concurrent Mode）、自动批处理、Suspense，配合 StrictMode 提前暴露潜在问题',
    icon: '⚛️',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'TypeScript',
    version: 'v5.5.3',
    role: '类型系统',
    highlight: '全量 TS 编写，泛型、条件类型、工具类型实现类型安全的 API 请求封装，前后端共享 ApiResponse<T> 契约',
    icon: '📘',
    color: 'from-blue-600 to-indigo-600',
  },
  {
    name: 'Vite',
    version: 'v5.4.1',
    role: '构建工具',
    highlight: '基于原生 ESM 的按需编译，冷启动 <500ms；路径别名 @/ 和 dev server proxy 解决跨域',
    icon: '⚡',
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: 'TanStack Query',
    version: 'v5.52.0',
    role: '服务端状态',
    highlight: '自动缓存、stale-while-revalidate 策略；WS 通知触发 invalidateQueries 即时刷新，告别死轮询',
    icon: '🔄',
    color: 'from-red-600 to-rose-600',
  },
  {
    name: 'Zustand',
    version: 'v4.5.4',
    role: '状态管理',
    highlight: '替代 Redux 的轻量方案，基于 useSyncExternalStore 订阅，无 Provider 嵌套',
    icon: '🐻',
    color: 'from-orange-500 to-amber-500',
  },
  {
    name: 'lightweight-charts',
    version: 'v4.2.0',
    role: 'K 线图表',
    highlight: '高性能金融图表，WebSocket 实时增量更新蜡烛柱，切换标的 fitContent 自适应',
    icon: '📈',
    color: 'from-emerald-500 to-teal-500',
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
    highlight: '原子化 CSS，@layer 自定义组件类（btn-primary/card），JIT 编译零冗余',
    icon: '🎨',
    color: 'from-cyan-500 to-teal-500',
  },
  {
    name: '代码编辑器',
    version: 'react-simple-code-editor',
    role: '在线代码运行',
    highlight: 'prismjs Python 语法高亮编辑器，粘贴代码提交后端 spawn python 执行，返回真实结果',
    icon: '📝',
    color: 'from-fuchsia-500 to-pink-500',
  },
]

// ---------- 后端技术栈 ----------
const backendTechs: TechItem[] = [
  {
    name: 'Node.js + Express',
    version: 'v4.19.2',
    role: 'Web 框架',
    highlight: '非阻塞 I/O 处理高并发，中间件洋葱模型，分层架构 Routes→Controllers→Models',
    icon: '🟢',
    color: 'from-green-600 to-lime-600',
  },
  {
    name: 'MySQL2',
    version: 'v3.11.0',
    role: '关系数据库',
    highlight: '连接池 + 预处理语句防注入；事务保证资金/持仓 ACID，带条件 UPDATE 原子防超卖',
    icon: '🗄️',
    color: 'from-blue-500 to-blue-700',
  },
  {
    name: 'Redis (ioredis)',
    version: 'v6.0.0',
    role: '消息中间件',
    highlight: 'Stream 可靠投递订单/成交（消费者组+ACK），Pub/Sub 广播行情，Hash/Set 缓存与快照',
    icon: '🚄',
    color: 'from-red-500 to-rose-600',
  },
  {
    name: 'WebSocket (ws)',
    version: 'v8.21.1',
    role: '实时通信',
    highlight: 'JWT 鉴权连接 + symbol 房间订阅 + 用户私有通道 + 心跳保活 + 断线重连',
    icon: '🔌',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    name: 'JWT',
    version: 'v9.0.3',
    role: '鉴权方案',
    highlight: 'Access Token + Refresh Token 双令牌，WS 连接与 REST 路由统一鉴权',
    icon: '🔑',
    color: 'from-amber-500 to-orange-600',
  },
  {
    name: 'Joi',
    version: 'v17.13.3',
    role: '参数校验',
    highlight: '声明式 Schema 校验，错误信息精确到字段，业务层前置拦截非法请求',
    icon: '✅',
    color: 'from-emerald-500 to-green-600',
  },
  {
    name: '事务结算',
    version: '自研',
    role: '资金权威',
    highlight: '消费成交回报事务落库：INSERT trades + UPDATE orders/positions/accounts 原子一致',
    icon: '⚖️',
    color: 'from-slate-600 to-gray-700',
  },
  {
    name: '风控引擎',
    version: '自研',
    role: '前置风控',
    highlight: '12 类规则（涨跌停/手数/资金/持仓/幂等等），rejectRisk 统一出口全量留痕 risk_logs',
    icon: '🛡️',
    color: 'from-rose-500 to-red-600',
  },
  {
    name: 'child_process',
    version: 'Node 内置',
    role: '代码执行',
    highlight: 'spawn 调本机 Python 执行用户代码：临时文件 + 30s 超时 + 工作目录隔离，捕获 stdout/stderr',
    icon: '🐍',
    color: 'from-lime-500 to-green-500',
  },
]

// ---------- 交易引擎技术栈（Python）----------
const engineTechs: TechItem[] = [
  {
    name: 'Python 3.13',
    version: 'v3.13',
    role: '运行时',
    highlight: 'asyncio 单线程事件循环驱动行情生成与撮合并行，无锁协程切换高效',
    icon: '🐍',
    color: 'from-yellow-500 to-amber-600',
  },
  {
    name: 'redis.asyncio',
    version: 'v5.0',
    role: 'Redis 客户端',
    highlight: '异步消费 Stream（XREADGROUP）、PUBLISH 行情、XADD 成交回报，不阻塞事件循环',
    icon: '📦',
    color: 'from-red-500 to-rose-500',
  },
  {
    name: '撮合引擎',
    version: '自研',
    role: '核心引擎',
    highlight: '价格优先 + 时间优先撮合，SortedDict 维护买卖盘，maker 价成交，O(log n) 匹配',
    icon: '⚖️',
    color: 'from-purple-500 to-indigo-600',
  },
  {
    name: '行情生成',
    version: '自研',
    role: '模拟行情',
    highlight: '几何布朗运动 + 均值回归生成 tick，涨跌停钳制；tick 聚合 1m K 线 + 五档深度',
    icon: '📊',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    name: '容灾重建',
    version: '自研',
    role: '高可用',
    highlight: '从 Redis 活跃订单快照 rebuild_from_active 重建订单簿，崩溃重启挂单不丢',
    icon: '🔄',
    color: 'from-emerald-500 to-green-600',
  },
  {
    name: 'pending 回收',
    version: '自研',
    role: '消息可靠',
    highlight: 'XPENDING + XCLAIM 回收崩溃消费者未 ACK 消息（兼容 Redis 5，替代 XAUTOCLAIM）',
    icon: '🧹',
    color: 'from-teal-500 to-cyan-600',
  },
]

// ---------- 工程化亮点 ----------
const engineeringHighlights = [
  {
    title: '三语言解耦架构',
    desc: 'React/TS 前端 + Node.js 网关 + Python 撮合引擎，Redis 解耦。Python 不碰 DB，资金真相源唯一在 MySQL',
    icon: '🏗️',
  },
  {
    title: '资金守恒与防超卖',
    desc: '事务内带条件 UPDATE（WHERE cash_available >= ?）原子校验，并发下单 affectedRows=0 即回滚，杜绝超冻',
    icon: '💰',
  },
  {
    title: '撮合引擎容灾',
    desc: '限价单写 Redis 快照（SET+HASH），Python 崩溃重启从快照重建订单簿，未成交挂单继续有效可成交/可撤',
    icon: '🛟',
  },
  {
    title: 'Stream 可靠投递',
    desc: '订单/成交走 Redis Stream + 消费者组，ACK 确认 + pending 续消费，崩溃不丢消息，对账可回溯',
    icon: '📨',
  },
  {
    title: '风控全量留痕',
    desc: '12 类风控拒绝经 rejectRisk 统一出口写入 risk_logs，可查可聚合，前端实时展示拒绝记录',
    icon: '🛡️',
  },
  {
    title: '实时双向通信',
    desc: 'WS 行情广播 + 成交私有推送，前端收到通知 invalidateQueries 即时刷新，毫秒级联动',
    icon: '⚡',
  },
  {
    title: '分层架构',
    desc: '后端 Routes→Controllers→Models 三层，前端 API→Hooks→Components 分层，职责单一可维护',
    icon: '🗂️',
  },
  {
    title: '类型安全契约',
    desc: '前后端共享 ApiResponse<T> 泛型，交易实体类型对齐，TS 编译期拦截类型错误，零 any 逃逸',
    icon: '🔒',
  },
  {
    title: '在线 Python 运行器',
    desc: '浏览器粘贴 Python 代码→Node spawn 执行→真实结果（条件选股/数据分析），复用 akshare/pandas 环境拉真实 A 股',
    icon: '🐍',
  },
]

// ---------- 面试知识点 ----------
const interviewPoints: InterviewPoint[] = [
  {
    category: '消息中间件',
    question: 'Redis Stream vs Pub/Sub 如何选型？',
    answer: '交易流（订单/成交）用 Stream：消费者组 + ACK + pending 续消费，崩溃不丢；行情广播用 Pub/Sub：最新即正确，丢一两个无妨，低延迟',
    link: '/interview',
  },
  {
    category: '容灾设计',
    question: '撮合引擎崩溃后挂单会丢吗？',
    answer: '限价单写 Redis 活跃快照（SET+HASH），重启时 rebuild_from_active 重建订单簿；seen_ids 去重 Stream 重投递，挂单继续有效',
    link: '/interview',
  },
  {
    category: '并发控制',
    question: '如何防止并发下单超卖？',
    answer: '事务内带条件 UPDATE：WHERE cash_available >= ? 让 DB 原子校验，affectedRows=0 即回滚。比「先 SELECT 再 UPDATE」无竞态窗口',
    link: '/interview',
  },
  {
    category: '架构设计',
    question: '为何 Python 不直写 MySQL？',
    answer: '职责分离：Python 只管算（撮合/行情），Node 只管存（事务落库）。Python 无 DB 凭据更安全，且可随时重启，资金安全不依赖撮合进程',
    link: '/interview',
  },
  {
    category: '实时通信',
    question: 'WebSocket 房间订阅如何设计？',
    answer: 'JWT 鉴权连接 + symbol 房间按行情定向广播 + 用户私有通道推成交 + 心跳保活 + 断线重连自动恢复订阅',
    link: '/interview',
  },
  {
    category: '消息可靠',
    question: '消费者崩溃后 pending 消息怎么办？',
    answer: '启动时 XPENDING 扫描 pending 队列，对超阈值消息 XCLAIM 抢回重处理。Redis 6 有 XAUTOCLAIM，本项目 5.0 用两步替代',
    link: '/interview',
  },
  {
    category: 'React 原理',
    question: 'React Fiber 架构与并发渲染',
    answer: 'React 18 Concurrent Mode，Fiber 链表结构实现可中断渲染，时间切片利用 MessageChannel 让出主线程',
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
    answer: '开发环境 Vite dev server 代理 /api 到 :3000 绕过同源策略；生产环境 Express 配置 CORS 中间件',
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
    question: 'MySQL 事务与隔离级别',
    answer: '资金冻结 + 落单在同一事务保证 ACID；带条件 UPDATE 利用行锁防并发，REPEATABLE READ 避免幻读',
    link: '/interview',
  },
  {
    category: '安全',
    question: 'SQL 注入防御与 JWT 鉴权',
    answer: 'mysql2 预处理语句参数化查询防注入；JWT 双令牌（Access+Refresh），WS 与 REST 统一鉴权',
    link: '/interview',
  },
]

// ---------- 项目数据指标 ----------
const projectMetrics = [
  { label: '技术栈', value: '26', unit: '个' },
  { label: 'API 接口', value: '22', unit: '+' },
  { label: '交易数据表', value: '8', unit: '张' },
  { label: 'Redis 通道', value: '10', unit: '+' },
  { label: '风控规则', value: '12', unit: '类' },
  { label: '交付阶段', value: '6', unit: '个' },
  { label: '代码规模', value: '7500', unit: '+行' },
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
    {
      name: '浏览器',
      items: ['React 18', 'lightweight-charts K线', 'React Query', 'WS 客户端'],
      color: 'bg-blue-50 border-blue-300',
    },
    {
      name: '前端工具链',
      items: ['Vite (ESM)', 'TypeScript', 'Tailwind CSS', 'Zustand'],
      color: 'bg-purple-50 border-purple-300',
    },
    {
      name: '后端网关',
      items: ['Express + JWT', 'WebSocket 网关', '前置风控', '事务结算'],
      color: 'bg-green-50 border-green-300',
    },
    {
      name: '消息中间件',
      items: ['Redis Stream（订单/成交）', 'Pub/Sub（行情广播）', 'Hash（行情快照）', 'Set（活跃订单）'],
      color: 'bg-red-50 border-red-300',
    },
    {
      name: '计算引擎',
      items: ['Python asyncio', '撮合引擎', '行情生成(GBM)', '订单簿'],
      color: 'bg-amber-50 border-amber-300',
    },
    {
      name: '数据层',
      items: ['MySQL 8 张交易表', '资金/持仓真相源', '连接池', '事务 ACID'],
      color: 'bg-cyan-50 border-cyan-300',
    },
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
  const [activeTab, setActiveTab] = useState<'frontend' | 'backend' | 'engine'>('engine')

  const tabs: { key: typeof activeTab; label: string; techs: TechItem[] }[] = [
    { key: 'frontend', label: '🖥️ 前端', techs: frontendTechs },
    { key: 'backend', label: '⚙️ 后端', techs: backendTechs },
    { key: 'engine', label: '🐍 交易引擎', techs: engineTechs },
  ]

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
            准生产级证券交易系统
          </h1>
          <p className="text-lg md:text-xl text-primary-100 max-w-3xl leading-relaxed mb-6">
            React + TypeScript + Node.js + Python + Redis + MySQL 三语言全栈方案：
            实时行情推送、委托下单、撮合引擎、资金/持仓管理、12 类风控、撮合引擎容灾重建
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="bg-white/15 px-4 py-2 rounded-lg">📅 2026.07 - 至今</span>
            <span className="bg-white/15 px-4 py-2 rounded-lg">👤 独立开发</span>
            <span className="bg-white/15 px-4 py-2 rounded-lg">🔧 全栈工程师</span>
            <span className="bg-white/15 px-4 py-2 rounded-lg">🌐 Web 全栈</span>
          </div>
        </div>
      </section>

      {/* ===== 项目数据指标 ===== */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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
          <span className="text-sm text-gray-400">三语言六层全链路</span>
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
        <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-xl w-fit flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label} ({tab.techs.length})
            </button>
          ))}
        </div>

        {/* 技术卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {tabs
            .find((t) => t.key === activeTab)!
            .techs.map((tech) => (
              <TechCard key={tech.name} tech={tech} />
            ))}
        </div>
      </section>

      {/* ===== 工程化亮点 ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">💎</span>
          <h2 className="text-2xl font-bold text-gray-900">工程化亮点</h2>
          <span className="text-sm text-gray-400">项目中的硬核实践</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
          {/* 带条件 UPDATE 防超卖 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">💰 带条件 UPDATE 防超卖</h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">后端·并发</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{`// 事务内原子冻结：WHERE 条件让 DB 做并发校验
const [r] = await conn.query(
  \`UPDATE accounts
     SET cash_available = cash_available - ?,
         cash_frozen = cash_frozen + ?
   WHERE user_id = ? AND cash_available >= ?\`,
  [freezeAmount, freezeAmount, userId, freezeAmount]
)
if (r.affectedRows === 0) {
  // 并发抢占失败，回滚
  throw new RiskError('no_cash', '可用资金不足')
}`}</code></pre>
          </div>

          {/* Redis Stream 投递 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">📨 Redis Stream 可靠投递</h3>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">后端·消息</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{`// 订单投递到 Stream，消费者组保证不丢
await redis.xadd(
  CHANNELS.STREAM_ORDERS_NEW, '*',
  'order_id', String(order.id),
  'user_id', String(userId),
  'symbol', symbol,
  'side', String(side),
  'order_type', String(order_type),
  'price', orderPrice ? String(orderPrice) : '',
  'quantity', String(qty)
)
// Python 端：XREADGROUP 消费 + XACK 确认`}</code></pre>
          </div>

          {/* 撮合引擎容灾重建 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">🛟 撮合引擎容灾重建</h3>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Python·高可用</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{`# 启动时从 Redis 快照重建订单簿
async def main():
    active = await load_active_orders(redis)
    rebuilt = engine.rebuild_from_active(active)
    print(f'从快照重建 {rebuilt} 笔挂单')
    # seen_ids 先就位，去重 Stream 重投递
    await asyncio.gather(
        *market_tasks, match_task, cancel_task
    )`}</code></pre>
          </div>

          {/* WS 通知 + invalidate */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">⚡ WS 通知即时刷新</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">前端·实时</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{`// 收到成交/状态通知 → 失效缓存即时刷新
function handleNotify(n: UserNotify) {
  if (n.type === 'trade') {
    qc.invalidateQueries({ queryKey: ['trading','orders'] })
    qc.invalidateQueries({ queryKey: ['trading','trades'] })
    qc.invalidateQueries({ queryKey: ['trading','account'] })
    qc.invalidateQueries({ queryKey: ['trading','positions'] })
  }
}`}</code></pre>
          </div>

          {/* Axios 泛型封装 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">📡 Axios 泛型封装</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">前端·工程</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{`// 统一响应类型，前后端共享契约
interface ApiResponse<T> {
  code: number; message: string; data: T
}
export const http = {
  get<T>(url: string): Promise<ApiResponse<T>> {
    return request.get(url) as Promise<ApiResponse<T>>
  },
}
// 拦截器：自动注入 Token + 剥离响应数据`}</code></pre>
          </div>

          {/* 风控统一出口 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">🛡️ 风控统一留痕出口</h3>
              <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded">后端·风控</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{`// 所有风控拒绝收口到一处：先记日志再抛错
async function rejectRisk({ userId, symbol,
  action, rule, message, detail }) {
  await logRisk(userId, symbol, action, rule,
    detail || message)   // 写入 risk_logs
  throw new RiskError(rule, message)
}
// 12 类拒绝全留痕，前端可查可聚合`}</code></pre>
          </div>

          {/* Python 运行器 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">🐍 在线 Python 运行器</h3>
              <span className="text-xs bg-lime-100 text-lime-700 px-2 py-1 rounded">后端·执行</span>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed"><code>{`// spawn 调本机 Python 执行用户提交的代码
const proc = spawn(PYTHON, [tmpFile], {
  cwd: os.tmpdir(),
  env: { ...process.env,
    PYTHONIOENCODING: 'utf-8' },
  windowsHide: true,
})
// 写临时文件 + 30s 超时 + 捕获 stdout/stderr
// 前端编辑器提交 → 返回真实结果（选股/分析）`}</code></pre>
          </div>
        </div>
      </section>

      {/* ===== 6 阶段交付 ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📈</span>
          <h2 className="text-2xl font-bold text-gray-900">分阶段交付</h2>
          <span className="text-sm text-gray-400">每阶段端到端验证</span>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 pr-4">阶段</th>
                <th className="pb-3 pr-4">内容</th>
                <th className="pb-3">验证</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['1 数据基座', '8 张表 + 种子，资金条 + 股票选择器', 'GET /account 返回 100 万'],
                ['2 行情闭环', 'Python 行情→Redis→WS→K 线+五档', 'K 线实时滚动'],
                ['3 下单+风控', '风控冻结落单，OrderForm+OrderList', '涨跌停被拒，资金冻结'],
                ['4 撮合+结算', 'Python 撮合，事务落库，TradeList', '持仓/资金/成本正确'],
                ['5 撤单+五档', '撤单链路，五档点价填单', '撤单冻结返还'],
                ['6 风控+容灾', 'risk_logs 全留痕，撮合重启重建簿', '杀 Python 挂单仍有效'],
              ].map(([stage, content, verify]) => (
                <tr key={stage} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 font-medium text-primary-600">{stage}</td>
                  <td className="py-2.5 pr-4 text-gray-700">{content}</td>
                  <td className="py-2.5 text-gray-500">{verify}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  三语言全栈：React/TS + Node.js + Python asyncio，Redis 解耦
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  实时行情闭环：几何布朗运动→Pub/Sub→WS→K 线/五档实时滚动
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  撮合引擎：价格优先+时间优先，Stream 可靠投递，事务结算资金守恒
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  撮合容灾：活跃快照重建订单簿，崩溃重启挂单不丢
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  12 类风控全留痕 + 撤单链路 + 五档联动点价填单
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  在线 Python 运行器：粘贴代码即运行，拉真实 A 股条件选股
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
                  跨进程一致性：Python 不碰 DB，资金真相源唯一在 MySQL
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  并发防超卖：带条件 UPDATE 原子校验 + 事务回滚
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  消息可靠：消费者组 + ACK + XPENDING/XCLAIM 兼容 Redis 5
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  实时联动：WS 通知 + React Query invalidate 毫秒级刷新
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">▸</span>
                  TypeScript 100% 覆盖，前后端共享类型契约
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 底部 CTA ===== */}
      <section className="text-center py-8">
        <div className="inline-flex flex-wrap justify-center gap-4">
          <Link to="/trading" className="btn-primary">
            📊 进入交易系统
          </Link>
          <Link to="/interview" className="btn-secondary">
            📚 查看面试题库
          </Link>
          <Link to="/" className="btn-secondary">
            🏠 返回首页
          </Link>
        </div>
      </section>
    </div>
  )
}
