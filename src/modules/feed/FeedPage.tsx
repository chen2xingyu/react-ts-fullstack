import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useDebounce } from '@/hacks'
import { useInfiniteScroll } from './useInfiniteScroll'
import { VirtualList } from './VirtualList'
import { fetchPosts, type PostListQuery } from '@/api/v2/feed'
import type { PostListItem } from '@shared/contracts/post.schema'
import type { CursorPage } from '@shared/contracts/common'

/**
 * 文章 Feed 列表页
 *
 * 🎯 面试考点汇总：
 * 1. 游标分页 + 无限滚动（IntersectionObserver 哨兵）
 * 2. 搜索防抖（useDebounce）
 * 3. AbortController 取消旧请求（切换关键词时防竞态）
 * 4. 虚拟列表（1000 条数据只渲染可视区）
 */

const PAGE_SIZE = 20

export default function FeedPage() {
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebounce(keyword, 400)

  const [list, setList] = useState<PostListItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AbortController：每次新搜索/翻页时 abort 上一次请求
  const abortRef = useRef<AbortController | null>(null)

  const loadPage = useCallback(
    async (cursor: string | null, kw: string) => {
      // 🎯 取消上一次未完成的请求，避免旧响应覆盖新结果
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      try {
        const params: PostListQuery = { limit: PAGE_SIZE }
        if (cursor) params.cursor = cursor
        if (kw) params.keyword = kw
        const page: CursorPage<PostListItem> = await fetchPosts(params, controller.signal)
        setList((prev) => [...prev, ...page.list])
        setNextCursor(page.nextCursor)
        setHasMore(page.hasMore)
      } catch (e) {
        // axios CanceledError 是主动取消，不算错误
        if ((e as { name?: string })?.name === 'CanceledError') return
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // 关键词变化 → 重置列表 + 重新搜索
  useEffect(() => {
    setList([])
    setNextCursor(null)
    setHasMore(true)
    setError(null)
    loadPage(null, debouncedKeyword)
  }, [debouncedKeyword, loadPage])

  const sentinelRef = useInfiniteScroll(
    () => hasMore && !loading && loadPage(nextCursor, debouncedKeyword),
    hasMore,
    loading,
  )

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>📰 文章 Feed 流</h1>

      {/* 搜索框：防抖 400ms */}
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索文章标题/摘要（防抖 400ms）..."
        style={{ width: '100%', padding: 12, fontSize: 16, marginBottom: 16, boxSizing: 'border-box' }}
      />
      <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
        当前关键词：<code>{debouncedKeyword || '(全部)'}</code>
        {loading && <span style={{ marginLeft: 12 }}>⏳ 加载中...</span>}
      </div>

      {error && <div style={{ color: 'red', marginBottom: 12 }}>❌ {error}</div>}

      {/* 文章列表（无限滚动） */}
      <div>
        {list.map((post) => (
          <Link
            key={post.id}
            to={`/lab/feed/${post.id}`}
            style={{
              display: 'block',
              padding: 16,
              marginBottom: 12,
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <h3 style={{ margin: '0 0 8px' }}>{post.title}</h3>
            <p style={{ margin: '0 0 8px', color: '#666', fontSize: 14 }}>{post.summary}</p>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#999' }}>
              <span>👤 {post.author}</span>
              <span>❤️ {post.likeCount}</span>
              <span>💬 {post.commentCount}</span>
              <span>{post.tags.map((t) => `#${t}`).join(' ')}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* 哨兵元素：进入视口触发加载下一页 */}
      <div ref={sentinelRef} style={{ textAlign: 'center', padding: 20, color: '#999' }}>
        {hasMore ? (loading ? '加载中...' : '上拉加载更多') : '— 没有更多了 —'}
      </div>

      {/* 虚拟列表演示：1000 条数据只渲染可视区 */}
      <VirtualListDemo />
    </div>
  )
}

/** 虚拟列表演示：1000 条模拟数据，DOM 节点数始终 ≈ 可视区 + 缓冲 */
function VirtualListDemo() {
  const items = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    text: `虚拟列表项 #${i + 1} — 1000 条数据只渲染可视区域`,
  }))
  return (
    <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #eee' }}>
      <h3>⚡ 虚拟列表演示（1000 条）</h3>
      <p style={{ color: '#666', fontSize: 13 }}>
        打开 DevTools 观察 DOM：无论怎么滚动，列表项节点始终只有十几个。
      </p>
      <VirtualList
        items={items}
        itemHeight={48}
        height={300}
        renderItem={(item) => (
          <div style={{ padding: '0 16px', lineHeight: '48px', borderBottom: '1px solid #f0f0f0' }}>
            {item.text}
          </div>
        )}
      />
    </div>
  )
}
