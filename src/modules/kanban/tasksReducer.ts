import type { Task, TaskFormValues, TaskStatus } from './types'

/**
 * 🎯 面试考点：useReducer 的 action 设计
 *
 * 1. action 描述「发生了什么」而不是「怎么改」，reducer 是唯一改状态的地方
 * 2. reducer 必须是纯函数：相同 (state, action) 必得相同结果 —— 这是可测试性的来源
 * 3. 回滚不需要专门的 rollback action：move 的逆操作还是 move（from/to 互换），
 *    动作可逆是乐观更新能回滚的前提
 */
// 🎯 面试考点：判别联合（Discriminated Union）+ 类型收窄
// 每个成员都有同名字段 type 且取值不同（'hydrate' | 'add' | ...），
// 这个 type 就是"判别标签"。在 reducer 里 switch(action.type) 时，
// TS 会自动把联合收窄(narrow)到对应成员——case 'move' 里 action.to 可访问，
// case 'add' 里 action.values 可访问，写错字段直接编译报错。
// 这就是"action.type 描述发生了什么"能获得类型安全的底层机制。
export type TasksAction =
  | { type: 'hydrate'; tasks: Task[] }
  | { type: 'add'; values: TaskFormValues }
  | { type: 'update'; id: string; values: TaskFormValues }
  | { type: 'remove'; id: string }
  | { type: 'move'; id: string; to: TaskStatus }

/**
 * 🎯 面试考点：为什么数组 state 用 reducer 比一串 setState 好管？
 * - 多种变更方式（增删改移）收敛到一个函数，逻辑集中、可单测
 * - dispatch 引用稳定（useReducer 保证），传进 Context 不会引起子树无谓重渲染
 */
// 🎯 面试考点：reducer 必须是纯函数
// 1. 不改入参：下面全部用展开/ map/filter 返回新数组新对象，
//    绝不 state.push / state[i].x = ...（直接改原 state 会让 React 检测不到变化、
//    时间旅行调试失效）；
// 2. 无副作用：reducer 里不发请求、不读外部可变状态——
//    时间旅行(redux devtools)要求同一 (state, action) 可重放。
// 🎯 dispatch 是异步的吗？不是"异步"，而是"批处理"：dispatch 触发的 state 更新
//    会被 React 排队批量提交，紧接着读 state 仍是旧值；要拿新值请在下次渲染读。
export function tasksReducer(state: Task[], action: TasksAction): Task[] {
  switch (action.type) {
    case 'hydrate':
      return action.tasks

    case 'add': {
      const task: Task = {
        ...action.values,
        // crypto.randomUUID() 生成稳定唯一 id（浏览器原生 API），
        // 比 Date.now()+随机数更不会撞；createdAt 取当前时间戳
        id: crypto.randomUUID(),
        status: 'todo',
        createdAt: Date.now(),
      }
      // 🎯 不可变更新：[task, ...state] 返回新数组（头部插入），
      // 绝不写 state.unshift(task)——那会原地改旧 state
      // 新任务插到最前（unshift），看板顶部永远是最新的
      return [task, ...state]
    }

    case 'update':
      // map 返回新数组 + 对象展开拷贝被改项，其余项原样引用共享
      return state.map((t) => (t.id === action.id ? { ...t, ...action.values } : t))

    case 'remove':
      // filter 天然不可变：返回剔除目标后的新数组
      return state.filter((t) => t.id !== action.id)

    case 'move':
      return state.map((t) => (t.id === action.id ? { ...t, status: action.to } : t))

    default:
      // 🎯 面试考点：default 兜底 + never 穷尽检查
      // 新增 action 类型后若漏写 case，这里可用 never 做编译期提醒：
      //   const _exhaustive: never = action; return _exhaustive
      // 本文件直接 return state 兜底，保持简单。
      return state
  }
}

// 🎯 TS→JS：TasksAction 这个联合类型编译后完全擦除——运行时 reducer 收到的
// 就是普通对象 { type:'move', id, to }，switch 判断的是真实存在的 action.type
// 字符串；类型安全只存在于编译期，运行时并不校验 action 是否合法。

/** 种子数据：id 固定，方便测试与演示 */
export const DEFAULT_TASKS: Task[] = [
  {
    id: 'seed-1',
    title: '手写 useDebounce 并通过测试',
    description: 'leading/trailing 都要实现',
    priority: 'high',
    dueDate: '2026-10-10',
    status: 'doing',
    createdAt: 1760000000000,
  },
  {
    id: 'seed-2',
    title: '给 Feed 流加虚拟列表',
    description: '只渲染可视区，DOM 节点数恒定',
    priority: 'medium',
    dueDate: '',
    status: 'todo',
    createdAt: 1760000001000,
  },
  {
    id: 'seed-3',
    title: '复盘 React 19 Actions',
    description: 'useActionState / useFormStatus / useOptimistic',
    priority: 'low',
    dueDate: '',
    status: 'done',
    createdAt: 1760000002000,
  },
]
