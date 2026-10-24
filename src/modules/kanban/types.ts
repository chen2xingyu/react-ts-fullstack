import { z } from 'zod'

/**
 * 🎯 面试考点：zod schema 即「单一事实来源」
 * 表单校验规则、TS 类型都从这一份 schema 推导（z.infer），改一处全链路生效。
 */
// 🎯 面试考点：as const + 索引访问 = 从"值"推出"联合类型"
// ['todo','doing','done'] as const 把数组锁死为只读字面量元组；
// (typeof TASK_STATUSES)[number] 取出所有元素类型的并集 =
//   'todo' | 'doing' | 'done'。好处：运行时用于 map 渲染列的 TASK_STATUSES
// 和 TS 层约束 status 字段的 TaskStatus 同源，增删状态只改一处。
// 🎯 TS→JS：as const 与 TaskStatus 类型全部擦除，运行时 TASK_STATUSES
// 就是普通数组 ['todo','doing','done']，不携带任何类型信息。
export const TASK_STATUSES = ['todo', 'doing', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

// 🎯 Record<TaskStatus, string>：要求这个对象必须为 TaskStatus 的每一个取值
// 都提供一个中文标签——漏写 'done' 或拼错 key，tsc 立刻报错。
// 这是"用类型强制映射表完备"的常用写法。
export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '待处理',
  doing: '进行中',
  done: '已完成',
}

export const taskSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(50, '标题最多 50 字'),
  // 空字符串合法 = 可选；保持 input/output 类型一致，避免 useForm 泛型撕裂
  description: z.string().trim().max(200, '描述最多 200 字'),
  priority: z.enum(['low', 'medium', 'high']),
  // dueDate 允许空串（=不设日期）或合法日期字符串：
  // 对应 TS 类型 '' | string；空串用 z.literal('') 精确收窄，
  // 比 z.string().optional() 更贴表单 input 提交空串的真实行为
  dueDate: z.union([
    z.literal(''),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  ]),
})

// 🎯 z.infer：从 zod 运行时 schema 反向推出 TS 类型——
// schema 是唯一事实，类型是它的"投影"；schema 改了，类型跟着变，不会脱节。
export type TaskFormValues = z.infer<typeof taskSchema>

// Task = 表单值 + 服务端补充字段：表单不需要 id/status/createdAt，
// 落库后的完整任务才带这些。用 extends 复用表单形状，避免重复声明字段。
export interface Task extends TaskFormValues {
  id: string
  status: TaskStatus
  createdAt: number
}

export const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: '低',
  medium: '中',
  high: '高',
}
