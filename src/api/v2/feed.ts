import { http } from '@/api/request'
import {
  postListItemSchema,
  postDetailSchema,
  commentSchema,
  type PostListItem,
  type PostDetail,
  type Comment,
  type PostListQuery,
} from '@shared/contracts/post.schema'
import type { CursorPage } from '@shared/contracts/common'

/**
 * 文章 Feed API 层
 *
 * 🎯 面试考点：AbortController 取消请求
 * 搜索场景用户快速切换关键词时，旧请求的响应可能晚于新请求到达，
 * 导致 UI 显示错误关键词的结果（竞态）。用 AbortController.abort()
 * 主动取消旧请求，axios 会抛出 CanceledError，被 catch 静默处理。
 */

/**
 * 🎯 面试考点：静态类型 vs 运行时校验（zod）+ 泛型分页
 * PostListItem 这类类型来自 shared schema 的 z.infer：它只在编译期保证「我们怎么用」，
 * 但网络边界处后端真返回什么 TS 管不到。所以拿到响应后再用 postListItemSchema.parse()
 * 逐条校验 —— 类型擦除后运行时，脏数据会在 parse 处直接抛错而不是静默渲染出 undefined。
 * CursorPage<PostListItem> 是泛型分页壳：list 是当前页数据、nextCursor 游标、hasMore
 * 标记是否还有下一页（游标分页 vs offset 分页是常被追问的点）。
 * signal 由调用方（useEffect/事件处理）生成 AbortController 传入，透传给 axios 即可取消。
 */
export async function fetchPosts(
  params: PostListQuery,
  signal?: AbortSignal,
): Promise<CursorPage<PostListItem>> {
  const res = await http.get<CursorPage<PostListItem>>('/v2/posts', {
    params,
    signal,
  })
  // 运行时校验：每个元素走 schema.parse，防后端脏数据
  return {
    list: res.data.list.map((item) => postListItemSchema.parse(item)),
    nextCursor: res.data.nextCursor,
    hasMore: res.data.hasMore,
  }
}

export async function fetchPostDetail(
  id: number,
  signal?: AbortSignal,
): Promise<PostDetail> {
  const res = await http.get<PostDetail>(`/v2/posts/${id}`, { signal })
  return postDetailSchema.parse(res.data)
}

export async function fetchComments(
  postId: number,
  signal?: AbortSignal,
): Promise<Comment[]> {
  const res = await http.get<{ list: Comment[] }>(`/v2/posts/${postId}/comments`, { signal })
  return res.data.list.map((c) => commentSchema.parse(c))
}

export interface LikeResult {
  liked: boolean
  likeCount: number
}

export async function likePost(postId: number): Promise<LikeResult> {
  const res = await http.post<LikeResult>(`/v2/posts/${postId}/like`)
  return res.data
}

export async function createComment(
  postId: number,
  author: string,
  content: string,
): Promise<Comment> {
  const res = await http.post<Comment>(`/v2/posts/${postId}/comments`, { author, content })
  return commentSchema.parse(res.data)
}

// 类型再导出：调用方从本模块统一拿 PostListQuery，不必穿透到 @shared/contracts；
//   TS→JS：type 导出编译后完全消失，不产生任何运行时 import。
export type { PostListQuery }
