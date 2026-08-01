# 准生产级证券交易系统 — 技术详档

> 在 React+TS+Node.js 全栈工程中新增的证券交易系统模块。采用「现有项目加 trading 模块」方案，引入 Python（撮合 + 行情）与 Redis（消息中间件 + 缓存）。

## 一、核心设计原则

**Python 绝不直写 MySQL，只通过 Redis 与外界通信；资金/持仓的真相源唯一在 MySQL，由 Node.js 负责持久化。**

这条原则划清了职责边界：
- Python 只管「算」（撮合、行情生成），无状态、可随时重启
- Node.js 只管「存」（事务落库、资金冻结），是数据权威
- Redis 是两者间的「信使」，Stream 保证可靠投递，Pub/Sub 广播行情

如此设计的好处：撮合引擎崩溃不影响资金安全，重启后能从快照恢复继续工作。

---

## 二、整体架构

```
浏览器(React)  ──REST(下单/查询)──►  Node.js(Express:3000)  ──Stream──►  Redis  ──►  Python(asyncio)
               ◄─WebSocket(行情/成交)─  ◄─Pub/Sub(行情)──────────────────◄──────────────
                                        ◄─Stream(成交回报/状态)──────────◄──────────────
                                                  │
                                                  ▼
                              MySQL（资金/持仓/委托/成交 唯一真相源）
```

### 两条数据流

**行情流（Python → 前端，单向广播）**

```
Python MarketGenerator
  └─ 每秒几何布朗运动 + 均值回归生成 tick
  └─ tick 聚合 1m K 线 + 五档深度
  └─ PUBLISH ch:market:tick/kline/depth:{symbol}
       └─ Node marketPublisher 订阅 ch:market:*
            └─ WebSocket 转发给订阅了该 symbol 的前端
                 └─ KLineChart 实时更新 / DepthBook 刷新
```

**交易流（前端 → Python → 前端，闭环）**

```
前端 OrderForm 提交
  └─ POST /api/trading/orders
       └─ Node orderService.placeOrder
            ├─ 风控校验（涨跌停/手数/资金/持仓/幂等）→ 拒绝则 rejectRisk 记 risk_logs
            ├─ MySQL 事务：带条件 UPDATE 冻结资金/持仓 + INSERT orders
            ├─ XADD stream:orders:new  ──────────────► Python OrderConsumer
            └─ 限价单写活跃快照（容灾用）
                                            Python 撮合
                                            ├─ OrderBook 匹配（价格优先+时间优先）
                                            └─ XADD stream:trades:done ─► Node tradeConsumer
                                                                          ├─ MySQL 事务：INSERT trades
                                                                          │   + UPDATE orders/positions/accounts
                                                                          └─ WS 推送成交 + invalidate 查询
```

---

## 三、Redis 通信设计

| 类型 | 通道 | 用途 |
|---|---|---|
| Stream | `stream:orders:new` | Node→Python 投递新订单（消费者组 `matchers`） |
| Stream | `stream:orders:cancel` | Node→Python 投递撤单指令（消费者组 `cancellers`） |
| Stream | `stream:trades:done` | Python→Node 产出成交（消费者组 `settlers`） |
| Stream | `stream:orders:status` | Python→Node 订单状态变化（撤单完成等） |
| Pub/Sub | `ch:market:tick:{sym}` | 行情 tick 广播 |
| Pub/Sub | `ch:market:kline:{sym}` | K 线广播 |
| Pub/Sub | `ch:market:depth:{sym}` | 五档深度广播 |
| Pub/Sub | `ch:user:{uid}:notify` | 成交/委托状态私有推送 |
| Hash | `quote:tick:{sym}` | 最新价快照（REST 兜底） |
| Hash | `trading:stocks` | 股票元数据（Python 启动读） |
| Set + Hash | `orders:active` / `orders:active:{id}` | 活跃限价单快照（容灾重建簿） |

### Stream vs Pub/Sub 的选择

- **Stream**：用于交易流（订单/成交/状态）。需要「可靠投递不丢 + 消费者组 + ACK + pending 续消费」，崩溃重启可补偿。
- **Pub/Sub**：用于行情广播。行情是「最新即正确」的时序数据，丢一两个 tick 无伤大雅，无需持久化，Pub/Sub 性能更高。

---

## 四、数据库设计（8 张表，建在 react_ts_db）

| 表 | 说明 | 关键字段 |
|---|---|---|
| `stocks` | 股票信息 | symbol、prev_close、price_limit_pct、lot_size |
| `accounts` | 资金账户 | cash_total、cash_available、cash_frozen、fee_rate |
| `orders` | 委托单 | side、order_type、price、quantity、filled_quantity、status、client_order_id |
| `trades` | 成交记录 | trade_no、buy_order_id、sell_order_id、price、quantity、amount |
| `positions` | 持仓 | quantity、available_quantity、frozen_quantity、avg_cost |
| `klines` | K 线历史 | symbol、period、ts、OHLCV |
| `quotes` | 行情快照 | last_price、open、high、low、pre_close |
| `risk_logs` | 风控日志 | action、rule、detail |

种子：8 只模拟股票（茅台/平安银行/五粮液等），每个用户初始资金 1,000,000。

---

## 五、风控设计

### 12 类风控规则（全部经 `rejectRisk` 留痕 `risk_logs`）

| 阶段 | rule | 说明 |
|---|---|---|
| 下单 | `bad_side` / `bad_type` / `bad_qty` | 方向/类型/数量基础校验 |
| 下单 | `bad_symbol` | 股票不存在或停牌 |
| 下单 | `lot_size` | 数量须为 1 手（100 股）整数倍 |
| 下单 | `bad_price` | 限价单价格无效 |
| 下单 | `price_limit` | 超出涨跌停范围 |
| 下单 | `no_cash` / `no_position` | 资金/持仓不足（预校验 + 事务内并发抢占） |
| 下单 | `duplicate` | client_order_id 幂等去重 |
| 撤单 | `not_found` | 委托不存在或不归属 |
| 撤单 | `bad_status` | 仅待成交/部分成交可撤 |

### 防并发超卖

预校验只给友好提示，真正防超卖靠事务内**带条件 UPDATE**：

```sql
UPDATE accounts
   SET cash_available = cash_available - ?, cash_frozen = cash_frozen + ?
 WHERE user_id = ? AND cash_available >= ?     -- 原子校验
```

`affectedRows = 0` 即并发抢占失败，回滚并记 `no_cash` 日志。持仓侧同理。

---

## 六、撮合引擎容灾（阶段 6 核心）

### 问题
Python 撮合引擎崩溃重启后，内存中的订单簿丢失，所有挂单失效——这在真实交易系统里是绝对事故。

### 方案：活跃订单快照 + 启动重建

**写入（Node 下单时）**：限价单落库后，同步写 Redis 快照

```
SET orders:active  → SADD order_id            # 所有在簿活跃单 id 集合
HASH orders:active:{id} → HSET 全字段          # 重建簿所需：side/price/qty/filled...
```

**重建（Python 启动时）**：

```python
async def main():
    active = await load_active_orders(redis)   # 读 SET + 所有 HASH
    rebuilt = engine.rebuild_from_active(active)  # 重建订单簿
    print(f'[matcher] 从快照重建 {rebuilt} 笔挂单')
    # 再启动消费者（seen_ids 先就位去重 Stream 重投递）
```

**移除（撤单/全成交时）**：tradeConsumer 结算时 `SREM` + `DEL` 清快照。

### 验证
`verify-rebuild.js` 端到端验证：挂单 → 杀 Python → 重启重建 → 挂单仍可成交/可撤，资金守恒。

---

## 七、Redis 5 兼容：pending 消息回收

### 问题
消费者崩溃后，已读取未 ACK 的消息滞留 pending 队列。Redis 6+ 的 `XAUTOCLAIM` 可自动回收，但 **Redis 5.0 不支持**。

### 方案：XPENDING + XCLAIM

消费者启动时先扫描 pending 队列，对超过阈值的消息用 `XCLAIM` 抢回重处理：

```python
async def _drain_pending(self):
    # XPENDING 列出 pending 消息（id + idle 时间 + 消费者）
    pending = await self.redis.xpending_range(STREAM, group, min='-', max='+', count=100)
    for p in pending:
        if p['time_since_delivered'] > IDLE_THRESHOLD:
            # XCLAIM 抢回该消息归属当前消费者
            await self.redis.xclaim(STREAM, group, CONSUMER, min_idle_time=IDLE_THRESHOLD,
                                     ids=[p['message_id']])
            # ...重新处理...
```

---

## 八、前端实时通信

### WebSocket 客户端（useMarketSocket）

- JWT 鉴权连接 `ws://localhost:3000/ws`
- 订阅 symbol 房间接收行情（tick/kline/depth）
- 私有通道接收成交/委托状态通知
- 心跳保活 + 断线重连

### 数据联动

收到通知后用 React Query 的 `invalidateQueries` 即时失效相关查询，无需等 3s 轮询：

```ts
function handleNotify(n: UserNotify) {
  if (n.type === 'order_status') {
    qc.invalidateQueries({ queryKey: ['trading', 'orders'] })
    qc.invalidateQueries({ queryKey: ['trading', 'account'] })
    qc.invalidateQueries({ queryKey: ['trading', 'positions'] })
  } else if (n.type === 'trade') {
    // 委托 + 成交 + 资金 + 持仓 全部失效
  }
}
```

### 五档联动点价填单

五档盘口点击价格 → `onPickPrice` 回调 → 写入 `pickedPrice`（含 nonce 防连点同价不触发）→ OrderForm 的 `useEffect` 填入价格并切限价模式。

---

## 九、API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/trading/stocks` | 股票列表 |
| GET | `/api/trading/quotes/:symbol` | 实时行情快照 |
| GET | `/api/trading/klines/:symbol` | K 线历史 |
| GET | `/api/trading/account` | 资金账户 |
| GET | `/api/trading/positions` | 持仓列表 |
| GET | `/api/trading/orders` | 委托列表（可按 status 过滤） |
| POST | `/api/trading/orders` | 下单（限价/市价 + 买入/卖出） |
| POST | `/api/trading/orders/:id/cancel` | 撤单 |
| GET | `/api/trading/trades` | 成交列表 |
| GET | `/api/trading/risk-logs` | 风控日志（可按 action/rule 过滤） |
| GET | `/api/trading/risk-logs/summary` | 风控日志按 rule 聚合 |

所有交易路由前置 `auth`（JWT）+ `ensureAccount`（首次自动开户）中间件。

---

## 十、端到端验证脚本

| 脚本 | 验证内容 |
|---|---|
| `verify-cancel.js` | 撤单链路：挂单→冻结→撤单→释放→资金守恒→重复撤单被拒 |
| `verify-rebuild.js` | 容灾：挂单→杀 Python→重启重建→挂单仍有效可成交/可撤 |
| `verify-risk-logs.js` | 风控留痕（service 层）：7 类拒绝全记录、summary 聚合 |
| `verify-risk-logs-http.js` | 风控留痕（HTTP 全链路）：登录→API 触发拒绝→查询→过滤 |
