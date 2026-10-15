# React + TypeScript 资深架构师面试题（对本仓库）

> 所有题目都能在本仓库找到对应实现。口述时先讲 **决策与取舍**，再指到文件。
>
> 在线对照：`/lab/arch` `/lab/types` `/lab/perf` `/lab/patterns` `/lab/feed` `/lab/kanban` `/lab/security` `/lab/metrics` `/lab/hooks` `/trading`

---

## 怎么讲（架构师口径）

| 层级 | 面试官要听的 | 不要只说 |
|---|---|---|
| 决策 | 为什么这样、代价、备选方案 | API 名字 |
| 边界 | 失败、并发、过期、降级 | 快乐路径 |
| 证据 | 文件、测试、线上指标 | 「一般会……」 |

---

## 一、架构与分层

### Q1. 介绍前端架构：状态怎么切？边界在哪？

**答**：服务端状态（列表、账户、K 线）走 **TanStack Query**（缓存 / stale / 失效）；客户端会话走 **Zustand**（token、用户）。路由级 `React.lazy` 分包，每页独立 `Suspense + ErrorBoundary`，错误隔离、切路由自动重置。

**代码**：`src/main.tsx`、`src/store/auth.ts`、`src/router/index.tsx`、`src/modules/arch/archData.ts`  
**演示**：`/lab/arch`

**追问**：为什么不用 Redux 管一切？  
Query 已经覆盖服务端缓存；再叠 Redux 是重复。客户端高频写（WS tick）也不该塞进 Context。

---

### Q2. 绞杀者模式（Strangler）怎么迁旧系统？

**答**：不停机。新能力一律 `/api/v2`（helmet → pino → zod → 令牌桶 → cache-aside），交易等旧链路 `/api/*` 零改动。TS 子应用在旧 `app.js` 求值前挂到 `globalThis`，保证中间件顺序。新表 `lab_` 前缀物理隔离。

**代码**：`src/modules/arch/archData.ts`、`server/ts/app.ts`  
**口述**：重写风险大、周期长；绞杀是边跑边迁。

---

### Q3. 前后端契约如何做到「改字段立刻炸」？

**答**：`shared/contracts` 里 zod schema 是单一事实来源：后端校验、前端 `z.infer` 静态类型、运行时兜底。Feed / TypeLab 共用 `PostListItem`。

**代码**：`shared/contracts/post.schema.ts`、`src/modules/type-lab/TypeLabPage.tsx`、`src/api/v2/feed.ts`

---

### Q4. 为什么用游标分页而不是 offset？

**答**：深分页 `OFFSET` 扫描成本线性升、插入导致漂移（漏/重）。复合游标 `${createdAt}|${id}` 编成不透明 token，前端只透传；后端可改排序字段、不暴露自增 id。

**代码**：`shared/contracts/common.ts`、`src/modules/feed/FeedPage.tsx`

---

## 二、TypeScript（类型系统当架构）

### Q5. 手写 DeepPartial / PickByType / MyAwaited，注意什么？

**答**：

- `DeepPartial`：递归 mapped type；函数 / 数组 / 原始类型不要乱展开。
- `PickByType`：`as` 键重映射，不匹配变 `never` 丢掉。
- `MyAwaited`：`infer` + 递归解嵌套 Promise。

**代码**：`src/modules/type-lab/typeChallenges.ts`  
**验证**：同文件 `Expect<Equal<A,B>>`，tsc 不过即错。演示 `/lab/types`。

---

### Q6. branded type 解决什么问题？运行时成本？

**答**：`UserId` / `PostId` 都是 string，结构相同语义不同；`Brand<T,B>` 用 `unique symbol` 做名义类型，编译期拦住混传。运行时零开销。

**代码**：`typeChallenges.ts` 中 `Brand` / `toUserId` / `toPostId`

---

### Q7. 泛型表格 `DataTable<T>` 如何让 columns 写错字段名编译失败？

**答**：`ColumnDef<T>` 的 `key: keyof T & string`，`rowKey: keyof T`。`render` 拿到整行 `T`。数据用 `readonly T[]` 保持元素推导、兼容只读源。

**代码**：`src/modules/type-lab/DataTable.tsx`

---

### Q8. `satisfies` vs `as const`？

**答**：`as const` 保留字面量但可能缺「这是合法配置」的检查；`satisfies Record<string, \`#${string}\`>` 既校验又不 widen。本仓库 `palette` 两者一起用。

---

## 三、渲染性能与并发

### Q9. memo 为什么经常「白包」？

**答**：缺任一前提都失效：① props 引用不稳（内联函数/对象）；② 上游每次 render 新建数组。`useCallback` / `useMemo` 本身有成本，子组件真因引用变化重渲才值得。

**代码**：`src/modules/perf/PerfPage.tsx`、`src/modules/perf/Rows.tsx`  
**演示**：`/lab/perf` 左栏朴素、右栏 memo。注意 StrictMode 双调用，看增长趋势。

**陷阱**：`Profiler.onRender` 里 `setState` 会死循环，耗时写 ref。

---

### Q10. children as prop 为何能避免子树重渲？

**答**：`ExpensivePanel` 的 element 在父组件创建；`Ticker` 每秒 setState 只是把**同一个 element 引用**放回去，React bailout，不执行子函数体。比 memo 更便宜，适合「外壳高频、内芯稳定」。

**代码**：`PerfPage.tsx` 中 `Ticker` / `ChildrenDemo`

---

### Q11. 输入框卡顿怎么用并发特性拆优先级？

**答**：输入是紧急更新，5000 条过滤是过渡。`setQuery` 同步；`startTransition(() => setPendingQuery)` 标低优先级。`isPending` 做半透明/「更新中」。

**代码**：`src/modules/patterns/ConcurrentDemo.tsx`  
**演示**：`/lab/patterns`

---

### Q12. 虚拟列表核心公式？不定高怎么办？

**答**：只渲染可视区 + buffer。

```
startIndex = floor(scrollTop / itemHeight) - buffer
endIndex   = startIndex + visibleCount + buffer * 2
占位高度   = items.length * itemHeight
item.top   = realIndex * itemHeight
```

不定高：预估高度 + 测量校正（或 `useVirtualizer`）。

**代码**：`src/modules/feed/VirtualList.tsx`

---

### Q13. IntersectionObserver 无限滚动会死锁吗？

**答**：IO 只在交叉**状态变化**时回调。短列表加载完哨兵仍在视口内则不再触发。加载结束后 `setTimeout(0)` 再检查哨兵是否仍可见，是则继续 `onLoadMore`。`onLoadMore` 用 ref，避免重建 Observer。无 IO 时降级 scroll。

**代码**：`src/modules/feed/useInfiniteScroll.ts`

---

### Q14. 搜索竞态怎么取消？

**答**：关键词 debounce（400ms）后请求；每次 `AbortController.abort()` 取消上一次。`CanceledError` 不当错误。列表重置 + `hasMore` 重置。

**代码**：`src/hacks/useDebounce.ts`、`src/modules/feed/FeedPage.tsx`

---

## 四、状态管理与组件模式

### Q15. 什么时候 Context + useReducer 够用，什么时候不够？

**答**：看板低频写（拖拽/提交才 dispatch），`dispatch` 引用稳定，reducer 纯函数可单测。Context 整树广播，**高频写（每秒 tick）不能塞 Context**——行情走 hook 局部 state + Query 失效。

**代码**：`src/modules/kanban/KanbanContext.tsx`、`tasksReducer.ts`  
**演示**：`/lab/kanban`

---

### Q16. 乐观更新如何回滚？

**答**：action 描述「发生了什么」；`move` 的逆操作还是 `move`（from/to 互换）。没有单独 rollback action。可逆是乐观更新的前提。

**代码**：`src/modules/kanban/tasksReducer.ts`

---

### Q17. 受控 vs 非受控？react-hook-form 站哪边？

**答**：受控值在 React，每击键重渲；非受控值在 DOM，ref 读取。大型表单、文件上传倾向非受控（RHF 默认非受控 + 注册）。即时校验/联动用受控。

**代码**：`src/modules/patterns/ControlledVsUncontrolled.tsx`

---

### Q18. Hooks 之后 HOC / Render Props 过时了吗？

**答**：逻辑复用首选 Hook。HOC 仍适合横切包装（loading、鉴权）；Render Props 适合「逻辑复用 + 渲染完全定制」。HOC 有 props 命名冲突；Render Props 在渲染期组合。

**代码**：`src/modules/patterns/withLoading.tsx`、`MouseTracker.tsx`、`PatternsPage.tsx`

---

### Q19. 状态提升 vs 派生值？

**答**：兄弟要同步，升到最近公共父。只存一个 source of truth（最后编辑的刻度），另一方换算，避免双份 state 不一致。代价：父重渲范围变大 → memo / 状态下放 / Context。

**代码**：`src/modules/patterns/TemperatureConverter.tsx`

---

### Q20. 根据 props/state 重置另一 state，要不要 useEffect？

**答**：官方建议 **render 期间**比较：`if (currentSymbol !== prevSymbol) { setPrevSymbol(...); setPickedPrice(undefined) }`。React 丢弃本次提交、立刻重渲，无多余 DOM。避免 effect 级联。

**代码**：`src/pages/trading/TradingPage.tsx`（切股票清空点价）

---

## 五、路由、错误隔离、认证

### Q21. 路由级分包怎么做？发版后旧 chunk 404 怎么办？

**答**：`lazy(() => import(...))` + 每页 `Suspense` + `ErrorBoundary`。`ChunkLoadError` / `Failed to fetch dynamically imported module` 捕获后 `location.reload()` 拉新哈希。事件回调、异步、SSR **Error Boundary 捕不到**。

**代码**：`src/router/index.tsx`、`src/components/ErrorBoundary.tsx`  
**追问**：为何必须 class？`getDerivedStateFromError` / `componentDidCatch` 目前无 Hook 等价（含 React 19）。

---

### Q22. 双 Token 刷新队列如何避免死锁与惊群？

**答**：

1. 请求拦截器挂 `Authorization`。
2. 业务 `code !== 0` 当失败。
3. 401：无 refresh → 登出；正在刷新 → 挂 `pendingRequests`；否则单飞刷新，成功后 drain 队列重放。
4. **刷新请求自己 401** 必须直接 reject（`_isRefreshRequest`），否则把自己挂进永远不 resolve 的队列 → 全站 pending。
5. `_retry` 防死循环。

**代码**：`src/api/request.ts`、`src/api/auth.ts`、`src/store/auth.ts`  
**测试**：`src/api/request.test.ts`

---

### Q23. Token 放 localStorage 的风险与降级？

**答**：XSS 可偷 token（相对 HttpOnly Cookie 更弱）。本仓库：隐私模式/配额满时吞异常，认证退化为内存态；`JSON.parse` 损坏当未登录。路由守卫 `ProtectedRoute` 带 `location.state.from` 登录回跳；`GuestRoute` 防已登录进登录页。

**代码**：`src/store/auth.ts`、`src/components/ProtectedRoute.tsx`

---

## 六、实时系统（交易页）

### Q24. WS 客户端要解决哪几件事？

**答**：JWT query 鉴权；切 symbol 退订/订阅；指数退避重连 `[1,2,3,5]s` 后自动重订阅；25s 应用心跳；`onNotify` 用 ref，避免回调变导致重连。卸载 `closedByUser` 禁止重连。

**代码**：`src/hooks/useMarketSocket.ts`

---

### Q25. 成交后如何即时刷新，而不是轮询？

**答**：WS 私有通知 `order_status` / `trade` → `queryClient.invalidateQueries(['trading', ...])`。Query 重拉账户/委托/成交/持仓。轮询可作兜底，空载少、延迟毫秒级。

**代码**：`src/pages/trading/TradingPage.tsx` `handleNotify`

---

### Q26. 行情为何 Pub/Sub、订单为何 Stream？（架构协同）

**答**：行情丢一两 tick 无妨、要低延迟 → Pub/Sub；订单/成交不能丢 → Stream + 消费者组 + pending 续消费。资金真相源只在 MySQL。前端不直连 Python。

**文档**：`docs/tech-notes.md`、`docs/trading-system.md`

---

## 七、安全（前端视角）

### Q27. React 默认防 XSS 的边界？富文本怎么办？

**答**：JSX 插值当文本转义。`dangerouslySetInnerHTML` 是洞。富文本 DOMPurify 白名单；URL 禁 `javascript:`。

**代码**：`src/modules/security/SecurityPage.tsx`  
**演示**：`/lab/security`（危险侧 vs 安全侧对照）

---

### Q28. CSRF：Cookie 会话 vs Bearer Token？

**答**：恶意站带用户 Cookie 伪造 POST。防御：自定义头（跨域简单请求带不了自定义头）、SameSite、CSRF Token。本演示：无 `X-CSRF-Token` 的安全接口 403；unsafe 接口可被伪造。SPA + Bearer（不自动带 Cookie）天然弱化经典 CSRF，但仍要管 CORS 与 XSS（XSS 可偷 token）。

---

## 八、可观测性与工程化

### Q29. Web Vitals 采什么、何时上报？

**答**：LCP / INP / CLS（+ FCP / TTFB）。`PerformanceObserver` + `buffered`。页面 `visibilitychange === hidden` 时 `sendBeacon`，关页不丢、不堵主线程。阈值：LCP 2.5s/4s，INP 200/500，CLS 0.1/0.25。

**代码**：`src/modules/metrics/useWebVitals.ts`  
**演示**：`/lab/metrics`

---

### Q30. 手写 Hook 面试常考哪些坑？

| Hook | 考点 | 文件 |
|---|---|---|
| `useDebounce` | cleanup 清 timer = 防抖本质；`ReturnType<typeof setTimeout>` | `src/hacks/useDebounce.ts` |
| `useLocalStorage` | lazy init、parse 容错、`storage` 跨标签、配额降级 | `src/hacks/useLocalStorage.ts` |
| `useThrottle` / `useInterval` | 闭包陈旧值 vs ref | `src/hacks/` |
| `useFetch` | abort、竞态 | `src/hacks/useFetch.ts` |

**演示**：`/lab/hooks`  
**测试**：`src/hacks/hooks.test.ts`

---

## 九、后端协同（架构师仍要答）

### Q31. cache-aside 三件套？

**答**：穿透 → 空值短 TTL；雪崩 → TTL jitter；击穿 → 逻辑过期 / 单飞刷新。本仓库内存 Map 演示算法，生产换 Redis。

**代码**：`server/ts/lib/cache.ts`

---

### Q32. 为何令牌桶而不是固定窗口计数器？

**答**：计数器有临界突刺。令牌桶允许突发、限制长期速率。惰性按时间差补令牌，不用定时器。多实例必须 Redis + Lua。

**代码**：`server/ts/lib/rateLimit.ts`

---

## 十、现场 5 分钟口述稿

1. **切状态**：Query 管服务器，Zustand 管会话，WS 局部 state，Context 只给低频看板。  
2. **切失败**：每页 ErrorBoundary；chunk 失败刷新；401 刷新队列单飞；refresh 自身 401 直接登出。  
3. **切契约**：zod 共享 schema，改字段 tsc 红。  
4. **切性能**：分包、memo 前提、children bailout、transition、虚拟列表 + IO 哨兵补触发。  
5. **切实时**：WS 鉴权/心跳/退避；通知只 invalidate，不手写同步缓存。  
6. **切安全**：默认转义 vs innerHTML；CSRF 自定义头；token 存储与 XSS 一并讲。

打开 `/lab/arch` 按图讲完，再按对方方向进 `/lab/perf` 或 `/trading`。

---

## 文件速查

| 主题 | 路径 |
|---|---|
| 架构图数据 | `src/modules/arch/archData.ts` |
| 路由分包 + 守卫 | `src/router/index.tsx` |
| ErrorBoundary | `src/components/ErrorBoundary.tsx` |
| 双 Token | `src/api/request.ts` |
| Zustand | `src/store/auth.ts` |
| TS 题库 | `src/modules/type-lab/typeChallenges.ts` |
| 泛型表 | `src/modules/type-lab/DataTable.tsx` |
| 性能对照 | `src/modules/perf/PerfPage.tsx` |
| 并发 | `src/modules/patterns/ConcurrentDemo.tsx` |
| 虚拟列表 / 无限滚 | `src/modules/feed/` |
| 看板 reducer | `src/modules/kanban/` |
| WS | `src/hooks/useMarketSocket.ts` |
| 交易页失效 | `src/pages/trading/TradingPage.tsx` |
| XSS/CSRF | `src/modules/security/SecurityPage.tsx` |
| Web Vitals | `src/modules/metrics/useWebVitals.ts` |
| zod 契约 | `shared/contracts/` |
| 缓存 / 限流 | `server/ts/lib/cache.ts` `rateLimit.ts` |
