/**
 * 🎯 面试考点：把「项目架构」变成可讲述的图
 *
 * 节点数据即讲稿：每个节点的 points 就是面试时的口述 bullet。
 * 面试被问「介绍下你的项目架构」时，直接打开本页按图讲。
 */

export type NodeTone = 'front' | 'gateway' | 'v1' | 'v2' | 'db' | 'infra'

export interface ArchNode {
  id: string
  x: number
  y: number
  w: number
  h: number
  title: string
  sub: string
  tone: NodeTone
  /** 点击后展示的讲解要点 */
  points: string[]
}

export interface ArchEdge {
  from: string
  to: string
  label?: string
}

export const TONE_STYLE: Record<NodeTone, { fill: string; stroke: string; text: string }> = {
  front: { fill: '#eff6ff', stroke: '#3b82f6', text: '#1d4ed8' },
  gateway: { fill: '#f5f3ff', stroke: '#8b5cf6', text: '#6d28d9' },
  v1: { fill: '#fff7ed', stroke: '#f97316', text: '#c2410c' },
  v2: { fill: '#ecfdf5', stroke: '#10b981', text: '#047857' },
  db: { fill: '#fefce8', stroke: '#eab308', text: '#a16207' },
  infra: { fill: '#fdf2f8', stroke: '#ec4899', text: '#be185d' },
}

export const NODES: ArchNode[] = [
  {
    id: 'browser',
    x: 370, y: 20, w: 300, h: 64,
    title: '浏览器 · React 19 SPA',
    sub: 'React Query / Zustand / Tailwind',
    tone: 'front',
    points: [
      'React Query 管理服务端缓存，Zustand 管客户端状态 —— 职责分离',
      '路由级 React.lazy + Suspense 代码分割，ErrorBoundary 隔离错误',
      'SSE/ReadableStream 处理流式响应，处理粘包/半包',
    ],
  },
  {
    id: 'gateway',
    x: 340, y: 130, w: 360, h: 64,
    title: 'Express :3000 单入口',
    sub: 'Strangler Pattern 渐进式迁移',
    tone: 'gateway',
    points: [
      '老系统不停机：新功能全部走 /api/v2，逐模块替换旧接口',
      '挂载槽注入：TS 子应用在旧 app.js 求值前挂到 globalThis，保证中间件顺序',
      '面试必答：为什么不重写？—— 重写风险大、周期长，绞杀者模式边跑边迁',
    ],
  },
  {
    id: 'v1',
    x: 80, y: 240, w: 320, h: 78,
    title: '旧 JS 路由 /api/*（交易）',
    sub: 'routes → controllers → services → models',
    tone: 'v1',
    points: [
      '经典四层分层：路由只做转发，业务在 service，SQL 在 model',
      'JWT 双 token + 刷新队列；Joi 校验；bcrypt 密码哈希',
      '与 Python 撮合引擎通过 Redis Streams 协作（异构系统通信）',
    ],
  },
  {
    id: 'v2',
    x: 620, y: 240, w: 340, h: 78,
    title: '新 TS 子应用 /api/v2',
    sub: 'helmet → pino → zod → 令牌桶 → cache-aside',
    tone: 'v2',
    points: [
      '中间件栈即防线：安全头 → requestId 链路日志 → 参数校验 → 限流 → 缓存',
      '统一 AppError + 422 校验错误格式；zod 契约前后端共享',
      '游标分页替代 offset：深分页不退化、抗数据漂移',
    ],
  },
  {
    id: 'mysql',
    x: 80, y: 390, w: 240, h: 70,
    title: 'MySQL',
    sub: '交易表 + lab_* 新表',
    tone: 'db',
    points: [
      '参数化查询防注入（/api/v2/security 有拼接对照演示）',
      '新表 lab_ 前缀物理隔离，旧表零改动',
      '唯一键兜底幂等：点赞/评论重复提交结果一致',
    ],
  },
  {
    id: 'redis',
    x: 400, y: 390, w: 240, h: 70,
    title: 'Redis',
    sub: '缓存 / Pub-Sub / Stream / BullMQ',
    tone: 'infra',
    points: [
      'cache-aside + 随机 TTL 防雪崩、空值缓存防穿透',
      'Pub/Sub 转发行情推送；Stream 传递订单给撮合引擎',
      'BullMQ 队列：通知异步化、失败指数退避重试、jobId 幂等去重',
    ],
  },
  {
    id: 'worker',
    x: 240, y: 500, w: 250, h: 50,
    title: 'BullMQ Worker',
    sub: 'concurrency=5 削峰消费',
    tone: 'infra',
    points: [
      '接口只入队立即返回，通知异步发送 —— 削峰 + 解耦',
      'at-least-once → 消费端必须幂等',
      '优雅关停：先停 Worker 再关队列',
    ],
  },
  {
    id: 'python',
    x: 560, y: 500, w: 250, h: 50,
    title: 'Python 撮合引擎',
    sub: 'Redis Streams 订单流',
    tone: 'infra',
    points: [
      'Node 收单写 Stream，Python 消费撮合 —— 异构系统用消息解耦',
      '引擎可独立重启，不阻塞 Web 服务',
    ],
  },
]

export const EDGES: ArchEdge[] = [
  { from: 'browser', to: 'gateway', label: 'HTTP / SSE / WS' },
  { from: 'gateway', to: 'v1', label: '旧接口零改动' },
  { from: 'gateway', to: 'v2', label: '挂载槽转交' },
  { from: 'v1', to: 'mysql' },
  { from: 'v2', to: 'mysql' },
  { from: 'v1', to: 'redis', label: '行情 Pub/Sub' },
  { from: 'v2', to: 'redis', label: '缓存 + 入队' },
  { from: 'redis', to: 'worker', label: '消费通知' },
  { from: 'redis', to: 'python', label: '订单 Stream' },
]
