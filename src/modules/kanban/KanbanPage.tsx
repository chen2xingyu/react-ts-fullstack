import { useState, useCallback } from 'react'
import { KanbanProvider, useKanban } from './KanbanContext'
import { Kanban } from './Kanban'
import TaskForm from './TaskForm'
import { STATUS_LABEL, TASK_STATUSES } from './types'
import type { Task, TaskFormValues } from './types'

/**
 * 🎯 面试考点：模块入口分层
 * - KanbanPage 只做组合：Provider + 布局 + 表单显隐控制
 * - Kanban（复合组件）负责拖拽 + 渲染
 * - KanbanContext 负责状态与持久化
 * - TaskForm 负责表单与校验
 * 关注点分离清楚，面试可逐一拆开讲解。
 */

export default function KanbanPage() {
  return (
    <KanbanProvider>
      <KanbanLayout />
    </KanbanProvider>
  )
}

function KanbanLayout() {
  const { tasks, dispatch } = useKanban()
  const [editing, setEditing] = useState<Task | null>(null)
  const [showForm, setShowForm] = useState(false)

  const handleCreate = useCallback(
    (values: TaskFormValues) => {
      dispatch({ type: 'add', values })
      setShowForm(false)
    },
    [dispatch]
  )

  const handleUpdate = useCallback(
    (values: TaskFormValues) => {
      if (!editing) return
      dispatch({ type: 'update', id: editing.id, values })
      setEditing(null)
    },
    [dispatch, editing]
  )

  const handleCancel = useCallback(() => {
    setShowForm(false)
    setEditing(null)
  }, [])

  const openEdit = useCallback((task: Task) => {
    setEditing(task)
    setShowForm(true)
  }, [])

  const handleAddClick = useCallback(() => {
    setEditing(null)
    setShowForm(true)
  }, [])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>📋 任务看板</h1>
        <button
          type="button"
          onClick={handleAddClick}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          + 新建任务
        </button>
      </div>

      {showForm && (
        <TaskForm
          initial={editing ?? undefined}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={handleCancel}
        />
      )}

      <Kanban.Board>
        {TASK_STATUSES.map((status) => (
          <Kanban.Column key={status} status={status}>
            {tasks
              .filter((t) => t.status === status)
              .map((t) => (
                <Kanban.Card key={t.id} task={t} onEdit={openEdit} />
              ))}
            {tasks.filter((t) => t.status === status).length === 0 && (
              <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 24 }}>
                暂无{STATUS_LABEL[status]}的任务
                <br />
                把卡片拖到这里
              </div>
            )}
          </Kanban.Column>
        ))}
      </Kanban.Board>

      <div style={{ marginTop: 20, color: '#6b7280', fontSize: 12 }}>
        💡 提示：拖拽卡片到不同列即可变更状态；有 20% 概率模拟同步失败并自动回滚。
      </div>
    </div>
  )
}
