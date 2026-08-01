import { InterviewQuestion } from './types'

// 实时通信方向：WebSocket 服务端/客户端、心跳、重连、鉴权
export const realtimeQuestions: InterviewQuestion[] = [
  {
    id: 'realtime-ws-heartbeat',
    category: '实时通信',
    difficulty: 'expert',
    title: 'WebSocket 服务端如何检测半开连接？ping/pong 心跳为什么用协议帧？',
    summary:
      'TCP 不会主动告知对端断网，服务端用 isAlive 标志 + 定时 ping 探活：每轮先置 false 再发协议级 ping，下轮仍 false 说明对端已死，terminate 清理。',
    answer: `## 半开连接问题
客户端断网/拔网线时，TCP 四次挥手不会发生，服务端的 socket 仍认为连接存活（半开连接）。如果不清理：
- 连接对象常驻内存，fd 泄漏最终撑爆连接数
- 后续向死连接 publish 消息持续失败
- 订阅表里残留死连接，行情推送浪费资源

## 心跳探活方案
1. 连接建立时 \`ws.isAlive = true\`
2. 定时器每 30s 遍历所有 client：
   - 若 \`isAlive === false\`（上轮 ping 后没收到 pong）→ \`ws.terminate()\` 强制清理
   - 否则置 \`isAlive = false\` 并发 \`ws.ping()\`
3. 收到 pong 回调时重置 \`isAlive = true\`

## 为什么用协议级 ping/pong 而非应用层
- **协议帧**：WebSocket 协议内置的 ping/pong 控制帧（opcode 0x9/0xA），浏览器自动回 pong，无需业务代码处理
- **应用层 ping**：要前端主动监听并回消息，增加业务耦合，且前端漏处理就失效
- 协议帧对应用层透明，更可靠

## 两个心跳的分工
- **服务端协议级 ping（30s）**：检测半开连接，清理死连接
- **客户端应用层 ping（25s）**：保持连接活跃，防止中间代理（nginx）因空闲超时断连`,
    code: `// 服务端协议级心跳：清理半开连接
const HEARTBEAT_INTERVAL = 30000

wss.on('connection', (ws, req) => {
  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })  // 收到 pong 重置
})

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate()  // 上轮没回 pong，清理
    ws.isAlive = false                               // 先置 false
    ws.ping()                                        // 再发 ping
  })
}, HEARTBEAT_INTERVAL)`,
    links: [
      { title: 'WebSocket 心跳机制详解 - 掘金', url: 'https://juejin.cn/post/6844904199708950536', site: '掘金' },
      { title: 'ws 库心跳与半开连接 - CSDN', url: 'https://blog.csdn.net/qq_37232329/article/details/120358235', site: 'CSDN' },
    ],
  },
  {
    id: 'realtime-ws-reconnect',
    category: '实时通信',
    difficulty: 'expert',
    title: 'WebSocket 断线如何自动重连？指数退避 + 自动重订阅怎么实现？',
    summary:
      'onclose 触发重连，延迟数组 [1,2,3,5]s 指数退避封顶；closedByUser 标志区分主动卸载与异常断开；重连成功后用 symbolRef 自动重订阅，避免漏行情。',
    answer: `## 重连的核心难点
1. **区分主动关闭 vs 异常断开**：组件卸载时主动 close 不应重连，网络抖动才重连
2. **退避策略**：立即重连会雪崩，固定间隔太死板，用递增延迟封顶
3. **状态恢复**：重连后要重新订阅之前的 symbol，否则漏行情
4. **回调稳定性**：onNotify 回调变化不应触发重连 effect

## 本项目实现
### 1. closedByUser 标志
\`connect()\` 闭包内维护 \`closedByUser\`，组件卸载的 cleanup 置 true，onclose 检查它决定是否重连。

### 2. 指数退避
\`RECONNECT_DELAYS = [1000, 2000, 3000, 5000]\`，第 N 次重连取 \`delays[min(N, len-1)]\`，封顶 5s。重连成功 \`reconnectAttempt = 0\` 重置。

### 3. 自动重订阅
symbol 存在 \`symbolRef\`（不进依赖），onopen 时读 ref 重新 subscribe。这样 effect 只跑一次建连，但 symbol 切换通过另一个 effect 处理退订/订阅。

### 4. notifyRef 防抖
\`onNotify\` 存 ref，effect 依赖只放 \`[]\`，避免父组件重渲染导致 onNotify 引用变化触发重连。

## 为什么不用 readyState 轮询
轮询检测连接状态有延迟且浪费 CPU。事件驱动（onclose/onopen）更实时高效。`,
    code: `const RECONNECT_DELAYS = [1000, 2000, 3000, 5000]

useEffect(() => {
  let closedByUser = false
  const reconnectAttempt = useRef(0)

  const connect = () => {
    const ws = new WebSocket(\`/ws?token=\${token}\`)
    ws.onopen = () => {
      reconnectAttempt.current = 0                 // 重置退避
      const sym = symbolRef.current
      if (sym) ws.send(JSON.stringify({ type: 'subscribe', symbol: sym }))  // 自动重订阅
    }
    ws.onclose = () => {
      if (closedByUser) return                     // 主动卸载，不重连
      const delay = RECONNECT_DELAYS[
        Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)
      ]
      reconnectAttempt.current += 1
      setTimeout(connect, delay)                   // 退避重连
    }
  }
  connect()

  return () => {
    closedByUser = true                            // 标记主动关闭
    wsRef.current?.close()
  }
}, [])`,
    links: [
      { title: 'WebSocket 断线重连方案 - 掘金', url: 'https://juejin.cn/post/6844904199708950536', site: '掘金' },
      { title: '指数退避重试算法 - 知乎', url: 'https://zhuanlan.zhihu.com/p/40242267', site: '知乎' },
    ],
  },
  {
    id: 'realtime-ws-auth',
    category: '实时通信',
    difficulty: 'hard',
    title: '浏览器 WebSocket 无法设置 Header，JWT 鉴权怎么做？',
    summary:
      '浏览器原生 WebSocket API 不支持自定义 Header，三种方案：query string 带 token（本项目）、Sec-WebSocket-Protocol 子协议、首次消息握手。各有取舍。',
    answer: `## 问题：WebSocket 不能设 Header
浏览器原生 \`new WebSocket(url)\` 只能传 url 和子协议，无法设置 \`Authorization\` 头。HTTP 接口的 Bearer Token 模式直接套不上。

## 三种鉴权方案

### 1. Query String 带 token（本项目）
\`new WebSocket('/ws?token=' + jwt)\`
- ✅ 实现最简单，服务端从 url 解析
- ⚠️ token 进 url，可能被 nginx access log / 浏览器历史记录留存
- ⚠️ 需 HTTPS 防中间人窃取

### 2. Sec-WebSocket-Protocol 子协议
\`new WebSocket(url, ['bearer.' + jwt])\`
- token 放握手阶段的子协议头
- ✅ 不进 url，相对干净
- ⚠️ 占用 protocol 字段，语义不规范

### 3. 首次消息握手
连接先建立，客户端发首条消息带 token，服务端验证后才升级为已认证
- ✅ 最灵活，可带复杂认证信息
- ⚠️ 连接建立到认证完成有窗口，需在认证前禁止业务消息

## 本项目选型
query string：实现简单，配合 HTTPS 足够安全。服务端 \`verifyAccessToken\` 失败立即 \`ws.close(4001)\`，未认证连接不进 hub。

## Refresh 场景
Access Token 过期时，WS 连接已建立不受影响（鉴权只在握手时做一次）。如需续期，前端刷新 token 后重连一次。`,
    code: `// 浏览器端：token 放 query string
const token = getAccessToken()
const ws = new WebSocket(\`/ws?token=\${encodeURIComponent(token)}\`)

// 服务端：从 url 解析 token 鉴权
wss.on('connection', (ws, req) => {
  const { query } = url.parse(req.url, true)
  const token = query.token
  try {
    const decoded = verifyAccessToken(token)   // 验证 JWT
    userId = decoded.sub
  } catch (e) {
    ws.close(4001, '认证失败')                  // 鉴权失败立即关闭
    return
  }
  hub.add(ws, userId)
})`,
    links: [
      { title: 'WebSocket 鉴权方案对比 - 掘金', url: 'https://juejin.cn/post/6844904199708950536', site: '掘金' },
      { title: 'WebSocket 协议握手 - CSDN', url: 'https://blog.csdn.net/qq_37232329/article/details/120358235', site: 'CSDN' },
    ],
  },
  {
    id: 'realtime-ws-vs-sse',
    category: '实时通信',
    difficulty: 'hard',
    title: 'WebSocket、SSE、轮询如何选型？交易系统为什么用 WebSocket？',
    summary:
      '轮询最简单但延迟高浪费请求；SSE 单向服务端推送适合行情；WebSocket 全双工适合需要客户端双向交互（订阅/撤单通知）的场景。本项目混用 WS。',
    answer: `## 三种实时方案对比
| | 轮询 | SSE | WebSocket |
|---|---|---|---|
| 方向 | 客户端→服务端 | 服务端→客户端（单向） | 全双工 |
| 协议 | HTTP | HTTP | 独立协议（基于 HTTP 升级） |
| 连接 | 短连接重复建 | 长连接 | 长连接 |
| 延迟 | 高（N 秒间隔） | 低 | 极低 |
| 复杂度 | 最低 | 低 | 中 |
| 适用 | 兼容性兜底 | 推送通知 | 双向实时交互 |

## 本项目为什么选 WebSocket
交易页面同时需要：
1. **服务端→客户端**：行情 tick、K 线、五档盘口、成交通知推送
2. **客户端→服务端**：subscribe/unsubscribe 切换股票、心跳

SSE 只能单向，切标的要额外发 HTTP 请求；WebSocket 全双工，一条连接搞定双向，延迟最低。

## 为什么不用纯轮询
- **延迟**：行情毫秒级变化，轮询 1s 间隔丢失大量 tick
- **浪费**：无行情时仍空轮询，浪费带宽和服务端请求
- **实时通知**：成交通知必须即时，轮询有 N 秒延迟体验差

## 仍保留 HTTP 的场景
- 下单/撤单：需要请求-响应语义 + 事务保证，用 HTTP POST 更合适
- 历史数据拉取：一次性查询用 HTTP，不用 WS
WS 只承担实时推送，命令式操作走 HTTP，各取所长。`,
    code: `// 轮询：简单但低效
setInterval(() => {
  fetch('/api/tick?symbol=600519').then(r => r.json())
}, 1000)  // 1s 延迟，且无行情也请求

// SSE：单向推送
const es = new EventSource('/api/tick/stream?symbol=600519')
es.onmessage = (e) => setTick(JSON.parse(e.data))
// 切标的要重建连接或额外 HTTP

// WebSocket：全双工（本项目）
const ws = new WebSocket('/ws?token=' + token)
ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', symbol: '600519' }))
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.type === 'tick') setTick(msg.data)
}
// 切标的：同一条连接发 unsubscribe + subscribe`,
    links: [
      { title: 'WebSocket vs SSE vs 轮询 - 掘金', url: 'https://juejin.cn/post/6844904199708950536', site: '掘金' },
      { title: '实时通信方案选型 - 知乎', url: 'https://zhuanlan.zhihu.com/p/40242267', site: '知乎' },
    ],
  },
]
