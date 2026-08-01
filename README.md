# React + TypeScript 全栈工程

一套覆盖 **React 前端 + Node.js 后端 + MySQL** 的全栈解决方案，核心亮点是内置一个**准生产级证券交易系统**：Python 异步撮合引擎 + Redis 消息中间件 + 实时行情 WebSocket 推送 + 风控 + 容灾重建。

> 📅 2026.07 - 至今 · 👤 独立开发 · 🔧 全栈工程师

---

## ✨ 项目亮点

- **准生产级交易系统**：行情生成 → Redis Pub/Sub → WebSocket 实时 K 线/五档；下单 → 风控冻结 → Stream 投递 → Python 撮合 → 事务结算，全链路闭环
- **三语言协作**：React/TS（前端）+ Node.js（网关与真相源）+ Python asyncio（行情与撮合），通过 Redis 解耦
- **资金/持仓守恒**：MySQL 是唯一真相源，带条件 UPDATE 原子冻结防并发超卖，成交回报事务落库
- **撮合引擎容灾**：Redis 维护活跃限价单快照，Python 崩溃重启后从快照重建订单簿，挂单不丢
- **12 类风控全留痕**：涨跌停/手数/资金/持仓/重复提交/撤单状态等拒绝均写入 `risk_logs`，可查可审计
- **TypeScript 100% 覆盖**：前后端共享 `ApiResponse<T>` 泛型契约，编译期拦截类型错误
- **真实行情可接入**：默认几何布朗运动模拟，`MARKET_SOURCE=real` 一键切新浪真实 A 股行情（交易时段实时价 + 非交易时段以真实收盘价 GBM 降级）

---

## 🏗️ 技术架构

```
浏览器(React)  ──REST(下单/查询)──►  Node.js(Express:3000)  ──Stream──►  Redis  ──►  Python(asyncio)
               ◄─WebSocket(行情/成交)─  ◄─Pub/Sub(行情)──────────────────◄──────────────
                                        ◄─Stream(成交回报/状态)──────────◄──────────────
                                                  │
                                                  ▼
                              MySQL（资金/持仓/委托/成交 唯一真相源）
```

**两条核心数据流**：

| 流 | 链路 |
|---|---|
| 行情流 | Python 几何布朗运动生成 tick → Redis Pub/Sub → Node WS 转发 → 前端 K 线/五档 |
| 交易流 | 前端下单 → Node 风控+冻结+落库 → Redis Stream 投递 → Python 撮合 → Stream 回报 → Node 事务结算 → WS 推送 |

**技术分工**：

| 层 | 职责 |
|---|---|
| **Python** | 行情生成（随机游走+均值回归）、1m K 线聚合、订单簿、撮合（价格优先+时间优先）、五档快照 |
| **Node.js** | REST API、WS 网关（JWT 鉴权+订阅路由）、前置风控、资金/持仓冻结与结算、成交回报事务落库 |
| **Redis** | 订单/成交 Stream（可靠不丢）、行情 Pub/Sub、行情 Hash 缓存、活跃订单快照、消费者组 |
| **前端** | K 线图（lightweight-charts）、五档盘口、下单面板、委托/持仓/成交/资金表、风控日志、WS 客户端 |

---

## 🛠️ 技术栈

### 前端
React 18 · TypeScript 5.5 · Vite 5 · React Router 6 · Zustand · TanStack Query · Axios · Tailwind CSS · lightweight-charts

### 后端
Node.js · Express 4 · MySQL2（连接池+预处理）· Redis（ioredis）· WebSocket（ws）· JWT · Joi · Morgan

### 交易引擎（Python）
Python 3.12 · asyncio · redis.asyncio · SortedDict 订单簿 · 几何布朗运动行情模型

### 数据库
MySQL（8 张交易表 + 用户表）· Redis 5（Stream + Pub/Sub + Hash + Set）

---

## 📂 目录结构

```
reactTs/
├── src/                          # 前端
│   ├── api/                      # 请求封装（trading.ts 交易 API）
│   ├── types/trading.ts          # 交易类型定义
│   ├── hooks/
│   │   ├── useTrading.ts         # react-query 数据获取
│   │   └── useMarketSocket.ts    # WS 连接+订阅+重连
│   ├── components/trading/
│   │   ├── KLineChart.tsx        # K 线图
│   │   ├── DepthBook.tsx         # 五档盘口（点价填单）
│   │   ├── OrderForm.tsx         # 下单面板
│   │   ├── OrderList.tsx         # 委托列表（可撤单）
│   │   ├── TradeList.tsx         # 成交列表
│   │   └── RiskLogList.tsx       # 风控日志
│   └── pages/trading/TradingPage.tsx
│
├── server/                       # Node.js 后端
│   ├── config/{db,redis,trading}.js
│   ├── routes/tradingRoutes.js
│   ├── controllers/{trading,quote}Controller.js
│   ├── models/                   # stock/account/order/trade/position/riskLog Model
│   ├── services/
│   │   ├── orderService.js       # 风控+冻结+落单+投递（rejectRisk 统一留痕）
│   │   ├── tradeConsumer.js      # 成交回报事务结算
│   │   └── activeOrderSnapshot.js# 活跃订单快照（容灾）
│   ├── ws/                       # WebSocket 网关
│   └── scripts/                  # 建表+种子+端到端验证脚本
│
├── trading-engine/               # Python 交易引擎
│   ├── main.py                   # asyncio.gather(行情, 撮合, 撤单) + 启动重建簿
│   ├── engine/
│   │   ├── market_generator.py   # 多股票随机游走+均值回归
│   │   ├── order_book.py         # 买卖盘（价格优先+时间优先）
│   │   └── matching_engine.py    # 撮合 + rebuild_from_active 容灾
│   └── transport/                # redis 客户端/消费者/生产者
│
└── docs/                         # 项目文档
    ├── trading-system.md         # 交易系统技术详档
    └── interview-notes.md        # 面试知识点
```

---

## 🚀 快速启动

### 环境准备

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | 18+ | 前端 + 后端 |
| MySQL | 8 | 用户表 + 8 张交易表 |
| Redis | 5+ | 行情 Pub/Sub + 订单/成交 Stream + 活跃订单快照 |
| Python | 3.12+ | 交易引擎（行情生成 + 撮合） |

- Python 安装时勾选 **"Add python.exe to PATH"**
- Redis（Windows）从 [tporadowski/redis releases](https://github.com/tporadowski/redis/releases) 下载 MSI 装为服务，验证：`redis-cli ping` → `PONG`
- MySQL 验证：`mysql -u root -p` 能登录

### 启动顺序

依赖关系：**MySQL/Redis 服务 → 后端 → Python 引擎 → 前端**。Python 启动时从 Redis 读取后端加载的股票元数据，故必须**后端先启动**。

### 1. 后端（:3000）

```bash
cd server
npm install
cp .env.example .env            # 编辑 .env，填入 DB_PASSWORD（MySQL 密码）
npm run init:db                  # 建用户表 + 种子用户（test@example.com/test123）
node scripts/init-trading-db.js  # 建 8 张交易表 + 股票种子 + 每人 100 万资金
npm run dev                      # 启动 :3000（nodemon 热重载）
```

启动成功标志：控制台打印 `✅ Redis 连接成功`、`✅ MySQL 连接成功`、`8 只股票已缓存`。

### 2. 交易引擎（Python）

```bash
cd trading-engine
pip install -r requirements.txt
cp .env.example .env            # 可选：默认连 localhost:6379，无需修改即可跑

# 模拟行情（默认，几何布朗运动，随时可跑）
python main.py
```

切换**真实 A 股行情**（交易时段拉新浪实时价，非交易时段以真实收盘价 GBM 降级）：

```bash
# Windows PowerShell
$env:MARKET_SOURCE='real'; python main.py
# Linux / macOS
MARKET_SOURCE=real python main.py
```

启动成功标志：打印 `[generator] 加载 N 只股票`、`[matcher] 阶段 6 容灾：从快照重建...`，行情开始推送。

> ⚠️ 真实行情模式需联网访问新浪接口；若网络不通会自动降级 GBM，不影响运行。

### 3. 前端（:5173）

```bash
# 回到项目根目录
npm install
npm run dev                      # 启动 :5173
```

### 4. 访问

打开 http://localhost:5173 ，用种子账号登录：

| 邮箱 | 密码 |
|---|---|
| test@example.com | test123 |

登录后进入交易页 http://localhost:5173/trading ，即可看到实时滚动 K 线、五档盘口，下单/撤单/成交/风控日志全链路联动。其它页面：`/users`（用户 CRUD 演示）、`/project`（项目经历展示）。

---

## 📊 交易系统分阶段交付

| 阶段 | 内容 | 验证 |
|---|---|---|
| 0 环境就绪 | Python/Redis 接入，骨架目录 | Node 打印"Redis 连接成功" |
| 1 数据基座 | 8 张表+种子，资金条+股票选择器 | `GET /api/trading/account` 返回 100 万 |
| 2 行情闭环 | Python 行情→Redis→WS→前端 K 线+五档 | 登录后 K 线实时滚动 |
| 3 下单+风控 | orderService（风控+冻结），OrderForm+OrderList | 下单资金正确冻结，涨跌停被拒 |
| 4 撮合+结算 | Python 撮合，tradeConsumer 事务落库，TradeList | 买卖后持仓/资金/成本正确 |
| 5 撤单+五档联动 | 撤单链路，五档点价填单 | 撤单冻结返还，点五档填单 |
| 6 风控完善+容灾 | risk_logs 全留痕，撮合重启重建簿 | 杀 Python 重启，挂单继续有效 |

---

## 🔑 核心设计要点

1. **Python 绝不直写 MySQL**，只通过 Redis 通信；资金/持仓真相源唯一在 MySQL，由 Node 事务持久化
2. **Redis Stream + 消费者组**：订单/成交可靠投递不丢，崩溃重启可从 pending 续消费
3. **带条件 UPDATE 防并发超卖**：`WHERE cash_available >= ?` 原子校验，affectedRows=0 即回滚
4. **撮合引擎容灾**：限价单写活跃快照（SET+HASH），重启 `rebuild_from_active` 重建簿
5. **Redis 5 兼容**：用 `XPENDING+XCLAIM` 替代 `XAUTOCLAIM` 回收崩溃消费者的 pending 消息
6. **风控统一出口**：`rejectRisk` 函数集中"记日志+抛错"，12 类拒绝全部留痕 `risk_logs`

详细技术解析见 [docs/trading-system.md](docs/trading-system.md)，面试知识点见 [docs/interview-notes.md](docs/interview-notes.md)。

---

## 🧪 端到端验证

每个阶段配套验证脚本，确保数据一致性与链路完整：

```bash
cd server
node scripts/verify-matching.js        # 撮合引擎 + 成交结算
node scripts/verify-cancel.js          # 撤单链路 + 资金守恒
node scripts/verify-rebuild.js         # 订单簿重建容灾
node scripts/verify-risk-logs.js       # 风控日志全留痕（service 层）
node scripts/verify-risk-logs-http.js  # 风控日志 HTTP 全链路
```

---

## 🛠️ 故障排查

| 问题 | 解决 |
|---|---|
| `EADDRINUSE: address already in use :::3000/5173` | 端口被占用。Windows：`netstat -ano \| findstr :3000` 找 PID，`taskkill /PID <pid> /F` |
| `Access denied for user 'root'@'localhost'` | MySQL 认证失败。确认 `server/.env` 的 `DB_PASSWORD` 正确，且在 `server/` 目录运行脚本（才能加载 .env） |
| `redis-cli ping` 不返回 PONG | Redis 未启动。Windows 服务里启动 Redis，或运行 `redis-server` |
| Python `command not found` | 未加入 PATH。用 Python 全路径，或重装勾选 "Add python.exe to PATH" |
| 真实行情拉取失败 / 自动降级 GBM | 网络不通或被反爬。引擎自动降级模拟行情不影响运行；本项目用新浪接口（akshare 的东财接口易被反爬，故未采用） |
| `unknown command XAUTOCLAIM` | Redis 5 不支持 XAUTOCLAIM，本项目已用 `XPENDING+XCLAIM` 替代，无需处理 |
| `git push` 报 `Connection was reset` | GitHub 网络抖动。稍后重试 `git push origin dev` |
| Python 引擎启动显示"0 只股票" | 后端未先启动。Python 从 Redis 读后端加载的股票元数据，必须**先启动后端**再启动 Python |

---

## 📝 License

MIT
