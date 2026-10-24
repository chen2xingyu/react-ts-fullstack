/**
 * 🎯 面试考点：API 模块的两种组织风格 + Partial 工具类型
 * 这里用「对象命名空间 userApi」把 CRUD 聚合到一个对象里（对比 trading.ts 的散函数导出），
 * 优点是调用点带命名空间 userApi.getUserById 更清晰、便于按域批量 import。
 * RESTful CRUD 映射：GET /users 列表、GET /users/:id 详情、POST /users 创建、
 *   PUT /users/:id 全量更新、DELETE /users/:id 删除。
 * Partial<User> 是 TS 内置工具类型：把 User 所有字段变为可选，正好对应「创建/更新时
 *   不必传全量字段」。TS→JS：Partial 是类型层操作，编译后完全擦除，运行时就是普通对象。
 */
import { http } from './request'

export interface User {
  id: number
  name: string
  email: string
  phone: string
  website: string
  company: string
  created_at: string
}

export const userApi = {
  getUsers: async () => {
    const res = await http.get<User[]>('/users')
    return res.data
  },
  getUserById: async (id: number) => {
    const res = await http.get<User>(`/users/${id}`)
    return res.data
  },
  createUser: async (data: Partial<User>) => {
    const res = await http.post<User>('/users', data)
    return res.data
  },
  updateUser: async (id: number, data: Partial<User>) => {
    const res = await http.put<User>(`/users/${id}`, data)
    return res.data
  },
  deleteUser: async (id: number) => {
    const res = await http.delete<void>(`/users/${id}`)
    return res.data
  },
}
