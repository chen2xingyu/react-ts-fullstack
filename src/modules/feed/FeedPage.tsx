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

  // 🎯 面试考点：列表页的"三态 + 游标"数据模型
  // list=数据；nextCursor=下一页游标；hasMore=后端说"还有没有"；
  // loading=加载中态；error=错误态。渲染层据此分流：
  //   空列表&!loading → 空态；loading → 骨架/转圈；error → 错误条；否则渲染列表。
  // 这就是后端/前端常考的"加载/空/错误"三态设计。
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
        // 翻页是"追加"不是"替换"：函数式更新 [...prev, ...page.list]；
        // 关键词切换时（见下方 effect）才先 setList([]) 再拉首页，二者职责分开
        setList((prev) => [...prev, ...page.list])
        setNextCursor(page.nextCursor)
        // 🎯 cursor 分页 vs offset 分页（追问）：cursor 是上一页最后一条的
        // 位置标记，翻页不跳号、列表中途插入数据也不会漏/重；offset 分页在
        // 实时榜单类场景会因数据漂移导致重复或遗漏。
        setHasMore(page.hasMore)
      } catch (e) {
        // 🎯 主动 abort 抛出的 CanceledError 必须静默吞掉：它是"我们自己取消的"，
        // 不是真错误，否则切换关键词时屏幕会闪一下红字。
        // axios CanceledError 是主动取消，不算错误
        if ((e as { name?: string })?.name === 'CanceledError') return
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // 🎯 关键词（防抖后）变化 → 重置整个分页状态再拉首页：
  // list 清空、游标归零、hasMore 复位、错误清空，与"翻页追加"严格分离，
  // 避免新搜索结果拼在旧结果后面。依赖用 debouncedKeyword 而非 keyword，
  // 所以这串重置 + 请求最多每 400ms 才发生一次。
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

/**
 * 🎯 面试考点：为什么真实 Feed 用普通 map，这里却单独演示虚拟列表？
 * 真实列表是"无限滚动分页"：每页 20 条、攒到几百条 DOM 尚可接受；
 * 虚拟列表解决的是"单批就是上万条、且不打算分页"的场景。
 * 这里用 1000 条静态数据演示：无论怎么滚，渲染节点恒为可视区+缓冲，
 * 用来直观对比"一次性全渲染"的开销。
 */
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
