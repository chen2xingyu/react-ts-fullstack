/**
 * 🎯 面试考点：TypeScript 高级类型手写题库
 *
 * 全部在「类型层面」解题：不写运行时代码，只写类型运算。
 * 每个类型都配「思路注释 + 类型断言验证」，tsc 不通过即答案错误。
 */

// ============================================================
// 1. DeepPartial<T>：把所有属性（含嵌套对象）变成可选
// ============================================================
/**
 * 思路：递归 mapped type。遇到对象就继续 DeepPartial，遇到原始类型直接可选。
 * 注意排除数组/函数/Date 等不该递归展开的类型。
 */
export type DeepPartial<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T

// ============================================================
// 2. PickByType<T, U>：从 T 中挑出「属性类型是 U」的键组成新对象
// ============================================================
/**
 * 思路：mapped type + as 重映射（key remapping）。
 * [K in keyof T as T[K] extends U ? K : never] 把不匹配的键过滤成 never 自动丢弃。
 */
export type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K]
}

// ============================================================
// 3. MyAwaited<T>：手写 Promise 解包（递归处理嵌套 Promise）
// ============================================================
/**
 * 思路：条件类型 + infer。Promise<Promise<string>> 也要解成 string，所以要递归。
 */
export type MyAwaited<T> = T extends Promise<infer R> ? MyAwaited<R> : T

// ============================================================
// 4. infer 参数推导：取函数第 N 个参数 / 返回值
// ============================================================
/**
 * 思路：infer 在 extends 的「模式匹配位置」声明一个类型变量，由 TS 反推。
 * 这就是内置 Parameters<T> / ReturnType<T> 的实现原理。
 */
export type FirstParameter<T> = T extends (first: infer P, ...args: never[]) => unknown ? P : never
export type LastParameter<T> = T extends (...args: infer A) => unknown
  ? A extends [...unknown[], infer L]
    ? L
    : never
  : never

// ============================================================
// 5. 模板字面量类型：类型安全的「路由跳转函数」
// ============================================================
/**
 * 思路：模板字面量类型把字符串字面量拼接成联合类型。
 * 下面 RoutePath 只允许 '/posts/数字' 或 '/users/数字' 两种格式，
 * 写错路径在编译期就报错。
 */
type Id = `${number}`
export type RoutePath = `/posts/${Id}` | `/users/${Id}`

export function navigate(path: RoutePath) {
  // 演示用：真实项目里这里会调 router.push
  return path
}

// ============================================================
// 6. satisfies：保留字面量推导 + 类型约束
// ============================================================
/**
 * 思路：`as const` 会让所有字段变 readonly，但丢失「这是合法配置」的校验。
 * satisfies 既做类型检查，又不 widen 类型，保留每个字段的精确字面量类型。
 */
export const palette = {
  primary: '#3b82f6',
  danger: '#ef4444',
} as const satisfies Record<string, `#${string}`>

export type PaletteKey = keyof typeof palette

// ============================================================
// 7. Branded Type：防止「同结构但不同语义」的 primitive 混用
// ============================================================
/**
 * 思路：给基础类型加一个「虚拟标记」，UserId 和 PostId 都是 string，
 * 但不能互相赋值，防止把 postId 当成 userId 传给 API。
 * 运行时是 0 开销（纯类型层）。
 */
declare const __brand: unique symbol
export type Brand<T, B> = T & { [__brand]: B }

export type UserId = Brand<string, 'UserId'>
export type PostId = Brand<string, 'PostId'>

export function toUserId(id: string): UserId {
  return id as UserId
}
export function toPostId(id: string): PostId {
  return id as PostId
}

// ============================================================
// 8. 类型断言辅助：让测试在编译期就报错
// ============================================================
/**
 * 🎯 面试考点：不用 expectTypeOf 库，手写「类型相等断言」
 * 如果 A 和 B 不完全相同，下面会报 Type error。
 */
export type Expect<T extends true> = T
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false

// ---------- 断言区：改错任何一个类型，tsc 立刻报错 ----------

type TestDeepPartial = Expect<
  Equal<
    DeepPartial<{ a: number; b: { c: string } }>,
    { a?: number; b?: { c?: string } }
  >
>

type TestPickByType = Expect<
  Equal<
    PickByType<{ id: number; name: string; age: number }, number>,
    { id: number; age: number }
  >
>

type TestMyAwaited = Expect<Equal<MyAwaited<Promise<Promise<string>>>, string>>

type TestFirstParameter = Expect<
  Equal<FirstParameter<(a: string, b: number) => void>, string>
>

type TestLastParameter = Expect<
  Equal<LastParameter<(a: string, b: number) => void>, number>
>

type TestPaletteKey = Expect<Equal<PaletteKey, 'primary' | 'danger'>>

// 类型断言不运行，只让 tsc 在开发期报错
export const _typeAssertions: [
  TestDeepPartial,
  TestPickByType,
  TestMyAwaited,
  TestFirstParameter,
  TestLastParameter,
  TestPaletteKey,
] = [true, true, true, true, true, true]
