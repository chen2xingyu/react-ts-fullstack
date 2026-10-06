/**
 * 演示数据填充：500+ 篇文章 + 前 20 篇各若干评论
 * 用法：npm run db:seed（幂等：已有数据时跳过）
 *
 * 虚拟滚动 / 无限滚动 / 游标分页都需要足够大的列表才有演示意义。
 */
import '../load-env.js'
import { pool } from '../config/db.js'

const POST_COUNT = 500
const TAG_POOL = ['React', 'TypeScript', 'Node.js', '性能优化', '面试', 'Hooks', '工程化', '浏览器原理']
const TITLE_TOPICS = [
  'useEffect 闭包陷阱复盘',
  '虚拟列表原理与手写实现',
  '从游标分页聊到深分页性能',
  'AbortController 解决请求竞态',
  'React 19 Actions 实战',
  'TS 条件类型与 infer 详解',
  'Redis 缓存三大问题治理',
  '令牌桶限流中间件设计',
  'Suspense 与错误边界协作',
  'Node 优雅关停实战',
]

const AUTHORS = ['前端小智', 'TS 布道师', 'Node 老兵', '面试教练', '性能调优师', '匿名贡献者']

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]
}

function buildContent(i: number): string {
  const topic = pick(TITLE_TOPICS, i)
  return [
    `这是第 ${i + 1} 篇演示文章，主题：${topic}。`,
    '',
    '本文会从问题背景、原理拆解、代码实现、踩坑记录四个层面展开。',
    '第一部分介绍为什么会出现这个问题，以及在什么规模下它会成为瓶颈；',
    '第二部分用图示与最小可运行代码拆解核心机制；',
    '第三部分给出工程化的实现方案与边界条件处理；',
    '最后总结面试中被追问时的回答框架。',
    '',
    '关键词：可重复实验、量化对比、线上监控、回滚预案。',
    `（seed 确定性占位段落，编号 ${i + 1}，可在前端搜索该编号验证检索准确性。）`,
  ].join('\n')
}

async function main() {
  const [[{ cnt }]] = await pool.query<any[]>('SELECT COUNT(*) AS cnt FROM lab_posts')
  if (Number(cnt) > 0) {
    console.log(`ℹ lab_posts 已有 ${cnt} 条数据，跳过 seed（清空表后可重新执行）`)
    return
  }

  const now = Date.now()
  const rows: unknown[][] = []
  for (let i = 0; i < POST_COUNT; i++) {
    const topic = pick(TITLE_TOPICS, i)
    const title = `${i + 1}. ${topic}（#${String(i + 1).padStart(3, '0')}）`
    const summary = `一篇关于「${topic}」的演示文章，适合无限滚动、虚拟列表与关键词搜索实验。`
    const tags = JSON.stringify([pick(TAG_POOL, i), pick(TAG_POOL, i + 3), pick(TAG_POOL, i + 5)])
    const author = pick(AUTHORS, i)
    // id 越大时间越新，相邻间隔 7 分钟，排序稳定便于游标分页演示
    const createdAt = new Date(now - (POST_COUNT - i) * 7 * 60 * 1000)
    rows.push([title, summary, buildContent(i), author, tags, createdAt])
  }

  // 批量插入，每批 50 条
  const BATCH = 50
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH)
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')
    await pool.query(
      `INSERT INTO lab_posts (title, summary, content, author, tags, created_at) VALUES ${placeholders}`,
      batch.flat(),
    )
    process.stdout.write(`\r  插入文章 ${Math.min(start + BATCH, POST_COUNT)}/${POST_COUNT}`)
  }
  process.stdout.write('\n')

  // 前 20 篇各 1~3 条评论，用于详情页演示
  const commentRows: unknown[][] = []
  for (let postId = 1; postId <= 20; postId++) {
    const n = (postId % 3) + 1
    for (let j = 0; j < n; j++) {
      commentRows.push([
        postId,
        pick(AUTHORS, postId + j),
        `第 ${j + 1} 条演示评论：写得很清楚，请问第 ${postId} 篇有配套代码吗？`,
        new Date(now - (POST_COUNT - postId) * 7 * 60 * 1000 + j * 60_000),
      ])
    }
  }
  const cPlaceholders = commentRows.map(() => '(?, ?, ?, ?)').join(', ')
  await pool.query(
    `INSERT INTO lab_comments (post_id, author, content, created_at) VALUES ${cPlaceholders}`,
    commentRows.flat(),
  )
  await pool.query('UPDATE lab_posts SET comment_count = (SELECT COUNT(*) FROM lab_comments WHERE lab_comments.post_id = lab_posts.id) WHERE id <= 20')

  console.log(`🎉 seed 完成：${POST_COUNT} 篇文章，${commentRows.length} 条评论`)
}

main()
  .catch((err) => {
    console.error('❌ seed 失败:', err.message)
    process.exit(1)
  })
  .finally(() => pool.end())
