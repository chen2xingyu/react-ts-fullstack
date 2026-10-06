/* eslint-disable react-refresh/only-export-components --
 * 复合组件模式：Board/Column/Card 聚合成 Kanban 命名空间导出，
 * 刻意保持单文件内聚；HMR 边界由页面级入口承担 */
import { useState, useRef, type DragEvent } from 'react'
import { useKanban } from './KanbanContext'
import { STATUS_LABEL, PRIORITY_LABEL } from './types'
import type { Task, TaskStatus } from './types'

/**
 * 🎯 面试考点：复合组件（Compound Component）
 *
 * <Kanban.Board> / <Kanban.Column> / <Kanban.Card> 组合使用：
 * - 比单个大组件更灵活，使用者可以自由组合列与卡片
 * - 比 props drilling 更内聚，Column 不需要知道 Card 里有什么
 * - 内部共享状态走 Context（tasks + dispatch），外部只关心布局
 *
 * 🎯 面试考点：HTML5 原生拖拽关键事件
 * - dragstart：在卡片上设置 dataTransfer.setData('text/plain', taskId)
 * - dragover：必须在目标列 preventDefault()，否则 drop 不会触发
 * - drop：从 dataTransfer 取出 id，dispatch move
 * - 为什么不用 @dnd-kit？原生 API 更轻，能讲清事件模型；进阶选型见注释
 */

/** 模拟后端持久化（拖拽后同步） */
async function syncMoveToServer(id: string, to: TaskStatus): Promise<void> {
  // 🎯 教学演示：20% 概率失败，用于演示「乐观更新 + 失败回滚」
  await new Promise((r) => setTimeout(r, 300))
  if (Math.random() < 0.2) throw new Error(`同步失败：task ${id} -> ${to}`)
}

function Board({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
      {children}
    </div>
  )
}

function Column({ status, children }: { status: TaskStatus; children: React.ReactNode }) {
  const { tasks, dispatch } = useKanban()
  const [dragOver, setDragOver] = useState(false)
  const countRef = useRef(0)

  const list = tasks.filter((t) => t.status === status)
  countRef.current = list.length

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    // 🎯 必须 preventDefault，浏览器默认不允许 drop
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === status) return

    // 🎯 乐观更新：先改 UI，再异步同步；失败则回滚
    dispatch({ type: 'move', id: taskId, to: status })
    syncMoveToServer(taskId, status).catch(() => {
      // 回滚：移回原列
      dispatch({ type: 'move', id: taskId, to: task.status })
    })
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        background: dragOver ? '#eff6ff' : '#f9fafb',
        border: dragOver ? '2px dashed #3b82f6' : '2px solid transparent',
        borderRadius: 12,
        padding: 12,
        minHeight: 400,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
          {STATUS_LABEL[status]}
        </h3>
        <span
          style={{
            background: '#e5e7eb',
            borderRadius: 999,
            padding: '2px 8px',
            fontSize: 12,
            color: '#374151',
          }}
        >
          {countRef.current}
        </span>
      </div>
      {children}
    </div>
  )
}

function Card({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const { dispatch } = useKanban()

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const priorityColor = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' }[task.priority]

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{task.title}</div>
        <span style={{ color: priorityColor, fontSize: 12, fontWeight: 600 }}>
          {PRIORITY_LABEL[task.priority]}
        </span>
      </div>
      {task.description && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{task.description}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          {task.dueDate ? `📅 ${task.dueDate}` : '无截止日期'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => onEdit(task)}
            style={{ fontSize: 11, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'remove', id: task.id })}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}

export const Kanban = { Board, Column, Card }
