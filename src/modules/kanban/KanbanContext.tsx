/* eslint-disable react-refresh/only-export-components --
 * Context 文件需同时导出 Provider、useKanban、countByStatus，
 * 拆分会降低内聚性；HMR 边界由页面级入口承担 */
import { createContext, useContext, useReducer, useEffect } from 'react'
import { useLocalStorage } from '@/hacks'
import { tasksReducer, DEFAULT_TASKS } from './tasksReducer'
import type { Task, TaskFormValues, TaskStatus } from './types'
import type { TasksAction } from './tasksReducer'

/**
 * 🎯 面试考点：useReducer + Context 为什么能替代 Redux（简单场景）？
 *
 * 1. reducer 集中状态变更逻辑，dispatch 天然稳定（每次 render 引用不变）
 * 2. 一层 Context 就可以避免逐层 props drilling，组件通过 useKanban() 消费
 * 3. 不用引入 Redux 的样板代码（slice、thunk、selector），项目复杂度适中时性价比最高
 *
 * 但注意：Context 不是状态管理库，不适合高频写场景——看板场景以低频交互为主，
 * 每次拖拽/表单提交才会 dispatch，Context 的「整树广播」性能开销可接受。
 */

interface KanbanContextValue {
  tasks: Task[]
  dispatch: React.Dispatch<TasksAction>
}

const KanbanContext = createContext<KanbanContextValue | null>(null)

const STORAGE_KEY = 'lab_kanban_v1'

/** 用 reduce 统计每列数量，避免在组件里重复计算 */
function countByStatus(tasks: Task[]): Record<TaskStatus, number> {
  return tasks.reduce(
    (acc, t) => {
      acc[t.status]++
      return acc
    },
    { todo: 0, doing: 0, done: 0 } as Record<TaskStatus, number>,
  )
}

export function KanbanProvider({ children }: { children: React.ReactNode }) {
  // useLocalStorage 保存 reducer state，实现持久化；初始值取 seed
  const [saved, setSaved] = useLocalStorage<Task[]>(STORAGE_KEY, DEFAULT_TASKS)

  const [tasks, dispatch] = useReducer(tasksReducer, saved, (initial) => {
    // hydrate 初始化：优先 localStorage，防止 SSR 或迁移版本时出错
    if (Array.isArray(initial) && initial.length) return initial
    return DEFAULT_TASKS
  })

  // 每次 tasks 变化 → 持久化（注意避免 hydrate 触发两次写入：用 [] 初始值已处理）
  useEffect(() => {
    setSaved(tasks)
  }, [tasks, setSaved])

  return <KanbanContext.Provider value={{ tasks, dispatch }}>{children}</KanbanContext.Provider>
}

export function useKanban() {
  const ctx = useContext(KanbanContext)
  if (!ctx) throw new Error('useKanban must be used inside <KanbanProvider>')
  return ctx
}

export { countByStatus }
export type { Task, TaskFormValues, TaskStatus }
