export interface InterviewLink {
  title: string
  url: string
  site: string
}

export interface InterviewQuestion {
  id: string
  category: string
  difficulty: 'medium' | 'hard' | 'expert'
  title: string
  summary: string
  answer: string
  code?: string
  links: InterviewLink[]
}

export const categoryColors: Record<string, string> = {
  'React 原理': '#dbeafe',
  'V8 & 浏览器': '#fef3c7',
  '网络与协议': '#d1fae5',
  '工程化': '#e0e7ff',
  'TypeScript': '#ede9fe',
  'CSS 深入': '#fce7f3',
  '性能优化': '#fff7ed',
  '安全': '#fee2e2',
}

export const categoryTagColors: Record<string, string> = {
  'React 原理': 'tag-react',
  'V8 & 浏览器': 'tag-v8',
  '网络与协议': 'tag-network',
  '工程化': 'tag-engineering',
  'TypeScript': 'tag-typescript',
  'CSS 深入': 'tag-css',
  '性能优化': 'tag-performance',
  '安全': 'tag-security',
}

export const difficultyLabels: Record<string, string> = {
  medium: '中级',
  hard: '高级',
  expert: '专家',
}

export const interviewQuestions: InterviewQuestion[] = [
  {
    id: 'react-fiber',
    category: 'React 原理',
    difficulty: 'expert',
    title: 'React Fiber 架构是什么？它如何解决 Reconciliation 的性能瓶颈？',
    summary:
      'React Fiber 是 React 16 引入的全新协调引擎，将同步递归 Reconciliation 改为可中断的异步调度，核心是把 Virtual DOM 递归遍历改为链表遍历。',
    answer: `## 核心问题
React 15 使用递归遍历 Virtual DOM 树进行 diff，递归调用栈无法中断，当组件树非常庞大时会造成主线程卡顿（超过 16ms 掉帧）。

## Fiber 的核心设计
1. Fiber 节点：每个 Virtual DOM 节点对应一个 Fiber 节点，通过 firstChild、sibling、return 指针形成链表结构
2. 可中断的遍历：workLoop 循环执行单元工作，每次执行一个 Fiber 后检查是否需要让出主线程
3. 优先级调度：区分同步渲染（高优先级）和异步渲染（低优先级），通过 lane 模型管理
4. 两阶段提交：Render 阶段（可中断）构建新 Fiber 树，Commit 阶段（不可中断）执行 DOM 操作

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
    ],
  },
  {
    id: 'react-hooks',
    category: 'React 原理',
    difficulty: 'expert',
    title: 'React Hooks 的实现原理？为什么 Hooks 只能在函数最顶层调用？',
    summary:
      'Hooks 通过链表顺序存储在 Fiber 节点的 memoizedState 中，每次渲染按相同顺序读取。必须顶层调用是因为条件分支会改变调用顺序，导致读取错位。',
    answer: `## Hooks 的存储结构
每个函数组件对应一个 Fiber 节点，其 memoizedState 是一个单向链表：
- 每个 hook 对应链表中的一个节点
- 节点结构：{ memoizedState: state, next: nextHook }
- 多次渲染必须按相同顺序读取

## 挂载阶段
1. 创建 hook 对象 { memoizedState: initialState, next: null }
2. 将 hook 追加到 fiber.memoizedState 链表末尾
3. 更新 workInProgressHook 指针

## 更新阶段
1. 从 fiber.memoizedState 链表按顺序取出 hook
2. 如果取到的 hook 与当前 hook 对应，复用其 state
3. 如果取到 null，说明 Hooks 数量不一致（违反规则）

## 为什么不能条件调用
如果在条件语句中调用 Hook，不同渲染周期中 Hook 的数量和顺序可能不同，导致读取到错误的 state。这就是"Hook 必须在顶层调用"的原因。`,
    code: `// useState 简化实现
function useState(initialState) {
  const hook = updateWorkInProgressHook()
  
  if (hook.memoizedState === null) {
    // 挂载阶段
    hook.memoizedState = [initialState, dispatch]
  }
  
  return hook.memoizedState
}

// useEffect 简化实现
function useEffect(create, deps) {
  const hook = updateWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps
  
  if (hook.next === null) {
    // 挂载
    hook.next = {
      memoizedState: deps,
      create,
      destroy: undefined,
    }
  } else {
    // 更新：对比依赖
    const prevDeps = hook.next.memoizedState
    if (areDepsEqual(prevDeps, nextDeps)) {
      // 依赖没变，保留
    } else {
      hook.next = { memoizedState: nextDeps, create, destroy: undefined }
    }
  }
  
  pushEffect(hook.next) // 加入 effect 链表
}`,
    links: [
      { title: 'React Hooks 原理剖析 - 掘金', url: 'https://juejin.cn/post/6844904170119536648', site: '掘金' },
      { title: 'React Hooks 实现原理 - 知乎', url: 'https://zhuanlan.zhihu.com/p/343560745', site: '知乎' },
    ],
  },
  {
    id: 'react-key',
    category: 'React 原理',
    difficulty: 'hard',
    title: 'React 中 key 的作用是什么？为什么不能用 index 作为 key？',
    summary:
      'key 是 Virtual DOM 的"身份证"，React 在 diff 时通过 key 来判断节点身份，正确复用 DOM 节点。使用 index 作为 key 在列表增删时会导致 DOM 复用错误、组件状态错位。',
    answer: `## key 的作用
key 帮助 React 在 Reconciliation 时识别元素的身份，用于：
- 判断节点是新增、删除还是复用
- 正确复用 DOM 节点和组件实例
- 保留组件内部状态

## Diff 算法的 key 规则
1. 同层级节点比较时，先比较 type，再比较 key
2. type 和 key 都相同 → 复用节点，更新 props
3. type 或 key 不同 → 创建新节点，销毁旧节点

## 为什么不能用 index 作为 key
当列表发生增删操作时：
- index 会重新分配，导致 key 变化
- React 误判为不同节点，销毁旧节点、创建新节点
- 组件内部状态丢失或错位
- 性能下降（频繁创建销毁 DOM）

## 正确做法
使用业务中唯一且稳定的 ID 作为 key，例如数据库的 id 字段。`,
    links: [
      { title: 'React key 原理详解 - 掘金', url: 'https://juejin.cn/post/6844904167693873160', site: '掘金' },
    ],
  },
  {
    id: 'react-concurrent',
    category: 'React 原理',
    difficulty: 'expert',
    title: 'React 并发渲染和时间切片是怎么实现的？',
    summary:
      '并发渲染让 React 可以中断、恢复、跳过渲染工作。时间切片通过 MessageChannel 利用浏览器的空闲时间执行非紧急更新，避免阻塞主线程。',
    answer: `## 并发渲染
React 16 引入的 Concurrent Mode 允许渲染过程被中断：
- 可中断：渲染过程中可以暂停，优先处理更高优先级的工作
- 可恢复：暂停后可以在之后的时间点恢复执行
- 可跳过：如果优先级变更，可以跳过当前工作

## 时间切片原理
利用浏览器空闲时间执行渲染：
1. 通过 MessageChannel 创建消息通道
2. 当浏览器空闲时（对应宏任务），执行渲染工作
3. 如果时间片用完（16ms），让出主线程
4. 下次空闲时继续执行

## Scheduler 调度器
Scheduler 模块负责：
- 时间切片：shouldYield() 判断是否应该让出主线程
- 优先级调度：lane 模型区分同步/异步/交互/低优先级
- 宏任务驱动：通过 MessageChannel 触发 workLoop

## 与批量更新的关系
并发渲染 + 自动批处理：异步更新自动合并，减少渲染次数。`,
    links: [
      { title: 'React 并发模式深度解析 - 掘金', url: 'https://juejin.cn/post/6896200925449072654', site: '掘金' },
    ],
  },
  {
    id: 'react-batch',
    category: 'React 原理',
    difficulty: 'hard',
    title: 'React 的批量更新是如何实现的？什么场景下会失效？',
    summary:
      'React 18 默认所有更新自动批处理，React 17 及以下版本只有在 React 事件处理函数中的更新才会批处理。',
    answer: `## React 18 之前
- 批量更新：在 React 合成事件、生命周期中的多次 setState 会合并为一次渲染
- 非批量更新：setTimeout、原生事件中的 setState 每次都会触发独立渲染

## React 18 自动批处理
所有更新默认自动批处理，包括：
- React 事件处理函数
- setTimeout / setInterval
- Promise.then
- 原生事件
- 异步回调

## flushSync 脱离批处理
使用 ReactDOM.flushSync() 可以强制同步渲染：
- 将包裹的更新立即执行
- 绕过批处理机制

## 实现原理
React 18 将所有更新标记为 transition，统一调度：
- 常规更新：transition，自动批处理
- 紧急更新：非 transition，立即执行
- 调度器通过 lane 模型管理优先级`,
    links: [
      { title: 'React 18 自动批处理原理 - 掘金', url: 'https://juejin.cn/post/7126009203443486776', site: '掘金' },
    ],
  },
  {
    id: 'v8-gc',
    category: 'V8 & 浏览器',
    difficulty: 'expert',
    title: 'V8 引擎的垃圾回收机制是怎样的？Minor GC 和 Major GC 有什么区别？',
    summary:
      'V8 使用分代式 GC，将堆内存分为新生代和老生代。新生代空间小、回收频繁（Scavenge），老生代空间大、回收成本高（Mark-Sweep/Mark-Compact）。',
    answer: `## 内存分区
V8 将堆分为两大区域：

### 新生代（Young Generation）
- 分为 From 和 To 两个半空间，各 8MB（64位系统）
- 存放存活时间短的对象
- 采用 Scavenge 算法（复制算法）

### 老生代（Old Generation）
- 存放存活时间长的对象
- 初始大小 = 新生代 * 2 = 16MB，可扩容到 1.4GB（64位）
- 采用 Mark-Sweep 和 Mark-Compact 算法

## Scavenge 算法
1. 新生代分为 FROM 和 TO 两个半空间
2. 新对象分配在 FROM 空间
3. GC 时将存活对象从 FROM 复制到 TO
4. 存活对象年龄 +1（每经历一次 GC 增 1）
5. FROM 和 TO 交换角色

## 对象晋升
- 存活超过 15 次 GC 的对象晋升到老生代
- 新生代存活对象占用超过 25% 时也会晋升

## Mark-Sweep & Mark-Compact
- Mark：从 GC Root 出发，标记所有存活对象
- Sweep：清除未标记对象（会产生内存碎片）
- Compact：整理碎片，将存活对象向一端移动

## Minor GC vs Major GC
- Minor GC：新生代回收，速度快（5-20ms），频繁触发
- Major GC（Full GC）：老生代回收，速度慢（200ms+），较少触发
- 长期驻留对象和大对象直接分配在老生代`,
    links: [
      { title: 'V8 垃圾回收机制详解 - 掘金', url: 'https://juejin.cn/post/6844904160511946760', site: '掘金' },
    ],
  },
  {
    id: 'v8-eventloop',
    category: 'V8 & 浏览器',
    difficulty: 'expert',
    title: '浏览器事件循环（Event Loop）的微任务和宏任务执行顺序是怎样的？',
    summary:
      '浏览器 Event Loop: 执行栈 → 微任务队列 → 渲染 → 宏任务队列。微任务（Promise.then、MutationObserver）优先级高于宏任务（setTimeout、setInterval、I/O）。',
    answer: `## 执行模型
1. 执行栈：同步代码执行，调用栈管理
2. 任务队列：分为微任务队列（Microtask）和宏任务队列（Macrotask）
3. 事件循环：执行栈清空后先清空微任务，再执行一个宏任务

## 执行顺序
1. 执行同步代码（执行栈）
2. 清空所有微任务队列
3. 执行渲染（如果需要）
4. 从宏任务队列取一个任务执行
5. 回到第 2 步

## 宏任务
- script（整体代码）
- setTimeout / setInterval
- I/O / 网络请求回调
- UI 渲染
- postMessage / MessageChannel

## 微任务
- Promise.then / catch / finally
- MutationObserver
- queueMicrotask
- Object.observe（已废弃）

## 注意事项
- 宏任务执行后会清空所有微任务
- 微任务中创建的新微任务会在同一轮中清空
- React 18 使用 MessageChannel 将 setState 变为宏任务`,
    links: [
      { title: '浏览器事件循环 - 掘金', url: 'https://juejin.cn/post/7031249760955136014', site: '掘金' },
    ],
  },
  {
    id: 'v8-render',
    category: 'V8 & 浏览器',
    difficulty: 'hard',
    title: '浏览器的渲染流水线是怎样的？Layout、Paint、Composite 有什么区别？',
    summary:
      '渲染流水线：Style → Layout → Paint → Composite。Layout 计算几何信息，Paint 绘制像素，Composite 合成图层到屏幕。transform/opacity 只需要 Composite 阶段。',
    answer: `## 渲染流水线
JavaScript → Style → Layout → Paint → Composite

## 各阶段详解

### Style（样式计算）
- 根据 CSS 规则计算每个元素的最终样式
- 涉及 CSS 继承、层叠、默认值
- 输出：每个元素的 computedStyle

### Layout（布局/回流）
- 计算每个元素的几何信息（位置、尺寸）
- 建立渲染树的几何结构
- 输出：每个节点的位置和大小
- 触发条件：改变宽高、display、position 等

### Paint（绘制/重绘）
- 将渲染树转化为屏幕上的像素
- 分层绘制，按顺序填充像素
- 输出：各层的位图
- 触发条件：改变颜色、背景、visibility 等

### Composite（合成）
- 将各层位图合成到屏幕
- 使用 GPU 加速
- 触发条件：transform、opacity 等

## 性能优化
- 避免 JS 阻塞渲染
- 减少重排重绘，优先使用 transform/opacity
- 使用 will-change 提示浏览器优化
- 使用 Containment Properties 隔离渲染`,
    links: [
      { title: '浏览器渲染原理 - 掘金', url: 'https://juejin.cn/post/6844904162888849677', site: '掘金' },
    ],
  },
  {
    id: 'v8-memory',
    category: 'V8 & 浏览器',
    difficulty: 'hard',
    title: 'JavaScript 内存泄漏的常见场景有哪些？如何检测和定位？',
    summary:
      '常见内存泄漏：意外全局变量、未清理的定时器/事件监听、闭包持有 DOM、大数组未释放、缓存无限增长。',
    answer: `## 常见内存泄漏场景

### 1. 意外的全局变量
- 未声明的变量自动成为全局变量
- 解决：严格模式 / ESLint 检查

### 2. 未清理的定时器
- setTimeout / setInterval 的回调持有引用
- 解决：组件卸载时 clearTimeout / clearInterval

### 3. 事件监听器未移除
- addEventListener 后忘记 removeEventListener
- 解决：使用 once 选项或在销毁时移除

### 4. 闭包持有 DOM 引用
- 闭包中引用了 DOM 元素
- DOM 元素无法被回收
- 解决：及时置空引用

### 5. 大数组/大对象未释放
- 全局缓存无限增长
- 解决：使用 LRU 缓存、WeakMap、WeakSet

## 检测方法
1. Chrome DevTools → Memory 面板
2. 拍摄 Heap Snapshot 对比
3. 使用 Performance 面板录制内存曲线
4. Node.js 使用 --inspect + chrome://inspect

## 定位步骤
1. 打开 Memory 面板
2. 选择 Heap Snapshot
3. 操作页面复现泄漏
4. 再次拍摄 Snapshot
5. 对比两次 Snapshot 的 Retained Size`,
    links: [
      { title: 'JS 内存泄漏排查 - 掘金', url: 'https://juejin.cn/post/6844904171429771278', site: '掘金' },
    ],
  },
  {
    id: 'tcp-handshake',
    category: '网络与协议',
    difficulty: 'hard',
    title: 'TCP 三次握手为什么不是两次或四次？TIME_WAIT 状态的作用是什么？',
    summary:
      '三次握手是为了确认双方收发能力正常，防止已失效的连接请求报文段突然又传送到了服务端。TIME_WAIT 确保最后一个 ACK 能到达对方。',
    answer: `## 三次握手过程
1. 客户端 → 服务端：SYN=1, seq=x（客户端请求建立连接）
2. 服务端 → 客户端：SYN=1, ACK=1, seq=y, ack=x+1（服务端确认并请求建立连接）
3. 客户端 → 服务端：ACK=1, ack=y+1（客户端确认）

## 为什么不是两次？
防止已失效的连接请求报文段突然又传送到了服务端。如果只有两次握手：
- 客户端第一个请求因网络延迟未到达
- 客户端重发第二个请求，与服务端建立连接
- 第一个请求到达后，服务端误认为新请求，再次建立连接
- 结果：服务端分配了两个连接资源

## 为什么不是四次？
三次已经足够确认双方的收发能力：
1. 服务端确认客户端发送能力正常
2. 客户端确认服务端发送和接收能力正常
3. 服务端确认客户端接收能力正常

## TIME_WAIT 的作用
主动关闭方会进入 TIME_WAIT 状态，持续 2MSL：
1. 确保最后一个 ACK 能到达对方
2. 防止历史连接的干扰
3. 保证新连接的报文不被误认为历史报文`,
    links: [
      { title: 'TCP 三次握手详解 - 掘金', url: 'https://juejin.cn/post/6844904159374542600', site: '掘金' },
    ],
  },
  {
    id: 'http2',
    category: '网络与协议',
    difficulty: 'expert',
    title: 'HTTP/2 的核心特性有哪些？多路复用、头部压缩、服务器推送是怎么实现的？',
    summary:
      'HTTP/2 基于二进制分帧层，支持多路复用、HPACK 头部压缩、服务器推送、流优先级。多路复用解决了 HTTP/1.1 的队头阻塞问题。',
    answer: `## HTTP/1.1 的问题
1. 队头阻塞：每个请求需要独占一个 TCP 连接
2. 头部冗余：每个请求都要携带完整的 Header
3. 不支持服务端推送
4. 并发限制：同域名最多 6-8 个连接

## HTTP/2 核心特性

### 1. 二进制分帧层
- 将报文拆分为更小的帧
- 类型：DATA、HEADERS、SETTINGS、PUSH_PROMISE 等
- 提高传输效率

### 2. 多路复用
- 一个 TCP 连接上可以并发多个流
- 不同流的帧可以交错传输
- 解决应用层队头阻塞

### 3. HPACK 头部压缩
- 静态表：常见头部字段的索引映射
- 动态表：本次连接的自定义字段
- Huffman 编码：进一步压缩

### 4. 服务器推送
- 服务器可以主动推送资源
- 减少客户端请求次数
- 提升加载速度

### 5. 流优先级
- 客户端可以指定流的权重
- 服务器按权重分配带宽

## HTTP/3 (QUIC)
- 基于 UDP 而非 TCP
- 解决 TCP 层队头阻塞
- 0-RTT 握手，更快的连接建立`,
    links: [
      { title: 'HTTP/2 原理剖析 - 掘金', url: 'https://juejin.cn/post/6844904171559360520', site: '掘金' },
    ],
  },
  {
    id: 'browser-cache',
    category: '网络与协议',
    difficulty: 'hard',
    title: '浏览器缓存机制有哪些？强缓存和协商缓存的区别是什么？',
    summary:
      '浏览器缓存分为强缓存（Cache-Control/Expires）和协商缓存（ETag/Last-Modified）。强缓存不发请求，协商缓存发送条件请求由服务器判断。',
    answer: `## 缓存层级
1. Memory Cache：内存缓存，关闭标签页失效
2. Disk Cache：磁盘缓存，按规则存储
3. Service Worker Cache：独立缓存空间

## 强缓存（不发送请求）
### Cache-Control（HTTP/1.1 推荐）
- max-age=3600：缓存有效期（秒）
- no-cache：跳过缓存，发送请求
- no-store：完全不缓存
- public/private：是否允许中间代理缓存

### Expires（HTTP/1.0 已过时）
- 指定具体过期时间
- 受客户端时间影响，可能不准确

## 协商缓存（发送条件请求）
### Last-Modified / If-Modified-Since
- 响应头：Last-Modified（资源最后修改时间）
- 请求头：If-Modified-Since
- 服务器判断是否修改过

### ETag / If-None-Match
- 响应头：ETag（资源指纹，优先级高于 Last-Modified）
- 请求头：If-None-Match
- 服务器比对 ETag

## 缓存流程
1. 浏览器检查 Memory Cache → Disk Cache
2. 如果命中强缓存 → 直接使用
3. 如果没有强缓存 → 发送协商请求
4. 服务器返回 304 Not Modified → 使用缓存
5. 服务器返回 200 OK → 使用新资源并更新缓存

## 实际应用
- HTML：协商缓存（便于更新）
- CSS/JS：强缓存 + 文件名 hash（缓存更新策略）
- 图片：长有效期强缓存`,
    links: [
      { title: '浏览器缓存机制 - 掘金', url: 'https://juejin.cn/post/6844904171265187854', site: '掘金' },
    ],
  },
  {
    id: 'webpack-hmr',
    category: '工程化',
    difficulty: 'hard',
    title: 'Webpack 的 HMR（热模块替换）原理是什么？它与 Vite 的 HMR 有什么区别？',
    summary:
      'Webpack HMR 基于 webpack-dev-server + WebSocket 推送变更，对比模块差异后局部更新。Vite 基于浏览器原生 ESM，HMR 粒度更细、速度更快。',
    answer: `## Webpack HMR 原理
1. 启动阶段：webpack-dev-server 建立 WebSocket 连接
2. 文件变更：webpack 重新编译，对比模块差异，生成更新块
3. 推送更新：通过 WebSocket 将更新块推送到客户端
4. 模块替换：客户端接收更新，销毁旧模块，注入新模块
5. 链式依赖：如果依赖变更，受影响的模块也会更新

## HMR 核心代码
- Webpack 端：compiler.hooks 监听编译完成，生成 update chunk
- Server 端：通过 sockjs（WebSocket）发送更新信号
- Client 端：接收信号后调用 module.hot.apply() 执行替换

## Vite HMR 原理
1. 原生 ESM：每个模块都是独立的 HTTP 请求
2. 文件变更时：只需重新编译变更的文件
3. 通过 WebSocket 通知浏览器
4. 浏览器重新请求变更的 ESM 模块
5. 粒度：单个文件级别，速度更快

## 两者对比
- Webpack：先打包再编译，粒度粗，速度较慢
- Vite：原生 ESM，按需编译，粒度细，速度快 10-100 倍
- Vite 冷启动无需打包，Webpack 需要先打包

## HMR 实现关键
- 模块热替换 API：module.hot.accept()
- 状态保持：组件状态需要特殊处理才能在热更新中保留
- 清理函数：dispose 钩子清理副作用`,
    links: [
      { title: 'Webpack HMR 原理 - 掘金', url: 'https://juejin.cn/post/6844904171693238280', site: '掘金' },
      { title: 'Vite HMR 原理 - 知乎', url: 'https://zhuanlan.zhihu.com/p/356016337', site: '知乎' },
    ],
  },
  {
    id: 'monorepo',
    category: '工程化',
    difficulty: 'expert',
    title: 'Monorepo 架构如何设计？Turborepo、Nx、pnpm workspace 的工作原理是什么？',
    summary:
      'Monorepo 管理多个包在一个仓库。pnpm workspace 管理依赖、Turborepo/Nx 提供增量构建缓存。核心理念是依赖图驱动的任务编排。',
    answer: `## Monorepo 核心问题
1. 依赖管理：多个包共享依赖版本
2. 构建编排：按依赖顺序构建
3. 代码复用：共享组件、工具函数、类型定义
4. 版本管理：统一版本发布

## pnpm workspace
### 工作原理
- 通过 pnpm-workspace.yaml 定义包目录
- 自动提升共享依赖到根 node_modules
- 使用 workspace: 协议引用内部包

### 配置示例
packages:
  - 'packages/*'
  - 'apps/*'

### 优势
- 严格的依赖隔离（软链接 + 硬链接）
- 节省磁盘空间
- 更快的安装速度

## Turborepo
### 核心概念
- Pipeline：定义任务及其依赖关系
- Cache：基于输入 hash 的增量缓存
- Task Graph：依赖图驱动的任务编排

### 工作流程
1. 分析项目依赖图
2. 拓扑排序确定构建顺序
3. 计算任务输入的 hash
4. 如果缓存命中 → 跳过执行
5. 如果缓存未命中 → 执行任务并缓存结果

## Nx
### 核心特性
- 类似 Turborepo，但功能更丰富
- 强大的生成器（nx generate）
- 细粒度的增量缓存
- 支持 Angular/React/Vue 等框架

## 最佳实践
- 按业务域划分包，而非技术类型
- 统一的代码规范和提交规范
- 合理的依赖方向（单向依赖）
- 充分利用缓存加速开发构建`,
    links: [
      { title: 'Monorepo 架构实践 - 掘金', url: 'https://juejin.cn/post/7088426790899630135', site: '掘金' },
    ],
  },
  {
    id: 'vite',
    category: '工程化',
    difficulty: 'hard',
    title: 'Vite 的核心原理是什么？它是如何做到比 Webpack 快 10-100 倍的？',
    summary:
      'Vite 基于浏览器原生 ESM，开发时不打包，按需编译。生产使用 Rollup 打包。利用 esbuild 预构建依赖，冷启动速度极快。',
    answer: `## Vite 快的核心原因

### 1. 原生 ESM
- 开发时不打包，浏览器直接加载 ESM 模块
- 按需编译：只编译访问到的文件
- 冷启动速度：无需打包，毫秒级

### 2. esbuild 预构建
- 使用 Go 语言编写的预构建工具
- 比 JS 编写的工具快 10-100 倍
- 将 CommonJS/UMD 依赖转换为 ESM
- 预构建结果缓存在 node_modules/.vite

### 3. 按需编译
- 只转换需要处理的文件（如 JSX、TypeScript、CSS）
- 原生 ESM 直接处理 import 语句
- 未使用的文件不编译

### 4. 高效 HMR
- 基于 ESM 的细粒度替换
- 只更新变更的模块
- 无需刷新页面

## Vite 工作流程
1. 启动 dev server（基于 Koa）
2. 扫描项目依赖
3. esbuild 预构建第三方依赖（CJS/UMD → ESM）
4. 处理源文件（TS/JSX/Vue → ESM）
5. 返回转换后的模块
6. HMR：WebSocket 通知变更，浏览器重新请求

## Webpack vs Vite
| 特性 | Webpack | Vite |
|------|---------|------|
| 冷启动 | 慢（全量打包） | 快（按需编译） |
| HMR | 粒度粗 | 粒度细 |
| 生产构建 | 内置 | Rollup |
| 生态 | 成熟 | 快速发展 |

## 局限性
- 依赖 CJS/UMD 的库需要预构建
- 多页面应用需要额外配置
- 微前端场景有挑战`,
    links: [
      { title: 'Vite 核心原理 - 掘金', url: 'https://juejin.cn/post/6951766084495498254', site: '掘金' },
    ],
  },
  {
    id: 'ts-advanced',
    category: 'TypeScript',
    difficulty: 'expert',
    title: 'TypeScript 的条件类型、映射类型、模板字面量类型怎么用？',
    summary:
      '条件类型用 extends 做三元判断，映射类型遍历 key 生成新类型，模板字面量类型基于字符串拼接生成类型。',
    answer: `## 条件类型
条件类型的语法是 T extends U ? X : Y，类似于三元表达式。
- 基本用法：判断类型是否满足条件返回对应类型
- 分布式特性：当 T 是联合类型时，会自动分发到每个成员上
- infer 关键字：可以在条件类型中推断类型变量

## 映射类型
映射类型通过 keyof 遍历 T 的所有 key，生成新的类型。
- 基础映射：[P in keyof T] 遍历所有属性
- 修饰符：可添加 readonly、可选 ? 等
- as 重映射：可以改变 key 的名称

## 模板字面量类型
模板字面量类型基于字符串模板生成新的字符串类型。
- 使用 \`...\` 包裹字符串模式
- 通过 infer 提取字符串的部分内容
- 可以组合内置工具类型如 Uppercase、Capitalize

## 实战组合
三者组合可以实现：类型安全的路由定义、事件名推导、DTO 生成等高级功能。`,
    code: `// 条件类型
type IsString<T> = T extends string ? true : false
type A = IsString<'hello'>  // true

// 分布式条件类型
type ToArray<T> = T extends any ? T[] : never
type B = ToArray<string | number>  // string[] | number[]

// infer 提取类型
type Awaited<T> = T extends Promise<infer U> ? U : T
type Result = Awaited<Promise<string>>  // string

// 映射类型 - Partial 实现
type MyPartial<T> = {
  [P in keyof T]?: T[P]
}

// 模板字面量类型 - CamelCase
type CamelCase<S extends string> =
  S extends \`\${infer P}_\${infer C}\${infer R}\`
    ? \`\${P}\${Uppercase<C>}\${CamelCase<R>}\`
    : S
type Name = CamelCase<'my_name'>  // 'myName'`,
    links: [
      { title: 'TypeScript 高级类型体操 - 掘金', url: 'https://juejin.cn/post/6844904202577945614', site: '掘金' },
      { title: 'TS 类型体操挑战 - GitHub', url: 'https://github.com/type-challenges/type-challenges', site: 'GitHub' },
    ],
  },
  {
    id: 'ts-utility',
    category: 'TypeScript',
    difficulty: 'hard',
    title: 'TypeScript 中 Partial、Required、Pick、Omit、Record 等工具类型的实现原理？',
    summary:
      '这些工具类型都是基于映射类型和条件类型实现的。通过 keyof、in、extends 等关键字组合实现类型转换。',
    answer: `## 源码解析

### Partial<T>
核心：[P in keyof T] 遍历所有属性，加上 ? 可选修饰符

### Required<T>
核心：[P in keyof T]-? 移除可选修饰符，让所有属性变为必选

### Pick<T, K>
核心：[P in K] 只遍历指定的 key 子集

### Omit<T, K>
核心：Pick<T, Exclude<keyof T, K>> 通过排除 key 实现

### Record<K, V>
核心：[P in K] 遍历联合类型 K，值为 V 类型

### Exclude & Extract
- Exclude<T, U>：T extends U ? never : T，排除 U 中的成员
- Extract<T, U>：T extends U ? T : never，提取 U 中的成员

## 实战技巧
- 可以组合多个工具类型实现复杂类型转换
- 条件类型 + 映射类型可以实现深度递归处理
- 类型体操的核心是：infer 推断 + 分布式条件类型 + 模板字面量`,
    code: `// Partial<T> - 所有属性变可选
type Partial<T> = { [P in keyof T]?: T[P] }

// Required<T> - 所有属性变必选
type Required<T> = { [P in keyof T]-?: T[P] }

// Readonly<T> - 所有属性只读
type Readonly<T> = { readonly [P in keyof T]: T[P] }

// Pick<T, K> - 选取部分属性
type Pick<T, K extends keyof T> = { [P in K]: T[P] }

// Omit<T, K> - 排除部分属性
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>

// Record<K, V> - 键值对
type Record<K extends keyof any, V> = { [P in K]: V }

// DeepPartial - 递归可选
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}`,
    links: [
      { title: 'TypeScript 工具类型全解析 - 掘金', url: 'https://juejin.cn/post/7040780482973881395', site: '掘金' },
    ],
  },
  {
    id: 'css-bfc',
    category: 'CSS 深入',
    difficulty: 'hard',
    title: 'CSS 的 BFC（块格式化上下文）是什么？它如何解决 margin 折叠和浮动问题？',
    summary:
      'BFC 是一个独立的渲染区域，内部元素不会影响外部。可以通过 overflow:hidden、display:flow-root、position:absolute 等方式创建 BFC。',
    answer: `## BFC 是什么
BFC（Block Formatting Context）是 CSS 2.1 规范中的概念，指一个独立的块级渲染区域。在这个区域内：
- 盒子从上到下垂直排列
- 盒子的左边缘与容器左边缘对齐
- 垂直方向的空间由 margin 决定

## 如何创建 BFC
- overflow: hidden/auto/scroll
- display: flow-root（CSS3 推荐）
- position: absolute/fixed
- float: left/right
- display: inline-block/table-cell/flex/grid
- 根元素（html）

## BFC 的作用

### 1. 解决 margin 折叠
- 两个相邻块级元素的 margin 会发生折叠
- 创建 BFC 可以隔离 margin，防止折叠
- 方法：给其中一个元素包裹 overflow: hidden 的容器

### 2. 清除浮动
- 浮动元素脱离文档流
- 创建 BFC 的容器会包含浮动子元素
- 方法：给父容器设置 overflow: hidden

### 3. 防止浮动元素覆盖
- BFC 区域不会与浮动元素重叠
- 实现自适应布局
- 方法：给内容区创建 BFC

## 应用场景
- 两列自适应布局（左浮动 + 右 BFC）
- 清除浮动
- 防止 margin 折叠`,
    links: [
      { title: 'CSS BFC 详解 - 掘金', url: 'https://juejin.cn/post/6844904173060636680', site: '掘金' },
    ],
  },
  {
    id: 'css-flex',
    category: 'CSS 深入',
    difficulty: 'medium',
    title: 'Flexbox 的布局原理是什么？justify-content 和 align-items 的区别？',
    summary:
      'Flexbox 是一维布局模型，通过 flex container 和 flex item 实现。justify-content 控制主轴方向，align-items 控制交叉轴方向。',
    answer: `## Flex 核心概念
- 主轴（Main Axis）：flex-direction 指定的方向
- 交叉轴（Cross Axis）：与主轴垂直的方向
- flex container：设置了 display: flex 的容器
- flex item：容器内的直接子元素

## justify-content（主轴对齐）
- flex-start：起始对齐
- flex-end：末尾对齐
- center：居中对齐
- space-between：两端对齐，间距相等
- space-around：每项两侧间距相等
- space-evenly：所有间距相等

## align-items（交叉轴对齐）
- stretch：拉伸填满（默认）
- flex-start：起始对齐
- flex-end：末尾对齐
- center：居中对齐
- baseline：基线对齐

## flex 属性
- flex-grow：放大比例（默认 0）
- flex-shrink：缩小比例（默认 1）
- flex-basis：初始大小（默认 auto）
- flex: 1 1 0% = flex: 1

## 应用场景
- 导航栏布局
- 卡片列表
- 居中布局
- 自适应布局`,
    links: [
      { title: 'Flexbox 完全指南 - 掘金', url: 'https://juejin.cn/post/6844903411228370957', site: '掘金' },
    ],
  },
  {
    id: 'css-in-js',
    category: 'CSS 深入',
    difficulty: 'hard',
    title: 'CSS-in-JS、CSS Modules、Styled Components 的原理和区别？',
    summary:
      '三者都是解决样式隔离问题。CSS-in-JS 在运行时生成样式，CSS Modules 编译时生成唯一类名，Styled Components 基于 CSS-in-JS 增加组件化能力。',
    answer: `## CSS-in-JS
### 原理
- 运行时在 <head> 中插入 <style> 标签
- 通过 JS 对象描述样式
- 支持条件渲染、主题切换

### 代表库
- styled-components
- emotion
- aphrodite

### 优缺点
优点：动态样式、组件化、无需 CSS 文件
缺点：运行时开销、服务端渲染复杂

## CSS Modules
### 原理
- 编译时将类名转为唯一 hash 值
- 通过导入方式使用样式
- 构建工具（webpack/vite）支持

### 使用
- Button.module.css 文件
- import styles from './Button.module.css'
- className={styles.primary}

### 优缺点
优点：零运行时、简单易用、构建时处理
缺点：无法动态切换主题、全局样式仍需处理

## Styled Components
### 原理
- 基于 CSS-in-JS
- 通过模板字面量定义组件
- 自动生成唯一类名和 <style> 标签

### 使用
const Button = styled.button\`
  background: \${props => props.primary ? 'blue' : 'white'};
  color: \${props => props.primary ? 'white' : 'black'};
\`

### 优缺点
优点：组件级样式、动态主题、开发体验好
缺点：运行时开销、包体积较大

## 选择建议
- 简单项目：CSS Modules
- 复杂主题/动态样式：styled-components
- 追求性能：emotion（比 styled-components 更快）`,
    links: [
      { title: 'CSS-in-JS 对比 - 掘金', url: 'https://juejin.cn/post/7016890988951648295', site: '掘金' },
    ],
  },
  {
    id: 'performance-vitals',
    category: '性能优化',
    difficulty: 'hard',
    title: 'Web Vitals 指标有哪些？LCP、FID、CLS 分别衡量什么？如何优化？',
    summary:
      'Core Web Vitals 是 Google 衡量用户体验的核心指标：LCP 衡量加载性能，FID 衡量交互响应，CLS 衡量视觉稳定性。',
    answer: `## Core Web Vitals

### LCP (Largest Contentful Paint) - 加载性能
- 衡量：主要内容（最大元素）何时渲染完成
- 良好：< 2.5s
- 需要改进：2.5s - 4s
- 差：> 4s
- 优化：预加载、图片优化、CDN、减少重定向

### FID (First Input Delay) - 交互响应
- 衡量：用户首次交互的响应时间
- 良好：< 100ms
- 需要改进：100ms - 300ms
- 差：> 300ms
- 优化：代码分割、减少主线程阻塞、Web Worker

### CLS (Cumulative Layout Shift) - 视觉稳定性
- 衡量：页面布局偏移的累积分数
- 良好：< 0.1
- 需要改进：0.1 - 0.25
- 差：> 0.25
- 优化：预留图片/广告位、避免动态插入内容

## 其他指标
- TTFB（Time to First Byte）：服务端响应时间
- FCP（First Contentful Paint）：首次内容绘制
- TBT（Total Blocking Time）：主线程阻塞总时间
- LCP 替代旧的 FP/FCP 成为主要加载指标

## 检测工具
- Chrome DevTools → Lighthouse
- PageSpeed Insights
- Web Vitals 扩展
- Chrome User Experience Report
- web-vitals npm 包`,
    links: [
      { title: 'Core Web Vitals 优化指南 - 掘金', url: 'https://juejin.cn/post/7158815829391192078', site: '掘金' },
    ],
  },
  {
    id: 'code-splitting',
    category: '性能优化',
    difficulty: 'hard',
    title: '代码分割（Code Splitting）有哪些方式？React.lazy、动态 import、路由级分割怎么用？',
    summary:
      '代码分割将代码按模块拆分，按需加载。方式包括：路由级分割、组件级分割、第三方库分离、动态 import。',
    answer: `## 代码分割方式

### 1. 路由级分割（推荐优先使用）
- 按路由将代码拆分为独立 chunk
- 使用 React.lazy + Suspense
- 每个路由按需加载

const Dashboard = React.lazy(() => import('./Dashboard'))

### 2. 组件级分割
- 大组件单独打包
- 条件渲染时加载
- 配合 Suspense 显示 loading

### 3. 第三方库分离
- 将不常变化的依赖单独打包
- 利用浏览器缓存
- 配置 webpack splitChunks

### 4. 动态 import
- 运行时按需加载模块
- 返回 Promise
- 配合 webpack 自动生成 chunk

## React.lazy 和 Suspense
const OtherComponent = React.lazy(() => import('./OtherComponent'))

function MyApp() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OtherComponent />
    </Suspense>
  )
}

## 最佳实践
- 优先路由级分割
- 大型图表/编辑器等组件级分割
- 第三方库单独打包
- 设置合理的缓存策略

## 与预加载结合
- prefetch：空闲时预加载下一页面
- preload：高优先级预加载
- 提升用户体验`,
    links: [
      { title: '代码分割实战 - 掘金', url: 'https://juejin.cn/post/6844904168387153934', site: '掘金' },
    ],
  },
  {
    id: 'xss',
    category: '安全',
    difficulty: 'hard',
    title: 'XSS 攻击的原理是什么？如何从前端角度防御 XSS？',
    summary:
      'XSS 是在页面中注入恶意脚本执行。分为反射型、存储型、DOM 型。防御方法：输入校验、输出转义、CSP、HttpOnly Cookie、DOMPurify。',
    answer: `## XSS 攻击类型

### 1. 反射型 XSS
- URL 参数注入恶意脚本
- 例子：搜索框 <script>alert('XSS')</script>
- 危害：欺骗用户点击链接

### 2. 存储型 XSS（危害最大）
- 恶意脚本存储到服务器
- 其他用户访问时触发
- 常见于评论、昵称、留言板

### 3. DOM 型 XSS
- 前端直接使用用户输入操作 DOM
- 不经过后端
- eval、innerHTML、document.write 等危险 API

## 防御方法

### 1. 输入校验
- 服务端校验：长度、类型、格式
- 客户端校验：正则过滤非法字符
- 使用 allowlist 而非 blocklist

### 2. 输出转义
- HTML 转义：< > & " '
- URL 转义：encodeURIComponent
- JS 转义：JSON.stringify
- 使用模板引擎自动转义

### 3. CSP（Content Security Policy）
- 限制脚本来源
- 禁止 inline script 和 eval
- 配置示例：
  Content-Security-Policy: default-src 'self'; script-src 'self'

### 4. Cookie 安全
- HttpOnly：禁止 JS 读取 Cookie
- Secure：HTTPS 传输
- SameSite：限制跨站发送

### 5. 使用安全库
- DOMPurify：清理 HTML
- React/Vue 默认转义
- 避免使用 dangerouslySetInnerHTML`,
    links: [
      { title: 'XSS 攻击防御 - 掘金', url: 'https://juejin.cn/post/6844904172572897288', site: '掘金' },
    ],
  },
  {
    id: 'cors',
    category: '安全',
    difficulty: 'hard',
    title: 'CORS 跨域的完整流程是怎样的？简单请求和预检请求有什么区别？',
    summary:
      'CORS 通过 HTTP 头部实现跨域资源共享。简单请求直接发送，预检请求先 OPTIONS 协商。',
    answer: `## 跨域原因
浏览器的同源策略：协议、域名、端口三者必须相同。

## CORS 解决方案

### 简单请求
满足所有条件：
- 方法：GET/POST/HEAD
- Content-Type：text/plain、application/x-www-form-urlencoded、multipart/form-data
- 不使用自定义请求头

流程：
1. 浏览器直接发送请求
2. 服务器返回 Access-Control-Allow-Origin 等头部
3. 浏览器判断是否允许跨域

### 预检请求（Preflight）
不满足简单请求条件时触发：

1. 浏览器发送 OPTIONS 请求，携带：
   - Origin：请求源
   - Access-Control-Request-Method：实际请求方法
   - Access-Control-Request-Headers：自定义头

2. 服务器返回：
   - Access-Control-Allow-Origin：允许的源
   - Access-Control-Allow-Methods：允许的方法
   - Access-Control-Allow-Headers：允许的头
   - Access-Control-Max-Age：预检缓存时间

3. 浏览器发送实际请求

## 关键头部
- Access-Control-Allow-Origin：允许的源（不能用 * + 凭证）
- Access-Control-Allow-Credentials：是否允许携带 Cookie
- Access-Control-Expose-Headers：允许 JS 读取的响应头

## 关键注意事项
- 不能使用通配符 + 凭证（Credentials）
- 凭证模式下必须指定具体 Origin
- Vite dev server proxy 可以开发时绕过 CORS`,
    code: `// Express CORS 配置
const cors = require('cors')

// 允许所有源（不安全）
app.use(cors())

// 指定源（推荐）
app.use(cors({
  origin: ['http://localhost:5173', 'https://example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}))`,
    links: [
      { title: 'CORS 跨域详解 - 掘金', url: 'https://juejin.cn/post/6844904170556149640', site: '掘金' },
      { title: 'MDN CORS 文档', url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS', site: '其他' },
    ],
  },
  {
    id: 'csrf',
    category: '安全',
    difficulty: 'hard',
    title: 'CSRF 攻击原理是什么？SameSite Cookie 和 Token 验证如何防御？',
    summary:
      'CSRF 诱导已登录用户在不知情的情况下发送请求。防御方法：SameSite Cookie、CSRF Token、Referer/Origin 校验、Double Submit Cookie。',
    answer: `## CSRF 攻击原理
1. 用户已登录目标网站 A，Cookie 保存在浏览器
2. 用户访问恶意网站 B
3. 网站 B 包含向网站 A 发送请求的代码
4. 浏览器自动携带网站 A 的 Cookie
5. 网站 A 误认为是用户的合法请求

## 攻击场景
- 银行转账：表单自动提交
- 密码修改：AJAX 自动请求
- 使用 <img> 标签：GET 请求自动触发

## 防御方法

### 1. SameSite Cookie
- Strict：完全禁止第三方 Cookie
- Lax：允许导航请求的 Cookie
- None：允许所有（必须 Secure）
- 配置：Set-Cookie: session=xxx; SameSite=Lax

### 2. CSRF Token
- 服务端生成 Token 存入 Session
- 客户端请求时携带 Token
- 服务端校验 Token 是否匹配
- 表单：<input type="hidden" name="_token" value="xxx">
- AJAX：X-CSRF-Token 请求头

### 3. Referer/Origin 校验
- 检查请求来源是否合法
- 简单有效，但不是绝对安全
- 注意：Referer 可能被省略

### 4. Double Submit Cookie
- 客户端 Cookie + 表单 Token
- 服务端验证两者是否匹配
- 无需 Session 存储

### 5. 关键操作二次确认
- 短信验证码
- 密码确认
- 降低攻击危害`,
    links: [
      { title: 'CSRF 攻击防御 - 掘金', url: 'https://juejin.cn/post/6844904172340801566', site: '掘金' },
    ],
  },
]

export function getCategories(): string[] {
  const categories = new Set(interviewQuestions.map(q => q.category))
  return Array.from(categories)
}

export function getQuestionsByCategory(category: string): InterviewQuestion[] {
  return interviewQuestions.filter(q => q.category === category)
}

export function searchQuestions(keyword: string): InterviewQuestion[] {
  const lower = keyword.toLowerCase()
  return interviewQuestions.filter(
    q =>
      q.title.toLowerCase().includes(lower) ||
      q.summary.toLowerCase().includes(lower) ||
      q.answer.toLowerCase().includes(lower),
  )
}
