import { TechPoint } from './types'

export const reactPoints: TechPoint[] = [
  {
    id: 'react-fiber',
    category: 'React 原理',
    depth: 'principle',
    title: 'React Fiber 架构是什么？它如何解决 Reconciliation 的性能瓶颈？',
    summary:
      'React Fiber 是 React 16 引入的全新协调引擎，将同步递归 Reconciliation 改为可中断的异步调度，核心是把 Virtual DOM 递归遍历改为链表遍历。',
    answer: `## 核心问题：Stack Reconciliation 的缺陷
React 15 使用递归遍历 Virtual DOM 树进行 diff，递归调用栈无法中断，当组件树非常庞大时会造成主线程卡顿（超过 16ms 掉帧）。

## Fiber 的核心设计
1. **Fiber 节点**：每个 Virtual DOM 节点对应一个 Fiber 节点，通过 firstChild、sibling、return 指针形成链表结构
2. **可中断的遍历**：workLoop 循环执行单元工作，每次执行一个 Fiber 后检查是否需要让出主线程
3. **优先级调度**：区分同步渲染（高优先级）和异步渲染（低优先级），通过 lane 模型管理
4. **两阶段提交**：Render 阶段（可中断）构建新 Fiber 树，Commit 阶段（不可中断）执行 DOM 操作

## 调度流程
1. 触发 setState → 创建 update 对象 → 加入 updateQueue
2. 调度器 markUpdateLaneFromFiberToRoot 向上遍历到根节点
3. scheduleWork → ensureRootIsScheduled 启动或复用调度任务
4. performWorkOnRoot 执行 workLoop，逐个处理 Fiber 节点
5. 收集完所有 effect 后进入 commitRoot 提交阶段`,
    code: `// Fiber 节点简化结构
function FiberNode(tag, pendingProps, key, mode) {
  this.tag = tag              // 类型标记
  this.key = key
  this.type = null            // 组件函数/class
  this.stateNode = null       // DOM 节点或类组件实例
  this.return = null          // 父 Fiber
  this.child = null           // 第一个子 Fiber
  this.sibling = null         // 下一个兄弟 Fiber
  this.memoizedState = null   // 上一次 state
  this.updateQueue = null     // 更新队列
  this.effectTag = 0          // 副作用标记
}

// 可中断的 workLoop
function workLoop(root, expirationTime) {
  let current = root
  while (current) {
    if (shouldYield()) break  // 让出主线程
    current = performUnitOfWork(current)
  }
  if (current === null && root.pendingWorkPriority !== NoWork) {
    commitRoot(root)
  }
}`,
    links: [
      { title: 'React Fiber 架构深度解析 - 掘金', url: 'https://juejin.cn/post/684490418257276161', site: '掘金' },
      { title: 'React 技术揭秘 Fiber 架构 - 知乎', url: 'https://zhuanlan.zhihu.com/p/37022483', site: '知乎' },
      { title: 'React Fiber 源码剖析 - CSDN', url: 'https://blog.csdn.net/weixin_42316454/article/details/124171973', site: 'CSDN' },
    ],
  },
  {
    id: 'react-hooks-principle',
    category: 'React 原理',
    depth: 'principle',
    title: 'React Hooks 的实现原理？为什么 Hooks 只能在函数最顶层调用？',
    summary:
      'Hooks 通过链表顺序存储在 Fiber 节点的 memoizedState 中，每次渲染按相同顺序读取。必须顶层调用是因为条件分支会改变调用顺序，导致读取错位。',
    answer: `## Hooks 的存储结构
每个函数组件对应一个 Fiber 节点，其 memoizedState 是一个单向链表：
- 每个 hook 对应链表中的一个节点
- 节点结构：{ memoizedState: state, next: nextHook }
- 多次渲染必须按相同顺序读取

## 挂载阶段 (mountWorkInProgress)
1. 创建 hook 对象 { memoizedState: initialState, next: null }
2. 将 hook 追加到 fiber.memoizedState 链表末尾
3. 更新 workInProgressHook 指针

## 更新阶段 (updateWorkInProgress)
1. 从 fiber.memoizedState 链表按顺序取出 hook
2. 如果取到的 hook 与当前 hook 对应，复用其 state
3. 如果取到 null，说明 Hooks 数量不一致（违反规则）

## 为什么不能条件调用
当 cond 变化时，第二个 useState 读取的是第一个 useState 的 state，造成数据错乱。`,
    code: `// Hooks 链表结构
function mountState(initialState) {
  const hook = mountWorkInProgressHook()
  hook.memoizedState = initialState
  const queue = { pending: null, dispatch: null }
  hook.queue = queue
  return [hook.memoizedState, dispatch.bind(null, queue)]
}

// 错误示例 - 违反 Hooks 规则
function BadComponent({ show }) {
  if (show) {
    const [a, setA] = useState('a')  // 位置 0
  }
  const [b, setB] = useState('b')   // 位置 1 → 当 show=true 时错位！
}`,
    links: [
      { title: 'React Hooks 源码剖析 - 掘金', url: 'https://juejin.cn/post/717823663591870876', site: '掘金' },
      { title: '深入浅出 React Hooks 原理 - 知乎', url: 'https://zhuanlan.zhihu.com/p/349287905', site: '知乎' },
      { title: 'React Hooks 实现原理 - CSDN', url: 'https://blog.csdn.net/qq_39033149/article/details/123490814', site: 'CSDN' },
    ],
  },
  {
    id: 'react-key',
    category: 'React 原理',
    depth: 'implementation',
    title: 'React 中 key 的作用是什么？为什么不能用 index 作为 key？',
    summary:
      'key 帮助 React 在 Reconciliation 时识别元素的身份，正确复用 DOM 节点。使用 index 作为 key 在列表增删时会导致 DOM 复用错误、组件状态错位。',
    answer: `## key 的作用
key 是 Virtual DOM 的"身份证"，React 在 diff 时通过 key 来判断：
- 节点是新增还是删除
- 节点是否可以复用
- 节点的移动顺序

## Diff 过程
同层节点比较时，React 使用 key 建立新旧节点的对应关系：
1. 没有 key：按顺序逐个比对，O(n) 复杂度
2. 有 key：使用 Map 建立 key→node 的映射，O(1) 查找

## 为什么不能用 index
当列表顺序变化时（如头部插入、删除中间项）：
- index 变化导致 React 错误地将旧节点的 DOM 复用到新节点
- 组件内部状态（input value、动画状态等）会错位
- 触发不必要的重渲染和 DOM 操作`,
    code: `// ❌ 错误：用 index 做 key
items.map((item, index) => <Item key={index} {...item} />)

// ✅ 正确：用唯一 id 做 key
items.map((item) => <Item key={item.id} {...item} />)`,
    links: [
      { title: 'React key 属性深入理解 - 掘金', url: 'https://juejin.cn/post/684490417515776410', site: '掘金' },
      { title: '为什么 React 不能用 index 做 key - CSDN', url: 'https://blog.csdn.net/liyuanbhu/article/details/121759685', site: 'CSDN' },
    ],
  },
  {
    id: 'react-concurrent',
    category: 'React 原理',
    depth: 'principle',
    title: 'React 并发渲染和时间切片是怎么实现的？',
    summary:
      '并发渲染让 React 可以中断、恢复、跳过渲染工作。时间切片通过 MessageChannel 利用浏览器的空闲时间执行非紧急更新，避免阻塞主线程。',
    answer: `## 核心概念
- 同步渲染：render → commit 不可中断
- 并发渲染：render 可中断，commit 仍不可中断
- 时间切片：每帧只执行 5ms 的工作，让出时间给浏览器绘制

## Scheduler 调度器
React 内置 Scheduler 包，实现基于优先级的协作式调度：
- ImmediatePriority（同步，不可中断）
- UserBlockingPriority（用户交互）
- NormalPriority（普通更新）
- LowPriority（低优先级更新）
- IdlePriority（空闲时执行）

## MessageChannel 时间切片
1. React 通过 MessageChannel 创建宏任务
2. 在宏任务中检查 shouldYield()（当前时间片是否用完）
3. 如果用完则让出主线程，下一帧继续
4. 如果有更高优先级任务，则丢弃当前工作`,
    code: `// 简化的 Scheduler 实现
const channel = new MessageChannel()
let currentTask = null
const frameInterval = 5

function scheduleCallback(task) {
  currentTask = task
  channel.port1.postMessage(null)
}

channel.port2.onmessage = () => {
  const deadline = getCurrentTime() + frameInterval
  while (currentTask) {
    if (shouldYield(deadline)) break
    currentTask = currentTask()
  }
  if (currentTask) channel.port1.postMessage(null)
}`,
    links: [
      { title: 'React Concurrent Mode 深度解析 - 掘金', url: 'https://juejin.cn/post/684490419603989095', site: '掘金' },
      { title: 'React 时间切片原理 - 知乎', url: 'https://zhuanlan.zhihu.com/p/80330876', site: '知乎' },
    ],
  },
  {
    id: 'react-batching',
    category: 'React 原理',
    depth: 'implementation',
    title: 'React 的批量更新是如何实现的？什么场景下会失效？',
    summary:
      'React 18 默认所有更新自动批处理，React 17 及以下版本只有在 React 事件处理函数中的更新才会批处理，setTimeout、原生事件中的更新不会。',
    answer: `## React 18 之前
- 批量更新：在 React 合成事件、生命周期中的多次 setState 会合并为一次渲染
- 非批量更新：setTimeout、原生事件中的 setState 每次都会触发独立渲染

## React 18 之后
- 自动批处理：所有更新自动合并，无论在什么上下文中调用
- 实现原理：Scheduler 的 lane 模型统一调度所有 update
- flushSync 可强制同步刷新`,
    code: `// React 17 中的批量更新标记
let isBatchingUpdates = false
function batchedUpdates(fn) {
  const previous = isBatchingUpdates
  isBatchingUpdates = true
  try { return fn() }
  finally { isBatchingUpdates = previous }
}

// React 18 自动批处理
setTimeout(() => {
  setCount(c => c + 1)
  setCount(c => c + 1)
  // React 18: 只触发一次渲染
  // React 17: 触发两次渲染
})`,
    links: [
      { title: 'React 批量更新机制详解 - 掘金', url: 'https://juejin.cn/post/709497608808321646', site: '掘金' },
      { title: 'React setState 批量更新原理 - CSDN', url: 'https://blog.csdn.net/zhangchenglong2/article/details/121716875', site: 'CSDN' },
    ],
  },
  {
    id: 'react-zustand-state',
    category: 'React 原理',
    depth: 'implementation',
    title: 'Zustand 状态管理如何工作？相比 Context/Redux 有什么优势？为什么 auth 状态用它？',
    summary:
      'Zustand 用闭包维护 store，组件通过 selector 订阅切片，set 更新触发精准重渲染。比 Context 无 Provider 嵌套且避免全树重渲染，比 Redux 样板少，适合 auth 这类全局高频读状态。',
    answer: `## Zustand 核心原理
1. **store 是闭包**：\`create()\` 返回一个 hook，内部用闭包维护 state
2. **selector 订阅切片**：\`useStore(s => s.user)\` 只订阅 user，其他切片变化不触发重渲染
3. **set 更新 + 发布**：\`set({ user })\` 更新 state 并通知所有订阅者，订阅者用 selector 取值比对决定是否重渲染
4. **无 Provider**：store 是模块级单例，组件直接 import 使用，不需要包裹 Provider

## 对比 Context
| | Context | Zustand |
|---|---|---|
| Provider | 必须嵌套 | 不需要 |
| 重渲染 | value 变化全树重渲染 | selector 精准订阅 |
| 性能 | 大 state 拖累 | 切片订阅高效 |
| 学习成本 | 低 | 低 |

Context 的痛点：Context value 任何变化，所有 useContext 消费者全部重渲染，即使只用其中一字段。auth 状态（user/token/isAuthenticated）变化频繁，Context 会导致全树重渲染。

## 对比 Redux
Redux 要 reducer/action/selector/connect，样板代码多。Zustand 一个 set 搞定，API 极简，TS 友好。

## 本项目 auth store 设计
- **state**：user、accessToken、refreshToken、isAuthenticated、isLoading、error
- **actions**：setAuth（登录）、logout（登出）、setAccessToken（刷新）
- **持久化**：手动 localStorage 存取 token，刷新页面不丢登录态
- **工具函数**：getAccessToken/isTokenExpired 给 WS 和 axios 拦截器用，不订阅组件

## 为什么不用 useReducer + Context
auth 状态被 WS 客户端、axios 拦截器、多个页面读取。Context 需要在组件树内才能用，而 WS/axios 是模块级代码，无法用 hook。Zustand 的 getState/setState 模块级可调，完美匹配。`,
    code: `import { create } from 'zustand'

// 模块级单例 store，无需 Provider
export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: loadUser(),
  accessToken: loadTokens().accessToken,
  isAuthenticated: !!loadTokens().accessToken,
  setAuth: (user, accessToken, refreshToken) => {
    saveTokens(accessToken, refreshToken)   // 持久化
    set({ user, accessToken, refreshToken, isAuthenticated: true })
  },
  logout: () => {
    clearAuth()
    set({ user: null, accessToken: null, isAuthenticated: false })
  },
}))

// 组件：selector 订阅切片，精准重渲染
const user = useAuthStore((s) => s.user)         // 只订阅 user
const logout = useAuthStore((s) => s.logout)      // 只订阅 action

// 模块级代码（WS/axios）：直接 getState，不用 hook
import { useAuthStore } from '@/store/auth'
const token = useAuthStore.getState().accessToken // 非 React 环境可用`,
    links: [
      { title: 'Zustand 状态管理详解 - 掘金', url: 'https://juejin.cn/post/7119400155124066311', site: '掘金' },
      { title: 'Zustand vs Context vs Redux - 知乎', url: 'https://zhuanlan.zhihu.com/p/149405307', site: '知乎' },
    ],
  },
]
