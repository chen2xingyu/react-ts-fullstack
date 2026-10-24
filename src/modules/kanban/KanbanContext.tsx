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

// 🎯 面试考点：为什么 createContext 的默认值给 null 而不是一个假对象？
// 给假默认值会让"漏包 Provider"的组件静默用到错误数据、极难排查；
// 给 null + useKanban 里显式 throw，能把误用变成一个立刻暴露的报错。
// （TS 层面用 | null 强制消费方处理空值。）
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

  // 🎯 useReducer(reducer, initArg, initFn)：第三个参数是惰性初始化函数，
  // 用它做 hydrate——把 localStorage 读回的 saved 校验后作为初始 state；
  // dispatch 引用在组件整个生命周期内稳定（React 保证），可安全往下传/放依赖。
  const [tasks, dispatch] = useReducer(tasksReducer, saved, (initial) => {
    // hydrate 初始化：优先 localStorage，防止 SSR 或迁移版本时出错
    if (Array.isArray(initial) && initial.length) return initial
    return DEFAULT_TASKS
  })

  // 每次 tasks 变化 → 持久化（注意避免 hydrate 触发两次写入：用 [] 初始值已处理）
  useEffect(() => {
    setSaved(tasks)
  }, [tasks, setSaved])

  // 🎯 面试考点：value 内联对象 = 每次渲染都新建引用 → 所有 useKanban() 消费组件
  // 全部重渲染（Context 不做浅层比较，引用一变就通知所有消费者）。
  // 优化手段（按代价从低到高）：
  //   1. useMemo 缓存 value={useMemo(()=>({tasks,dispatch}),[tasks])}，
  //      tasks 没变时引用稳定，dispatch 本就由 useReducer 保证引用稳定；
  //   2. 拆分 Context：tasks 一个、dispatch 一个（dispatch 永不变化，
  //      只消费 dispatch 的组件因此永不因 tasks 变化而重渲染）；
  //   3. 状态再细分。看板是低频交互，此处内联写法可接受，面试要能讲出优化。
  return <KanbanContext.Provider value={{ tasks, dispatch }}>{children}</KanbanContext.Provider>
}

export function useKanban() {
  const ctx = useContext(KanbanContext)
  // 🎯 自定义 Hook + 守卫：把"必须在 Provider 内使用"的约束收敛成一个报错，
  // 消费方只调 useKanban()，不直接接触 createContext 返回的对象
  if (!ctx) throw new Error('useKanban must be used inside <KanbanProvider>')
  return ctx
}

export { countByStatus }
export type { Task, TaskFormValues, TaskStatus }
