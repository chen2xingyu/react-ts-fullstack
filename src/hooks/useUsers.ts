import { useQuery } from '@tanstack/react-query'
import { userApi, User } from '@/api/user'

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
  })
}

export function useUser(id: number) {
  return useQuery<User>({
    queryKey: ['users', id],
    queryFn: () => userApi.getUserById(id),
    enabled: !!id,
  })
}
