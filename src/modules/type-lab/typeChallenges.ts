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
 * 🎯 考点：条件类型分配律（distributive）—— 当 T 是联合类型 `A | B` 时，
 *   `T extends X ? Y : Z` 会「分发」成对 A、B 分别判断，再把结果联合起来，即
 *   (A extends X ? Y : Z) | (B extends X ? Y : Z)。若不想分发（想整体判断这个联合），
 *   用 `[T] extends [X]` 把 T 包成单元素元组，切断分发。
 * TS→JS：整条 type 定义编译后完全不存在，不产生任何 JS —— 它只是给 tsc 看的约束。
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
 * 🎯 as 重映射（TS4.1+）：在 mapped type 里用 as 把键 K 换成新键；返回 never 的键会被整个丢弃。
 *   手写 Omit 就是 `{ [K in keyof T as Exclude<K, 'x'>]: T[K] }` —— 与本题同构。
 * TS→JS：这些类型运算零运行时代码，编译后全部擦除。
 */
export type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K]
}

// ============================================================
// 3. MyAwaited<T>：手写 Promise 解包（递归处理嵌套 Promise）
// ============================================================
/**
 * 思路：条件类型 + infer。Promise<Promise<string>> 也要解成 string，所以要递归。
 * 🎯 infer：只能出现在 extends 右侧的「模式位置」，让 TS 把匹配到的那部分「反推」成类型
 *   变量 R（声明式，不是你赋值给它）。递归层层拆 Promise，直到不是 Promise 就返回 T 本身。
 * TS→JS：编译后无产物；运行时真正解包 Promise 靠的是 await（值层面），这里只是类型提示。
 */
export type MyAwaited<T> = T extends Promise<infer R> ? MyAwaited<R> : T

// ============================================================
// 4. infer 参数推导：取函数第 N 个参数 / 返回值
// ============================================================
/**
 * 思路：infer 在 extends 的「模式匹配位置」声明一个类型变量，由 TS 反推。
 * 这就是内置 Parameters<T> / ReturnType<T> 的实现原理。
 * 🎯 LastParameter 用了「尾部 infer」：...args: infer A 先拿到整个参数元组 A，
 *   再 `A extends [...unknown[], infer L]` 取最后一个元素 —— 内置工具类型就是这么写的。
 *   `...args: never[]` 表示「不管后面还有几个参数都接受」，避免参数个数不匹配导致匹配失败。
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
 * 🎯 模板字面量类型（TS4.1+）：`/posts/${number}` 不是运行时模板字符串求值，而是类型层拼接；
 *   可配合 Uppercase / Lowercase / Capitalize 做 KebabCase ↔ CamelCase 的转换体操。
 * TS→JS：`type Id = \`${number}\`` 编译后消失；navigate 运行时只收到一个普通字符串。
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
 * 🎯 三方对比（高频追问）：
 *   ① `const palette: Record<string, \`#${string}\`> = {...}` —— primary 被 widen 成 string，
 *      丢掉了 'primary' | 'danger' 的字面量联合；
 *   ② `{...} as const` —— 保留字面量，但不校验值是不是合法色值（写错 # 也不报错）；
 *   ③ `{...} as const satisfies Record<...>` —— 两者兼得：既校验又保留精确字面量。
 * TS→JS：satisfies / as const 不产生额外运行时代码；as const 只是让 tsc 把字面量锁窄、变 readonly。
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
 * 🎯 原理：`T & { [__brand]: B }` 是交叉类型，混入一个「访问不到的私有属性」。
 *   UserId 仍然能当字符串用（有 string 的全部能力），但结构上多了 brand，
 *   所以 UserId ≠ PostId。真正赋值时必须 `as UserId` 强转 —— brand 只存在于编译期，
 *   运行时它就是一个普通字符串。unique symbol 保证 brand 在模块外无法伪造。
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
 * 🎯 Equal 为什么这么绕：用「两个自调用泛型函数的赋值兼容性」来判定类型恒等。
 *   若 X = Y，这两个函数类型可互相赋值（true）；若 X ≠ Y（如 any），在逆变/协变位置上
 *   X、Y 不等价，即 false。这是 type-challenges 里 Equal 的经典写法。
 *   Expect<T extends true> 则要求传进来的必须是 true，否则 T 不满足约束直接报错。
 * TS→JS：type 别名全被擦除；底下那个 `_typeAssertions` 数组运行时只是 6 个 true。
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
