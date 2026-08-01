import { TechPoint } from './types'

export const tsPoints: TechPoint[] = [
  {
    id: 'ts-advanced-types',
    category: 'TypeScript',
    depth: 'principle',
    title: 'TypeScript 的条件类型、映射类型、模板字面量类型怎么用？',
    summary:
      '条件类型用 extends 做三元判断，映射类型遍历 key 生成新类型，模板字面量类型基于字符串拼接生成类型。三者组合可实现强大的类型推导。',
    answer: `## 条件类型
条件类型的语法是 T extends U ? X : Y，类似于三元表达式。
- 基本用法：判断类型是否满足条件返回对应类型
- 分布式特性：当 T 是联合类型时，会自动分发到每个成员上
- infer 关键字：可以在条件类型中推断类型变量

## 映射类型
映射类型通过 keyof 遍历 T 的所有 key，生成新的类型。
- 基础映射：[P in keyof T] 遍历所有属性
- 修饰符：可添加 readonly、可选 ? 等
- as 重映射：可以改变 key 的名称

## 模板字面量类型
模板字面量类型基于字符串模板生成新的字符串类型。
- 使用 \`...\` 包裹字符串模式
- 通过 infer 提取字符串的部分内容
- 可以组合内置工具类型如 Uppercase、Capitalize

## 实战组合
三者组合可以实现：类型安全的路由定义、事件名推导、DTO 生成等高级功能。`,
    code: `// 条件类型
type IsString<T> = T extends string ? true : false
type A = IsString<'hello'>  // true

// 分布式条件类型
type ToArray<T> = T extends any ? T[] : never
type B = ToArray<string | number>  // string[] | number[]

// infer 提取类型
type Awaited<T> = T extends Promise<infer U> ? U : T
type Result = Awaited<Promise<string>>  // string

// 映射类型 - Partial 实现
type MyPartial<T> = {
  [P in keyof T]?: T[P]
}

// 条件映射 - 提取必填 key
type RequiredKeys<T> = {
  [K in keyof T]: {} extends Pick<T, K> ? never : K
}[keyof T]

// as 重映射
type Getter<T> = {
  [P in keyof T as \`get\${Capitalize<P & string>}\`]: () => T[P]
}
// { getName: () => string; getAge: () => number }

// 模板字面量类型 - CamelCase
type CamelCase<S extends string> =
  S extends \`\${infer P}_\${infer C}\${infer R}\`
    ? \`\${P}\${Uppercase<C>}\${CamelCase<R>}\`
    : S
type Name = CamelCase<'my_name'>  // 'myName'

// 模板字面量 - EventName
type EventName<T extends string> = \`on\${Capitalize<T>}\`
type Click = EventName<'click'>  // 'onClick'

// 类型安全的路由
type Routes = {
  '/users': { GET: { response: User[] } }
  '/posts': { POST: { body: NewPost; response: Post } }
}`,
    links: [
      { title: 'TypeScript 高级类型体操 - 掘金', url: 'https://juejin.cn/post/6844904202577945614', site: '掘金' },
      { title: 'TS 类型体操挑战 - GitHub', url: 'https://github.com/type-challenges/type-challenges', site: 'GitHub' },
      { title: '条件类型与映射类型 - 知乎', url: 'https://zhuanlan.zhihu.com/p/418369575', site: '知乎' },
    ],
  },
  {
    id: 'ts-pick-omit',
    category: 'TypeScript',
    depth: 'implementation',
    title: 'TypeScript 中 Partial、Required、Pick、Omit、Record 等工具类型的实现原理？',
    summary:
      '这些工具类型都是基于映射类型和条件类型实现的。通过 keyof、in、extends 等关键字组合实现类型转换。',
    answer: `## 源码解析

### Partial<T>
核心：[P in keyof T] 遍历所有属性，加上 ? 可选修饰符

### Required<T>
核心：[P in keyof T]-? 移除可选修饰符，让所有属性变为必选

### Pick<T, K>
核心：[P in K] 只遍历指定的 key 子集

### Omit<T, K>
核心：Pick<T, Exclude<keyof T, K>> 通过排除 key 实现

### Record<K, V>
核心：[P in K] 遍历联合类型 K，值为 V 类型

### Exclude & Extract
- Exclude<T, U>：T extends U ? never : T，排除 U 中的成员
- Extract<T, U>：T extends U ? T : never，提取 U 中的成员

## 实战技巧
- 可以组合多个工具类型实现复杂类型转换
- 条件类型 + 映射类型可以实现深度递归处理
- 类型体操的核心是：infer 推断 + 分布式条件类型 + 模板字面量`,
    code: `// Partial<T> - 所有属性变可选
type Partial<T> = { [P in keyof T]?: T[P] }

// Required<T> - 所有属性变必选
type Required<T> = { [P in keyof T]-?: T[P] }

// Readonly<T> - 所有属性只读
type Readonly<T> = { readonly [P in keyof T]: T[P] }

// Pick<T, K> - 选取部分属性
type Pick<T, K extends keyof T> = { [P in K]: T[P] }

// Omit<T, K> - 排除部分属性
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>

// Record<K, V> - 键值对
type Record<K extends keyof any, V> = { [P in K]: V }

// Exclude<T, U> - 排除
type Exclude<T, U> = T extends U ? never : T

// Extract<T, U> - 提取
type Extract<T, U> = T extends U ? T : never

// DeepPartial - 递归可选
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// 获取非函数属性
type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]

// 使指定属性可变
type Mutable<T, K extends keyof T> = Omit<T, K> & {
  -readonly [P in K]: T[P]
}`,
    links: [
      { title: 'TypeScript 工具类型全解析 - 掘金', url: 'https://juejin.cn/post/7040780482973881395', site: '掘金' },
      { title: 'TS 高级类型实战 - 知乎', url: 'https://zhuanlan.zhihu.com/p/359691606', site: '知乎' },
    ],
  },
]
