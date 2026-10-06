// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { tasksReducer, DEFAULT_TASKS } from './tasksReducer'
import type { TaskFormValues } from './types'

/**
 * 🎯 面试考点：reducer 是纯函数 → 输入输出可预测 → 测试不需要浏览器环境
 * 只需构造 action 和初始 state，断言返回的新 state 即可。
 */

describe('tasksReducer', () => {
  const sample: TaskFormValues = {
    title: '测试任务',
    description: '描述',
    priority: 'medium',
    dueDate: '',
  }

  it('add: 插入到头部，状态为 todo', () => {
    const next = tasksReducer([], { type: 'add', values: sample })
    expect(next).toHaveLength(1)
    expect(next[0].status).toBe('todo')
    expect(next[0].title).toBe('测试任务')
  })

  it('update: 只改对应 id', () => {
    const state = tasksReducer([], { type: 'add', values: sample })
    const id = state[0].id
    const next = tasksReducer(state, { type: 'update', id, values: { ...sample, title: '已改' } })
    expect(next[0].title).toBe('已改')
  })

  it('remove: 删掉对应 id', () => {
    const state = tasksReducer([], { type: 'add', values: sample })
    const id = state[0].id
    const next = tasksReducer(state, { type: 'remove', id })
    expect(next).toHaveLength(0)
  })

  it('move: 只改对应 id 的 status', () => {
    const state = tasksReducer(DEFAULT_TASKS, { type: 'move', id: 'seed-1', to: 'done' })
    const moved = state.find((t) => t.id === 'seed-1')
    expect(moved?.status).toBe('done')
    // 其余项不变
    expect(state.filter((t) => t.status === 'doing')).toHaveLength(0)
  })

  it('hydrate: 全量替换', () => {
    const next = tasksReducer(DEFAULT_TASKS, {
      type: 'hydrate',
      tasks: [{ ...sample, id: 'x', status: 'done', createdAt: 1 }],
    })
    expect(next).toHaveLength(1)
    expect(next[0].id).toBe('x')
  })

  it('move 不存在的 id 应保持不变', () => {
    const next = tasksReducer(DEFAULT_TASKS, { type: 'move', id: 'not-exist', to: 'done' })
    expect(next).toHaveLength(3)
  })

  it('两次 add 的 id 不应重复', () => {
    let state = tasksReducer([], { type: 'add', values: sample })
    state = tasksReducer(state, { type: 'add', values: sample })
    expect(new Set(state.map((t) => t.id)).size).toBe(2)
  })
})
