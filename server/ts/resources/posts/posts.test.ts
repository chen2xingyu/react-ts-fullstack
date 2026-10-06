// @vitest-environment node
/**
 * posts 资源集成测试（supertest + 真实数据库）
 *
 * 🎯 面试考点：集成测试 vs 单元测试
 * - 单元测试 mock 掉 DB，测纯逻辑；集成测试走真实 DB + HTTP 栈，
 *   验证"路由 → 校验 → SQL → 事务 → 响应"整条链路，能抓住单元测试漏掉的问题
 *   （如 SQL 语法、事务隔离、Zod 校验是否真的生效）。
 *
 * 数据策略：点赞有 UNIQUE 键天然幂等，重复跑测试结果一致；
 * 评论每次新增几条演示数据，不影响断言。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import supertest from 'supertest'
import '../../load-env.js'
import { createV2App } from '../../app.js'

const app = createV2App()
const request = supertest(app)

describe('GET /posts 游标分页', () => {
  it('默认返回 20 条且 hasMore=true', async () => {
    const res = await request.get('/posts').expect(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.list).toHaveLength(20)
    expect(res.body.data.hasMore).toBe(true)
    expect(res.body.data.nextCursor).toBeTruthy()
  })

  it('游标翻页不重复不遗漏', async () => {
    const page1 = await request.get('/posts').expect(200)
    const cursor = page1.body.data.nextCursor
    const ids1 = page1.body.data.list.map((p: { id: number }) => p.id)

    const page2 = await request.get(`/posts?cursor=${cursor}`).expect(200)
    const ids2 = page2.body.data.list.map((p: { id: number }) => p.id)

    // 两页无交集（不重复）
    expect(ids1.some((id: number) => ids2.includes(id))).toBe(false)
    // 排序稳定：上一页最后一条 id > 下一页第一条 id（DESC）
    expect(ids1[ids1.length - 1]).toBeGreaterThan(ids2[0])
  })

  it('关键词搜索过滤标题/摘要', async () => {
    const res = await request.get('/posts?keyword=React').expect(200)
    expect(res.body.data.list.length).toBeGreaterThan(0)
    for (const p of res.body.data.list) {
      const hit = p.title.includes('React') || p.summary.includes('React')
      expect(hit).toBe(true)
    }
  })

  it('limit 超出 max(50) 返回 422', async () => {
    const res = await request.get('/posts?limit=100')
    expect(res.status).toBe(422)
  })
})

describe('GET /posts/:id 详情', () => {
  it('返回含 content 的完整文章', async () => {
    const list = await request.get('/posts').expect(200)
    const id = list.body.data.list[0].id
    const res = await request.get(`/posts/${id}`).expect(200)
    expect(res.body.data.id).toBe(id)
    expect(res.body.data.content).toBeTruthy()
    expect(res.body.data.content.length).toBeGreaterThan(100)
  })

  it('不存在的 id 返回 404', async () => {
    const res = await request.get('/posts/99999999')
    expect(res.status).toBe(404)
  })

  it('非法 id 返回 400', async () => {
    const res = await request.get('/posts/abc')
    expect(res.status).toBe(400)
  })
})

describe('POST /posts/:id/comments 评论', () => {
  it('content 为空返回 422', async () => {
    const res = await request
      .post('/posts/1/comments')
      .send({ content: '' })
    expect(res.status).toBe(422)
  })

  it('发表成功返回 201 + 新评论', async () => {
    const res = await request
      .post('/posts/1/comments')
      .send({ author: '测试用户', content: '集成测试评论' })
      .expect(201)
    expect(res.body.data.author).toBe('测试用户')
    expect(res.body.data.postId).toBe(1)
  })
})

describe('POST /posts/:id/like 点赞（幂等）', () => {
  it('连续点赞两次，第二次不重复计数', async () => {
    const r1 = await request.post('/posts/1/like').expect(200)
    const r2 = await request.post('/posts/1/like').expect(200)
    // 🎯 幂等核心：重复请求结果一致，likeCount 不变
    expect(r2.body.data.likeCount).toBe(r1.body.data.likeCount)
    // 若第一次是新点赞则 liked=true，第二次必为 false
    if (r1.body.data.liked) {
      expect(r2.body.data.liked).toBe(false)
    }
  })
})

describe('令牌桶限流', () => {
  it('超过桶容量返回 429', async () => {
    // 点赞接口 max=3，连发 6 次，至少有一次 429
    let hit429 = false
    for (let i = 0; i < 6; i++) {
      const res = await request.post('/posts/1/like')
      if (res.status === 429) {
        hit429 = true
        break
      }
    }
    expect(hit429).toBe(true)
  })
})
