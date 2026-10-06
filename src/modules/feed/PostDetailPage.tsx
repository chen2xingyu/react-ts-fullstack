import { useState, useCallback, useEffect, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useOptimistic, useActionState } from 'react'
import { fetchPostDetail, likePost, createComment, fetchComments } from '@/api/v2/feed'
import type { PostDetail, Comment } from '@shared/contracts/post.schema'

/**
 * 文章详情页
 *
 * 🎯 面试考点汇总：
 * 1. Suspense + 骨架屏：数据加载期间展示骨架，不白屏
 * 2. useOptimistic（React 19）：点赞立即更新 UI，失败再回滚
 * 3. useActionState（React 19）：表单提交状态管理，替代手动 isPending
 * 4. ErrorBoundary 兜底（在路由层 guard 里已包）
 */

// ============================================================================
// Suspense 资源模式（resource 存在稳定祖先，子组件重挂不丢失）
// ============================================================================

/**
 * 经典 Suspense 资源包装器：把 promise 包装成 { read } 对象。
 * read() 在 pending 时 throw promise（Suspense 捕获并显示 fallback），
 * resolve 后返回数据，reject 后 throw 错误（ErrorBoundary 捕获）。
 */
function createResource<T>(promise: Promise<T>) {
  let status: 'pending' | 'success' | 'error' = 'pending'
  let result: T | unknown
  promise.then(
    (r) => { status = 'success'; result = r },
    (e) => { status = 'error'; result = e },
  )
  return {
    read(): T {
      if (status === 'pending') throw promise
      if (status === 'error') throw result
      return result as T
    },
  }
}

// ============================================================================
// 详情内容
// ============================================================================

/**
 * 🎯 面试考点：Suspense 数据获取的正确姿势
 * 关键：resource/promise 必须存在**不会被 Suspense 重挂的祖先组件**里，
 * 通过 props 传给消费组件。如果存在消费组件自身（useRef/useMemo），
 * Suspense 挂起→重挂时组件实例重建，缓存丢失→无限重复请求。
 */
function PostContent({ resource }: { resource: { read(): PostDetail } }) {
  const post = resource.read()
  return <PostBody post={post} />
}

function PostBody({ post }: { post: PostDetail }) {
  // 🎯 useOptimistic：乐观更新点赞数
  // 第一个参数是真实状态，第二个是更新函数（当前状态 + 乐观值 → 新状态）
  const [optimisticCount, addOptimistic] = useOptimistic(
    post.likeCount,
    (_state, newCount: number) => newCount,
  )
  const [liked, setLiked] = useState(false)

  const handleLike = useCallback(async () => {
    // 立即乐观 +1
    addOptimistic(optimisticCount + 1)
    setLiked(true)
    try {
      const result = await likePost(post.id)
      // 用真实结果校准
      addOptimistic(result.likeCount)
    } catch {
      // 失败回滚
      addOptimistic(post.likeCount)
      setLiked(false)
    }
  }, [post.id, post.likeCount, optimisticCount, addOptimistic])

  return (
    <article>
      <h1>{post.title}</h1>
      <div style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>
        👤 {post.author} · {new Date(post.createdAt).toLocaleString()} · {post.tags.map((t) => `#${t}`).join(' ')}
      </div>
      <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{post.content}</div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={handleLike} style={{ padding: '8px 16px' }}>
          {liked ? '❤️' : '🤍'} {optimisticCount}
        </button>
        <span>💬 {post.commentCount}</span>
      </div>

      <CommentSection postId={post.id} />
    </article>
  )
}

// ============================================================================
// 评论区：useActionState 管理表单提交
// ============================================================================

function CommentSection({ postId }: { postId: number }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loaded, setLoaded] = useState(false)

  // 加载评论
  useEffect(() => {
    let cancelled = false
    fetchComments(postId).then((list) => {
      if (!cancelled) {
        setComments(list)
        setLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [postId])

  // 🎯 useActionState（React 19）：[state, formAction, isPending]
  // action 函数返回新 state，表单提交时自动调用，isPending 反映加载状态
  const [commentState, submitAction, isPending] = useActionState(
    async (_prev: { ok: boolean; msg?: string }, formData: FormData) => {
      const content = (formData.get('content') as string)?.trim()
      if (!content) return { ok: false, msg: '评论内容不能为空' }
      try {
        const comment = await createComment(postId, '游客', content)
        setComments((prev) => [comment, ...prev])
        return { ok: true }
      } catch (e) {
        return { ok: false, msg: (e as Error).message }
      }
    },
    { ok: true },
  )

  return (
    <section style={{ marginTop: 32 }}>
      <h3>评论区</h3>

      {/* 评论表单 */}
      <form action={submitAction} style={{ marginBottom: 16 }}>
        <textarea
          name="content"
          placeholder="写评论..."
          style={{ width: '100%', padding: 12, boxSizing: 'border-box', minHeight: 80 }}
          required
        />
        <button type="submit" disabled={isPending} style={{ marginTop: 8, padding: '8px 16px' }}>
          {isPending ? '发送中...' : '发表评论'}
        </button>
        {!commentState.ok && commentState.msg && (
          <span style={{ color: 'red', marginLeft: 12 }}>{commentState.msg}</span>
        )}
      </form>

      {/* 评论列表 */}
      <div>
        {!loaded && <div>加载评论中...</div>}
        {loaded && comments.length === 0 && <div style={{ color: '#999' }}>暂无评论</div>}
        {comments.map((c) => (
          <div key={c.id} style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontWeight: 'bold' }}>{c.author}</div>
            <div>{c.content}</div>
            <div style={{ color: '#999', fontSize: 12 }}>
              {new Date(c.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// 骨架屏
// ============================================================================

function Skeleton() {
  return (
    <div style={{ animation: 'pulse 1.5s infinite' }}>
      <div style={{ height: 32, background: '#eee', borderRadius: 4, marginBottom: 16, width: '60%' }} />
      <div style={{ height: 14, background: '#eee', borderRadius: 4, marginBottom: 12, width: '40%' }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ height: 14, background: '#eee', borderRadius: 4, marginBottom: 8, width: `${80 + (i % 4) * 5}%` }} />
      ))}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  )
}

// ============================================================================
// 页面入口
// ============================================================================

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const postId = Number(id)

  // 🎯 resource 存在 PostDetailPage（不会被 Suspense 重挂的稳定祖先），
  // PostContent 被重挂时 resource 引用不变，避免重复请求
  const [resource] = useState(() =>
    postId > 0 ? createResource(fetchPostDetail(postId)) : null,
  )

  if (!postId || !resource) return <div>无效的文章 ID</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <Link to="/lab/feed" style={{ textDecoration: 'none' }}>← 返回列表</Link>
      <Suspense fallback={<Skeleton />}>
        <PostContent resource={resource} />
      </Suspense>
    </div>
  )
}
