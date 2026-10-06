import { z } from 'zod'

/**
 * 🎯 面试考点：zod schema 即「单一事实来源」
 * 表单校验规则、TS 类型都从这一份 schema 推导（z.infer），改一处全链路生效。
 */
export const TASK_STATUSES = ['todo', 'doing', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

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
  dueDate: z.union([
    z.literal(''),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  ]),
})

export type TaskFormValues = z.infer<typeof taskSchema>

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
