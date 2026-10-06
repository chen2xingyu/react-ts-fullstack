import type { Task, TaskFormValues, TaskStatus } from './types'

/**
 * 🎯 面试考点：useReducer 的 action 设计
 *
 * 1. action 描述「发生了什么」而不是「怎么改」，reducer 是唯一改状态的地方
 * 2. reducer 必须是纯函数：相同 (state, action) 必得相同结果 —— 这是可测试性的来源
 * 3. 回滚不需要专门的 rollback action：move 的逆操作还是 move（from/to 互换），
 *    动作可逆是乐观更新能回滚的前提
 */
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
export function tasksReducer(state: Task[], action: TasksAction): Task[] {
  switch (action.type) {
    case 'hydrate':
      return action.tasks

    case 'add': {
      const task: Task = {
        ...action.values,
        id: crypto.randomUUID(),
        status: 'todo',
        createdAt: Date.now(),
      }
      // 新任务插到最前（unshift），看板顶部永远是最新的
      return [task, ...state]
    }

    case 'update':
      return state.map((t) => (t.id === action.id ? { ...t, ...action.values } : t))

    case 'remove':
      return state.filter((t) => t.id !== action.id)

    case 'move':
      return state.map((t) => (t.id === action.id ? { ...t, status: action.to } : t))

    default:
      return state
  }
}

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
