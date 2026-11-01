/**
 * 🧱 Mini-Hooks：只写链表骨架，让你看清 fiber.memoizedState / hook.next / hook.queue 到底存啥
 *
 * 真实 React Hooks 内部 ≈ 这个样子（简化掉 Fiber 双缓存、并发调度、dispatch 批量更新）
 * 读完这个文件，你应该能回答：
 *   1. 为什么不是数组？
 *   2. hook.queue 是干嘛的？
 *   3. React 为啥不能把 Hook 写在 if 里？
 */

// ═══════════════════════════════════════════════════════
// 1. Hook 节点结构（真实 React Fiber 节点里的 memoizedState 指针就是指向这个链表头）
// ═══════════════════════════════════════════════════════

interface HookNode {
  memoizedState: unknown   // 🎯 核心：这个 hook 自己的状态/缓存值
                           //   useState → 存 state 值
                           //   useReducer → 存 state 值
                           //   useMemo/useCallback → 存 [值, 依赖数组]
                           //   useEffect/useLayoutEffect → 存 effect 对象
  queue?: UpdateQueue      // 🎯 核心：存放这个 hook 排队等处理的更新（setState/reducer dispatch 产生的）
  next: HookNode | null    // 🎯 核心：单向链表的 next 指针 → 指向下一个 hook
}

interface UpdateQueue {
  pending: unknown         // 待处理的更新队列（真实 React 是环形链表，简化成这里的单值）
}

// ═══════════════════════════════════════════════════════
// 2. 全局"当前 fiber" —— 真实 React 是 Fiber 双缓存 current/wip 切换
//    这里简化：只用一个 currentFiber，渲染时把它换成 workInProgress 的镜像
// ═══════════════════════════════════════════════════════

let currentFiber: { memoizedState: HookNode | null } | null = null
let workInProgressFiber: { memoizedState: HookNode | null } | null = null
let currentHook: HookNode | null = null    // 真实 React 用 workInProgressHook 游标走链表
let isMount = true                          // 第一次渲染 = mount，之后 = update

// ═══════════════════════════════════════════════════════
// 3. 渲染入口：每次组件 render 前调用
// ═══════════════════════════════════════════════════════

export function beginRender() {
  // 真实 React：workInProgress = createWorkInProgress(current) —— 克隆 current Fiber
  workInProgressFiber = { memoizedState: null }
  currentHook = null
  isMount = currentFiber === null
}

export function endRender() {
  // 真实 React commit 阶段：把 WIP 变成 current
  currentFiber = workInProgressFiber
}

// ═══════════════════════════════════════════════════════
// 4. mini-useState —— 核心考点
// ═══════════════════════════════════════════════════════

export function miniUseState<S>(initial: S): [S, (next: S) => void] {
  let hook: HookNode

  if (isMount) {
    // 第一次渲染：创建新的 Hook 节点
    hook = {
      memoizedState: initial,    // useState 把初始值放这里
      queue: { pending: null },  // 这个 hook 的更新队列
      next: null,
    }
    // 挂到 WIP 链表上
    if (!workInProgressFiber!.memoizedState) {
      workInProgressFiber!.memoizedState = hook   // 链表头 = 第一个 hook
      currentHook = hook
    } else {
      currentHook!.next = hook    // 链到上一个 hook 的 next
      currentHook = hook
    }
  } else {
    // 更新渲染：沿 current 链表按顺序走，对位读取
    // 🚨 这就是"不能写在 if 里"的根因：
    //    第1次渲染（mount）Hook1 = useState → 链表第1个节点 = useState 的 HookNode
    //    如果某次渲染 Hook1 = useEffect（if 条件变了）
    //    → 对位错位！useEffect 的 HookNode.memoizedState 是 effect 对象，不是 state 值
    //    → 读到的 state 是乱的 → React 直接 throw Invalid hook call
    hook = currentHook!.next!    // 简化：真实 React 是 currentHook = currentHook.next
  }

  const state = hook.memoizedState as S

  // setState：把更新塞进 hook.queue（真实 React 会合并/调度）
  const setState = (next: S) => {
    hook.queue!.pending = next
    // 真实 React 这里会 scheduleUpdateOnFiber → 触发新的渲染
    // 渲染时 beginRender 里从 hook.queue.pending 取出来更新 hook.memoizedState
  }

  return [state, setState]
}

// ═══════════════════════════════════════════════════════
// 4.5 mini-useReducer —— 关键认知：useState 就是 useReducer 的特例
//     真实 React 源码 useEffectImpl 之外，useState 实现 ≈
//       useState(initial) === useReducer(basicStateReducer, initial)
//     其中 basicStateReducer = (state, action) => typeof action === 'function' ? action(state) : action
//     （这解释了为什么 setState 可以传函数：setState(prev => prev + 1)）
// ═══════════════════════════════════════════════════════

export function miniUseReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialArg: S,
): [S, (action: A) => void] {
  // hook 上额外挂一份 reducer（真实 React 挂在 queue.lastRenderedReducer 上）
  let hook: HookNode & { reducer?: (s: S, a: A) => S }

  if (isMount) {
    hook = {
      // 🎯 与 useState 的唯一结构差异：这里存的不是「你的 state」，
      //    而是 reducer 计算后的 state —— 但字段名和位置完全一样（都是 memoizedState）
      memoizedState: initialArg,
      // 🎯 关键：queue 里除了 pending，还额外记住 reducer 本身
      //    真实 React：queue.lastRenderedReducer / queue.dispatch
      reducer,
      queue: { pending: null },
      next: null,
    }
    if (!workInProgressFiber!.memoizedState) {
      workInProgressFiber!.memoizedState = hook
    } else {
      currentHook!.next = hook
    }
    currentHook = hook
  } else {
    hook = currentHook!.next as HookNode & { reducer?: (s: S, a: A) => S } // 同样是「调用顺序对位」
    // 🎯 渲染阶段才把 queue 里攒下的 action 喂给 reducer（这才是 reducer 的调用时机）
    if (hook.queue!.pending !== null) {
      hook.memoizedState = hook.reducer!(hook.memoizedState as S, hook.queue!.pending as A)
      hook.queue!.pending = null
    }
  }

  // dispatch：把 action 塞进 queue，而不是直接算
  // 🎯 为什么 dispatch 引用是稳定的？因为它是在 mount 时创建的闭包，
  //    后续 render 走 update 分支不会重新创建 —— 这是 useReducer 能放心传进 Context 的根因
  const dispatch = (action: A) => {
    hook.queue!.pending = action
    // 真实 React：dispatchReducerAction → 把 action 推进 queue.pending（环形链表）
    //            → 再 scheduleUpdateOnFiber 触发渲染
    //            → 渲染时把 queue 里的 action 依次喂给 reducer，算出新 memoizedState
  }

  return [hook.memoizedState as S, dispatch]
}

/*
❓ 为什么有了 useState 还要 useReducer？
   state 形状复杂、变更方式多（add/update/remove/move）时，
   一串 setState 散落在各处 → 逻辑分散、无法单测、容易漏改。
   useReducer 把「所有变更方式」收敛成一个纯函数 → 可单测、可回放、可时间旅行。
   代价：样板代码变多（action 类型定义 + switch），简单 state 用 useState 更划算。
   📌 项目里的实证：src/modules/kanban/tasksReducer.ts 就是 5 种 action 收敛成一个纯函数。
*/

// ═══════════════════════════════════════════════════════
// 5. 你要能回答的三个问题（标准答案）
// ═══════════════════════════════════════════════════════

/*
Q1: fiber.memoizedState 是什么？ 记忆状态
    → 是当前 Fiber 节点的 Hook 链表头指针。
    → 组件第一次 render 完，currentFiber.memoizedState = 第一个 useState 的 HookNode
    → 整个 hook 链表从这里开始，next 串下去

Q2: hook.queue 是什么？ 更新队列
    → 是这个 hook 自己专属的"待处理更新队列"
    → 多次 setState 调用会塞进同一个 queue，React 批量调度
    → 每个 hook 独立 queue，互不干扰

Q3: 为什么选链表而不是数组？
    → 【动机1】和 Fiber 双缓存天然适配  
       真实 React：currentFiber.memoizedState 是 mount 时建好的链表
       每次 render：沿 current 链表走 → 在 WIP 上 clone/build 新链表 → commit 整体替换
       如果是数组：copy 成本 + 数组长度固定 → 增删分支困难
    
    → 【动机2】可中断渲染友好
       渲染阶段可以暂停/恢复/丢弃 WIP 链表
       丢弃 = 直接丢掉 WIP fiber.memoizedState（整个链表头没了）
       恢复 = 从 current 链表继续走
       数组做不到"丢一半就全丢"（内存碎片问题）
    
    → 【动机3】本质是"调用顺序对位"
       数组也能对位（按索引），但链表的 next 指针天然表达"第 N 个 hook"的顺序关系
       配合 workInProgressHook 游标指针，走一遍就建完 WIP 链表
*/

// ═══════════════════════════════════════════════════════
// 6. Vue3 Composition API 对照（你的第二轨学习点）
// ═══════════════════════════════════════════════════════

/*
Vue3 的 setup() 里连续调用 ref()、reactive()、computed() —— 内部存储方式：

  Vue3：currentInstance 单例 + setupState/proxy 对象
  ┌──────────────────────────────────────┐
  │ currentInstance (全局单例)            │
  │   └── setupState: {                  │  ← 一个 plain object
  │         count: RefImpl { value: 0 }, │     key 是变量名
  │         obj: ReactiveProxy {...},    │     不是链表！
  │       }                              │
  └──────────────────────────────────────┘

本质差异：
  React Hooks：调用顺序对位 → 必须按顺序走链表 → 不能写在 if 里
  Vue3 Composition：变量名 + Proxy 自动依赖收集 → 可以写在任何地方
                     即使 ref() 写在 if 里也不报错
                     （但会触发 "ref 在条件分支里" 的 eslint 警告，因为逻辑上会丢状态）

为什么 Vue3 不怕顺序问题？
  Vue 有 Proxy：count.value 被修改 → Proxy set handler 触发 → 自动收集依赖 → 直接更新
  不依赖"第几个 hook"的顺序对位，只靠变量名定位 + Proxy 拦截
*/
