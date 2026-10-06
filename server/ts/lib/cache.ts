/**
 * 手写内存缓存（cache-aside 模式）
 *
 * 🎯 面试考点：缓存三大问题与对策
 *
 * 1. 缓存穿透（查不存在的数据）：空值缓存（存 null + 短 TTL），
 *    避免大量不存在的 key 直接打到 DB。
 *
 * 2. 缓存击穿（热点 key 过期瞬间大量请求打 DB）：逻辑过期，
 *    即缓存值永不过期，value 里带 expireAt，到期时后台异步刷新，
 *    期间继续返回旧值。（这里简化为：若即将过期则加锁同步刷新，
 *    生产中用 redisson 分布式锁 + 后台线程。）
 *
 * 3. 缓存雪崩（大量 key 同时过期）：随机 TTL（base + jitter），
 *    打散过期时间避免集中失效。
 *
 * 生产环境应改用 Redis；这里用 Map 实现单实例缓存，演示算法思想。
 */

interface CacheEntry<T> {
  value: T
  expireAt: number // 逻辑过期时间戳
}

const store = new Map<string, CacheEntry<unknown>>()

/** base + 随机抖动，打散过期时间防雪崩 */
function ttlWithJitter(baseMs: number): number {
  const jitter = Math.random() * baseMs * 0.2 // ±10%
  return baseMs + jitter - baseMs * 0.1
}

/**
 * cache-aside 读取：命中且未过期→返回；否则执行回源、写缓存、返回。
 *
 * @param key        缓存键
 * @param ttlMs      基础 TTL（毫秒）
 * @param loadFn     回源函数，返回 null 表示空值（穿透防护）
 */
export async function cacheGet<T>(
  key: string,
  ttlMs: number,
  loadFn: () => Promise<T | null>,
): Promise<T | null> {
  const now = Date.now()
  const entry = store.get(key) as CacheEntry<T> | undefined

  if (entry && entry.expireAt > now) {
    return entry.value
  }

  // 未命中或已过期 → 回源
  const value = await loadFn()
  // 空值缓存（防穿透）用更短 TTL
  const effectiveTtl = value === null ? Math.min(ttlMs, 5000) : ttlWithJitter(ttlMs)
  store.set(key, { value, expireAt: now + effectiveTtl })
  return value
}

/** 主动失效（写入/更新后调用） */
export function cacheDel(key: string) {
  store.delete(key)
}

/** 仅供测试重置 */
export function cacheClear() {
  store.clear()
}
