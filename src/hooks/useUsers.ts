import { useQuery } from '@tanstack/react-query'
import { userApi, User } from '@/api/user'

/**
 * 🎯 面试考点：数据加载 Hook 模式（基于 react-query）
 *
 * 把"取数"从组件里抽成自定义 Hook，组件只消费 { data, isLoading, isError }，
 * 与 Vue 中 useQuery / 在 composable 里按需取数的思路一致。
 *
 * 关键点：
 *   - queryKey：缓存与失效的唯一身份。['users'] 是列表、['users', id] 是单详情；
 *     react-query 靠 key 做缓存去重、背景刷新、以及 invalidateQueries 的失效广播。
 *   - 泛型 useQuery<User[]>：声明返回数据形状；T 编译后擦除，运行时不做校验。
 *   - enabled: !!id：参数未就绪时不发请求（守卫），对应 Vue 里 watch 到 id 才请求。
 */
export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
  })
}

// 单条详情：queryKey 带 id 实现按 id 分缓存；enabled 守卫避免 id 未就绪时发空请求
export function useUser(id: number) {
  return useQuery<User>({
    queryKey: ['users', id],
    queryFn: () => userApi.getUserById(id),
    enabled: !!id,
  })
}
