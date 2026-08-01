import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi, User } from '@/api/user'

export default function Users() {
  const queryClient = useQueryClient()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card max-w-md mx-auto text-center">
        <p className="text-red-500">加载失败: {error instanceof Error ? error.message : '未知错误'}</p>
        <p className="text-sm text-gray-500 mt-2">请确认后端服务已启动 (npm run dev) 且数据库已初始化</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingUser(null)
            setShowForm(true)
          }}
        >
          新增用户
        </button>
      </div>

      {showForm && (
        <UserForm
          user={editingUser}
          onCancel={() => {
            setShowForm(false)
            setEditingUser(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setEditingUser(null)
            queryClient.invalidateQueries({ queryKey: ['users'] })
          }}
        />
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-3 pr-4">ID</th>
              <th className="pb-3 pr-4">姓名</th>
              <th className="pb-3 pr-4">邮箱</th>
              <th className="pb-3 pr-4">电话</th>
              <th className="pb-3 pr-4">网站</th>
              <th className="pb-3 pr-4">公司</th>
              <th className="pb-3 pr-4">创建时间</th>
              <th className="pb-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 pr-4 font-mono text-gray-500">{user.id}</td>
                <td className="py-3 pr-4 font-medium">{user.name}</td>
                <td className="py-3 pr-4 text-primary-600">
                  <a href={`mailto:${user.email}`}>{user.email}</a>
                </td>
                <td className="py-3 pr-4">{user.phone || '-'}</td>
                <td className="py-3 pr-4">
                  {user.website ? (
                    <a
                      href={`https://${user.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      {user.website}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="py-3 pr-4">{user.company || '-'}</td>
                <td className="py-3 pr-4 text-gray-500">
                  {new Date(user.created_at).toLocaleString('zh-CN')}
                </td>
                <td className="py-3">
                  <div className="flex space-x-3">
                    <button
                      className="text-primary-600 hover:underline text-sm"
                      onClick={() => {
                        setEditingUser(user)
                        setShowForm(true)
                      }}
                    >
                      编辑
                    </button>
                    <button
                      className="text-red-500 hover:underline text-sm"
                      onClick={() => {
                        if (confirm(`确定删除用户 "${user.name}"?`)) {
                          deleteMutation.mutate(user.id)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? '删除中...' : '删除'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  暂无用户数据，点击"新增用户"添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        数据来源: Node.js + Express + MySQL 真实接口
      </p>
    </div>
  )
}

function UserForm({
  user,
  onCancel,
  onSuccess,
}: {
  user: User | null
  onCancel: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    website: user?.website || '',
    company: user?.company || '',
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<User>) => userApi.createUser(data),
    onSuccess: onSuccess,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) =>
      userApi.updateUser(id, data),
    onSuccess: onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (user) {
      updateMutation.mutate({ id: user.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const errorMsg = createMutation.error?.message || updateMutation.error?.message

  return (
    <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
      <h2 className="text-lg font-semibold">{user ? '编辑用户' : '新增用户'}</h2>

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-600 rounded text-sm">{errorMsg}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">姓名 *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">邮箱 *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">电话</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">网站</label>
          <input
            type="text"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">公司</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? '提交中...' : user ? '保存修改' : '创建用户'}
        </button>
      </div>
    </form>
  )
}
