/** 统一信封：旧 v1 与新 v2 一致的响应结构 { code, message, data } */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** 游标分页信封（不透明字符串游标，前端只负责透传） */
export interface CursorPage<T> {
  list: T[]
  nextCursor: string | null
  hasMore: boolean
}

/**
 * 复合游标编解码：`${createdAt}|${id}` → base64url
 *
 * 🎯 面试考点：游标分页为什么用不透明 token？
 * 1. 前端无需理解排序规则，后端可以自由调整排序字段；
 * 2. 避免暴露自增 id 规模等业务信息；
 * 3. 多字段排序时只能靠复合游标保证翻页不重不漏。
 */
export function encodeCursor(createdAt: string | Date, id: number): string {
  const ts = createdAt instanceof Date ? createdAt.toISOString() : createdAt
  // btoa/atob 在浏览器与 Node 18+ 都是全局 API，shared 层不依赖 Node Buffer
  return btoa(`${ts}|${id}`)
}

export function decodeCursor(cursor: string): { createdAt: string; id: number } | null {
  try {
    const raw = atob(cursor)
    const [createdAt, idStr] = raw.split('|')
    const id = Number(idStr)
    if (!createdAt || !Number.isInteger(id)) return null
    return { createdAt, id }
  } catch {
    return null
  }
}
