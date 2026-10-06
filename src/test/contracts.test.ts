import { describe, it, expect } from 'vitest'
import { encodeCursor, decodeCursor } from '@shared/contracts/common'
import { postListQuerySchema, postListItemSchema } from '@shared/contracts/post.schema'

describe('共享契约：游标编解码', () => {
  it('encode → decode 往返一致', () => {
    const ts = '2026-10-06T08:00:00.000Z'
    const cursor = encodeCursor(ts, 42)
    expect(cursor).not.toContain('42') // 不透明 token，不直接暴露明文
    expect(decodeCursor(cursor)).toEqual({ createdAt: ts, id: 42 })
  })

  it('非法游标返回 null，不抛异常', () => {
    expect(decodeCursor('%%%not-base64')).toBeNull()
    expect(decodeCursor(btoa('abc'))).toBeNull()
  })
})

describe('共享契约：zod schema', () => {
  it('list query 的字符串 limit 被 coerce 为数字并应用默认值', () => {
    expect(postListQuerySchema.parse({}).limit).toBe(20)
    expect(postListQuerySchema.parse({ limit: '50' }).limit).toBe(50)
  })

  it('超范围 limit 校验失败', () => {
    expect(postListQuerySchema.safeParse({ limit: '999' }).success).toBe(false)
  })

  it('postListItem 合法数据可通过，缺字段被拦截', () => {
    const valid = {
      id: 1,
      title: 't',
      summary: 's',
      author: 'a',
      tags: ['React'],
      likeCount: 0,
      commentCount: 2,
      createdAt: '2026-10-06T08:00:00.000Z',
    }
    expect(postListItemSchema.safeParse(valid).success).toBe(true)
    expect(postListItemSchema.safeParse({ ...valid, id: -1 }).success).toBe(false)
  })
})
