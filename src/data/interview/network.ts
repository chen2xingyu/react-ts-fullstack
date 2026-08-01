import { InterviewQuestion } from './types'

export const networkQuestions: InterviewQuestion[] = [
  {
    id: 'tcp-handshake',
    category: '网络与协议',
    difficulty: 'hard',
    title: 'TCP 三次握手为什么不是两次或四次？TIME_WAIT 状态的作用是什么？',
    summary:
      '三次握手是为了确认双方收发能力正常，防止已失效的连接请求报文段突然又传送到了服务端。TIME_WAIT 确保最后一个 ACK 能到达对方。',
    answer: `## 三次握手过程
1. 客户端 → 服务端：SYN=1, seq=x（客户端请求建立连接）
2. 服务端 → 客户端：SYN=1, ACK=1, seq=y, ack=x+1（服务端确认并请求建立连接）
3. 客户端 → 服务端：ACK=1, ack=y+1（客户端确认）

## 为什么不是两次？
防止已失效的连接请求报文段突然又传送到了服务端。如果只有两次握手：
- 客户端第一个请求因网络延迟未到达
- 客户端重发第二个请求，与服务端建立连接
- 第一个请求到达后，服务端误认为新请求，再次建立连接
- 结果：服务端分配了两个连接资源

## 为什么不是四次？
三次已经足够确认双方的收发能力：
1. 服务端确认客户端发送能力正常
2. 客户端确认服务端发送和接收能力正常
3. 服务端确认客户端接收能力正常

## TIME_WAIT 的作用
主动关闭方会进入 TIME_WAIT 状态，持续 2MSL：
1. 确保最后一个 ACK 能到达对方
2. 防止历史连接的干扰
3. 保证新连接的报文不被误认为历史报文`,
    code: `// TCP 三次握手
// 客户端                服务端
//   │─── SYN ──────────→│  ① seq=x
//   │←─ SYN+ACK ───────│  ② seq=y, ack=x+1
//   │─── ACK ──────────→│  ③ ack=y+1
//   │     连接建立       │

// 四次挥手
// 客户端                服务端
//   │─── FIN ──────────→│  ① 客户端请求关闭
//   │←─ ACK ───────────│  ② 服务端确认
//   │     (数据传输)     │
//   │←─ FIN ───────────│  ③ 服务端请求关闭
//   │─── ACK ──────────→│  ④ 客户端确认
//   │  TIME_WAIT (2MSL) │  确保最后 ACK 到达
//   │     CLOSED        │`,
    links: [
      { title: 'TCP 三次握手四次挥手详解 - 掘金', url: 'https://juejin.cn/post/7128724785917976618', site: '掘金' },
      { title: 'TCP 三次握手为什么不是两次 - 知乎', url: 'https://www.zhihu.com/question/24855123', site: '知乎' },
    ],
  },
  {
    id: 'http2',
    category: '网络与协议',
    difficulty: 'hard',
    title: 'HTTP/2 的核心特性有哪些？多路复用、头部压缩、服务器推送是怎么实现的？',
    summary:
      'HTTP/2 基于二进制分帧层，支持多路复用、HPACK 头部压缩、服务器推送、流优先级。多路复用解决了 HTTP/1.1 的队头阻塞问题。',
    answer: `## HTTP/1.1 的问题
1. 队头阻塞：每个请求需要独占一个 TCP 连接
2. 头部冗余：每个请求都要携带完整的 Header
3. TCP 连接数限制：浏览器对同一域名最多 6-8 个连接

## HTTP/2 核心特性
### 1. 二进制分帧层
将消息分割为更小的帧，类型：DATA、HEADERS、SETTINGS、PUSH_PROMISE 等

### 2. 多路复用
一个 TCP 连接上可以同时发送多个流，流之间相互不影响

### 3. HPACK 头部压缩
- 静态字典：常用头部预编码
- 动态字典：会话中累积的头部表
- 哈夫曼编码：对字符串值进一步压缩

### 4. 服务器推送
服务器主动向客户端推送资源，使用 PUSH_PROMISE 帧

### 5. 流优先级
每个流可设置权重和依赖关系

## HTTP/3 改进
基于 QUIC（UDP），解决 TCP 传输层队头阻塞，连接迁移，更快连接建立（1-RTT）`,
    code: `// HTTP/2 帧结构
// ┌─────────────────────────────────────────┐
// │ Length(24) │ Type(8) │ Flags(8)         │
// ├────────────┴─────────┴──────────────────┤
// │R│        Stream Identifier (31)         │
// ├─┴────────────────────────────────────────┤
// │           Frame Payload                  │
// └─────────────────────────────────────────┘

// 多路复用示例 - 一个 TCP 连接上并行多个请求
// Stream 1: index.html → HTML
// Stream 3: style.css  → CSS
// Stream 5: app.js     → JS
// Stream 7: logo.png   → Image`,
    links: [
      { title: 'HTTP/2 原理深入剖析 - 掘金', url: 'https://juejin.cn/post/5636403249788254734', site: '掘金' },
      { title: 'HTTP/2 与 HTTP/3 对比 - 知乎', url: 'https://zhuanlan.zhihu.com/p/47673856', site: '知乎' },
      { title: 'HTTP/2 协议详解 - CSDN', url: 'https://blog.csdn.net/qq_34827009/article/details/118090919', site: 'CSDN' },
    ],
  },
  {
    id: 'web-cache',
    category: '网络与协议',
    difficulty: 'hard',
    title: '浏览器缓存机制有哪些？强缓存和协商缓存的区别是什么？',
    summary:
      '浏览器缓存分为强缓存（Cache-Control/Expires）和协商缓存（ETag/Last-Modified）。强缓存不发请求，协商缓存发送条件请求由服务器判断。',
    answer: `## 缓存层级
1. Memory Cache：内存缓存，关闭标签页失效
2. Disk Cache：磁盘缓存，按规则存储
3. Service Worker Cache：独立缓存，可编程控制
4. Push Cache：HTTP/2 推送缓存

## 强缓存（不与服务器通信）
**Cache-Control**（HTTP/1.1）：
- max-age：缓存有效期（秒）
- s-maxage：CDN 缓存有效期
- no-cache：每次都要验证
- no-store：不缓存

**Expires**（HTTP/1.0，优先级低）：绝对时间

## 协商缓存（发送条件请求）
**ETag/If-None-Match**（优先级高）：
- 服务器返回 ETag: "abc123"
- 客户端带 If-None-Match: "abc123"
- 服务器比对 ETag，相同返回 304

**Last-Modified/If-Modified-Since**：
- 服务器返回 Last-Modified 时间
- 客户端带 If-Modified-Since 时间
- 服务器比对修改时间，未变返回 304

## 缓存流程
请求 → 检查强缓存 → 命中直接使用 → 未命中 → 协商缓存 → 304 使用缓存 / 200 使用新资源`,
    code: `// Nginx 缓存配置
server {
  // 强缓存 CSS/JS 1年
  location ~* \\.(css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  // 协商缓存 HTML
  location / {
    add_header Cache-Control "no-cache, must-revalidate";
    etag on;
  }
}

// HTTP 响应头示例
// Cache-Control: max-age=31536000, immutable
// ETag: "abc123"
// Last-Modified: Fri, 01 Jan 2025 00:00:00 GMT`,
    links: [
      { title: '浏览器缓存机制深度解析 - 掘金', url: 'https://juejin.cn/post/1037946461682766899', site: '掘金' },
      { title: '浏览器缓存详解 - 知乎', url: 'https://zhuanlan.zhihu.com/p/39449872', site: '知乎' },
    ],
  },
]
