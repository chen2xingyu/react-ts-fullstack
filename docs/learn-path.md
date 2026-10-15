# Vue 转 React + TypeScript · 一对一路图

配合本仓库学。每阶段有「对照 Vue」「必读文件」「过关题」。做完过关题再进下一阶段。

**约定**：每次对话只攻一个主题；你交作业（用自己的话 + 贴你改过的代码），我批改后再开下一课。

---

## 阶段总览

| 阶段 | 目标 | 仓库入口 | 大约节奏 |
|---|---|---|---|
| 0 | 心智模型：Vue 响应式 vs React 重渲染 | 本文件 + `src/pages/Home.tsx` | 1 课 |
| 1 | JSX + 组件 + props + 列表 key | `src/pages/Home.tsx` `Layout.tsx` | 1–2 课 |
| 2 | `useState` / 受控输入 / 事件 | `/lab/patterns` 受控对照 | 2 课 |
| 3 | `useEffect` / `useRef` / 闭包陷阱 | `/lab/hooks` + `src/hacks/` | 3 课 |
| 4 | TypeScript：类型、泛型、zod | `/lab/types` | 3 课 |
| 5 | 路由、守卫、懒加载、ErrorBoundary | `src/router/index.tsx` | 1 课 |
| 6 | Zustand vs Vuex；Query vs 自己请求 | `src/store/` `src/hooks/useUsers.ts` | 2 课 |
| 7 | 列表性能：memo、虚拟列表、无限滚 | `/lab/perf` `/lab/feed` | 2 课 |
| 8 | 模式：HOC / Render Props / 并发 | `/lab/patterns` `/lab/kanban` | 2 课 |
| 9 | 鉴权、WS、安全 | `/login` `/trading` `/lab/security` | 2 课 |
| 10 | 面试模拟（对照 `docs/architect-interview.md`） | 全仓库 | 持续 |

交易系统深水区（撮合、冻结）放在 React/TS 过关之后，见 `docs/tech-notes.md`。

---

## Vue → React 速查（先印在脑子里）

| Vue | React | 别踩的坑 |
|---|---|---|
| SFC 模板 | 函数组件 return JSX | JSX 是表达式，不是字符串 HTML |
| `ref` / `reactive` | `useState` | 改 state 必须 `setX`，直接改对象不会刷新 |
| `computed` | 推导变量 / `useMemo` | 简单计算直接写函数体里，不必 memo |
| `watch` / `watchEffect` | `useEffect` | effect 在 **commit 之后** 跑，不是渲染中 |
| `onMounted` / `onUnmounted` | `useEffect(() => { ...; return cleanup }, [])` | 空依赖 ≈ mounted；cleanup ≈ unmounted |
| `v-model` | `value` + `onChange`（受控） | 没有默认双向绑定 |
| `v-if` / `v-show` | `{cond && <A/>}` / 三元 | `0 && <X/>` 会渲染出 0 |
| `v-for` | `list.map` | `key` 必须稳定，不要用 index 当会重排的列表的 key |
| `provide` / `inject` | Context | 更新会广播整棵消费者树 |
| Vuex / Pinia | Zustand（客户端）+ React Query（服务端） | 不要用一个 store 管所有请求 |
| Vue Router | React Router | 守卫是组件（`Navigate`），不是 `beforeEach` |
| 插槽 | `children` / render prop | 具名插槽 ≈ 多个 ReactNode props |
| 指令 | 没有；用 props 或 hook | 想复用逻辑 → 自定义 Hook，不是指令 |

**最大差异（面试第一句）**：Vue 追踪依赖、尽量只更新用到的组件；React 默认「state 变了就重新执行整个函数组件」，靠 `memo` / 拆组件 / 并发特性收敛。从 Vue 过来的人，不理解「整函数重跑」就会在闭包、effect 依赖、无谓渲染上挂。

---

## 阶段 0 过关（第一课作业）

用自己的话（不要抄）回答：

1. React 函数组件被调用了一次，和 Vue 组件 `setup` 执行一次，有什么不同？
2. 为什么 `count++` 在 React 里界面不变，在 Vue `ref` 里会变？
3. 打开 `src/pages/Home.tsx`，指出：哪个是组件、哪个是 props、点击 +1 发生了什么。

做完把答案发回来。
