import { TechPoint } from './types'

export const v8Points: TechPoint[] = [
  {
    id: 'v8-gc',
    category: 'V8 & 浏览器',
    depth: 'principle',
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

## 对象晋升（Promotion）
当对象经历 1 次 Scavenge 仍存活，或 To 空间占用超过 25%，晋升到老生代。

## Mark-Sweep & Mark-Compact
- Mark-Sweep：标记垃圾对象 → 清除，会产生碎片
- Mark-Compact：标记 → 清除 → 整理，无碎片但开销大

## 全垃圾回收
当老生代空间不足时触发 Full GC（全局标记+整理），成本极高。`,
    code: `// 新生代内存结构
// ┌──────────────┬──────────────┐
// │   From (8MB)  │   To (8MB)   │
// └──────────────┴──────────────┘
//        ↕ 存活对象复制
// ┌──────────────┬──────────────┐
// │   To (8MB)    │  From (8MB)  │
// └──────────────┴──────────────┘

// 优化：避免内存泄漏的最佳实践
// 1. 及时解除引用（闭包、事件监听、定时器）
// 2. 避免大对象常驻内存
// 3. 使用 WeakMap/WeakSet 存储临时数据`,
    links: [
      { title: 'V8 垃圾回收机制深度解析 - 掘金', url: 'https://juejin.cn/post/5126498858889574478', site: '掘金' },
      { title: 'V8 引擎内存管理与 GC - 知乎', url: 'https://zhuanlan.zhihu.com/p/25405517', site: '知乎' },
      { title: 'V8 垃圾回收算法详解 - CSDN', url: 'https://blog.csdn.net/qq_36842797/article/details/120047840', site: 'CSDN' },
    ],
  },
  {
    id: 'event-loop',
    category: 'V8 & 浏览器',
    depth: 'principle',
    title: '浏览器事件循环（Event Loop）的微任务和宏任务执行顺序是怎样的？',
    summary:
      '浏览器 Event Loop: 执行栈 → 微任务队列 → 渲染 → 宏任务队列。微任务（Promise.then、MutationObserver）优先级高于宏任务（setTimeout、setInterval、I/O）。',
    answer: `## 执行模型
1. 执行栈：同步代码执行，调用栈管理
2. 任务队列：分为微任务队列（Microtask）和宏任务队列（Macrotask）
3. 事件循环：持续取出任务执行

## 执行顺序
1. 执行当前执行栈中的同步代码
2. 清空微任务队列（Microtask Queue）
3. DOM 更新/rAF 回调
4. 执行一个宏任务（Macrotask Queue）
5. 回到第 2 步

## 常见任务类型
**宏任务**：script 整体代码、setTimeout/setInterval、setImmediate、I/O、UI 渲染、MessageChannel
**微任务**：Promise.then/catch/finally、MutationObserver、queueMicrotask`,
    code: `// 典型问题
console.log('1')

setTimeout(() => {
  console.log('2')
  Promise.resolve().then(() => console.log('3'))
}, 0)

new Promise((resolve) => {
  console.log('4')
  resolve()
}).then(() => {
  console.log('5')
})

console.log('6')

// 输出：1 → 4 → 6 → 5 → 2 → 3
// 执行过程：
// 同步: 1, 4, 6
// 微任务: 5
// 渲染
// 宏任务(1): 2
// 微任务: 3`,
    links: [
      { title: '浏览器 Event Loop 机制详解 - 掘金', url: 'https://juejin.cn/post/7227044953410564107', site: '掘金' },
      { title: '从一道题彻底理解 Event Loop - 知乎', url: 'https://zhuanlan.zhihu.com/p/87237020', site: '知乎' },
      { title: 'JavaScript 事件循环机制 - CSDN', url: 'https://blog.csdn.net/weixin_44015903/article/details/115719724', site: 'CSDN' },
    ],
  },
  {
    id: 'browser-render',
    category: 'V8 & 浏览器',
    depth: 'implementation',
    title: '浏览器的渲染流水线是怎样的？Layout、Paint、Composite 有什么区别？',
    summary:
      '渲染流水线：Style → Layout → Paint → Composite。Layout 计算几何信息，Paint 绘制像素，Composite 合成图层到屏幕。transform/opacity 只需要 Composite 阶段。',
    answer: `## 渲染流水线
JavaScript → Style → Layout → Paint → Composite

## 各阶段解释
### Style（样式计算）
- 计算每个节点的最终样式
- 处理 CSS 继承、优先级、变量
- 输入：HTML + CSS → 输出：Computed Style

### Layout（布局/重排）
- 计算每个节点的位置和尺寸
- 建立 DOM 节点的几何信息
- 触发：修改 width/height/margin/padding/display 等

### Paint（绘制/重绘）
- 将 Layout Tree 转换为像素
- 不改变几何结构，只改变视觉表现
- 触发：修改 color/background/shadow/visibility 等

### Composite（合成）
- 将多个图层合成到一张画面
- 使用 GPU 加速
- 触发：修改 transform/opacity/filter 等

## 性能优化策略
1. 避免重排：使用 transform 替代 top/left
2. 避免重绘：使用 opacity 替代 color
3. Will Change：提前告知浏览器变化类型
4. requestAnimationFrame：在渲染前执行动画
5. 减少重排范围：使用 absolute/fixed 定位`,
    code: `// ❌ 触发重排
element.style.width = (element.offsetWidth + 10) + 'px'

// ✅ 优化：批量写入
element.style.transform = 'translateX(10px)'  // 只触发 Composite

// ✅ GPU 加速
.element {
  transform: translateZ(0);
  will-change: transform;
}`,
    links: [
      { title: '浏览器渲染原理与性能优化 - 掘金', url: 'https://juejin.cn/post/5974965324277616654', site: '掘金' },
      { title: '浏览器渲染流水线深度解析 - 知乎', url: 'https://zhuanlan.zhihu.com/p/33823979', site: '知乎' },
    ],
  },
  {
    id: 'memory-leak',
    category: 'V8 & 浏览器',
    depth: 'implementation',
    title: 'JavaScript 内存泄漏的常见场景有哪些？如何检测和定位？',
    summary:
      '常见内存泄漏：意外全局变量、未清理的定时器/事件监听、闭包持有 DOM、大数组未释放、缓存无限增长。用 Chrome DevTools Memory 面板检测。',
    answer: `## 常见泄漏场景
### 1. 意外的全局变量
function init() {
  data = new Array(1000000)  // 没有 var/let/const → 全局变量
}

### 2. 未清理的定时器
const timer = setInterval(() => {
  this.update()  // this 持有组件引用，无法被回收
}, 1000)
// 组件销毁时忘记 clearInterval(timer)

### 3. 事件监听未移除
window.addEventListener('resize', handleResize)
// 忘记 removeEventListener

### 4. 缓存无限增长
const cache = new Map()
cache.set(key, value)  // 永不清理

## 检测方法
1. Chrome DevTools → Memory 面板：Heap Snapshot、Timeline
2. Performance Monitor：监控 JS heap size
3. 代码审查：检查 useEffect cleanup、事件监听配对`,
    code: `// React 中正确的清理
useEffect(() => {
  const timer = setInterval(() => fetchData(), 5000)
  window.addEventListener('resize', handleResize)
  return () => {
    clearInterval(timer)
    window.removeEventListener('resize', handleResize)
  }
}, [])

// 使用 WeakMap 缓存（可被 GC）
const cache = new WeakMap()`,
    links: [
      { title: 'JavaScript 内存泄漏全解析 - 掘金', url: 'https://juejin.cn/post/6999234080972513304', site: '掘金' },
      { title: 'JS 内存泄漏的四种常见类型 - 知乎', url: 'https://zhuanlan.zhihu.com/p/72060708', site: '知乎' },
    ],
  },
]
