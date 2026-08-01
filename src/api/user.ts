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
