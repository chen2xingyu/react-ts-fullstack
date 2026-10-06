import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskSchema, type TaskFormValues, type Task } from './types'

/**
 * 🎯 面试考点：react-hook-form（非受控表单）vs 受控表单性能对比
 *
 * - 受控：每次输入都 setState → rerender 整页
 * - react-hook-form：input 用 ref（uncontrolled），只有 submit/validate 时触发 render
 *   性能更好，适合字段多、校验复杂的表单场景
 *
 * 🎯 面试考点：zodResolver 桥接运行时校验与 TS 类型
 * 表单的 defaultValues 类型与 TaskFormValues 一致，字段变化时 tsc 立刻报错，
 * 运行时校验规则由 zod 描述（单一生源，Single Source of Truth）。
 */

interface TaskFormProps {
  initial?: Task
  onSubmit: (values: TaskFormValues) => void
  onCancel: () => void
}

export default function TaskForm({ initial, onSubmit, onCancel }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      priority: initial?.priority ?? 'medium',
      dueDate: initial?.dueDate ?? '',
    },
  })

  // 切换编辑对象时重置表单（如先编辑 A 再编辑 B）
  useEffect(() => {
    reset({
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      priority: initial?.priority ?? 'medium',
      dueDate: initial?.dueDate ?? '',
    })
  }, [initial, reset])

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
      }}
    >
      <h3 style={{ margin: '0 0 12px' }}>{initial ? '✏️ 编辑任务' : '➕ 新建任务'}</h3>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>标题 *</label>
        <input
          {...register('title')}
          placeholder="做什么？"
          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' }}
        />
        {errors.title && (
          <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.title.message}</span>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>描述</label>
        <textarea
          {...register('description')}
          placeholder="补充说明…"
          rows={3}
          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' }}
        />
        {errors.description && (
          <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.description.message}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>优先级</label>
          <select
            {...register('priority')}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>截止日期</label>
          <input
            type="date"
            {...register('dueDate')}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' }}
          />
          {errors.dueDate && (
            <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.dueDate.message}</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? '提交中…' : initial ? '保存' : '创建'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: '#fff',
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          取消
        </button>
      </div>
    </form>
  )
}
