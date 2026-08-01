import { InterviewQuestion } from './types'

// 交易系统方向：本项目证券交易系统的核心技术难点
export const tradingQuestions: InterviewQuestion[] = [
  {
    id: 'trading-matching-engine',
    category: '交易系统',
    difficulty: 'expert',
    title: '证券撮合引擎如何设计？价格优先 + 时间优先如何实现？',
    summary:
      '撮合引擎是交易系统核心。用 SortedDict/biset 维护买卖盘，买盘价格降序、卖盘价格升序，同价位按挂单时间 FIFO，maker 价成交。',
    answer: `## 撮合两大原则
1. **价格优先**：买单出价高者优先成交，卖单要价低者优先成交
2. **时间优先**：同价位按挂单时间先后顺序成交（FIFO）

## 订单簿结构
- **买盘 bids**：按价格降序，同价位按时间升序的订单队列
- **卖盘 asks**：按价格升序，同价位按时间升序的订单队列
- 用 bisect 维护有序价格数组，每价位挂一个订单列表，O(log n) 定位最优档位

## 撮合流程
1. 新订单到达，买单找最低卖价、卖单找最高买价
2. 若买价 >= 卖价则可成交，以 **maker 价**（先挂单者价格）成交
3. taker 全部成交或剩余量挂入订单簿成为新 maker
4. 全成订单移出簿，部分成交更新 filled_quantity

## 为什么 maker 价成交
挂单者提供流动性（maker），主动成交者消耗流动性（taker）。按 maker 价成交保护先挂单者利益，是交易所惯例。`,
    code: `# 价格优先 + 时间优先撮合（简化）
class OrderBook:
    def __init__(self):
        self.bids = {}          # {price: [orders]} 降序
        self.asks = {}          # {price: [orders]} 升序
        self.bid_prices = []    # bisect 维护的有序价格

    def match(self, order):
        if order.is_buy:
            while self.ask_prices and order.remaining > 0:
                best = self.ask_prices[0]            # 最低卖价
                if order.price < best:
                    break                            # 买价低于卖价，无法成交
                self._fill(order, best, self.asks)   # maker 价成交
        else:
            while self.bid_prices and order.remaining > 0:
                best = self.bid_prices[-1]           # 最高买价
                if order.price > best:
                    break
                self._fill(order, best, self.bids)`,
    links: [
      { title: '交易所撮合引擎设计原理 - 掘金', url: 'https://juejin.cn/post/6844904163516403725', site: '掘金' },
      { title: '订单簿与撮合算法详解 - CSDN', url: 'https://blog.csdn.net/u012393551/article/details/108237219', site: 'CSDN' },
    ],
  },
  {
    id: 'trading-stream-vs-pubsub',
    category: '交易系统',
    difficulty: 'expert',
    title: 'Redis Stream 和 Pub/Sub 如何选型？交易系统为什么混用？',
    summary:
      '交易流（订单/成交）用 Stream：消费者组 + ACK + pending 续消费，崩溃不丢；行情广播用 Pub/Sub：最新即正确，丢一两个无妨，低延迟。',
    answer: `## 两者本质区别
| | Stream | Pub/Sub |
|---|---|---|
| 持久化 | 持久存储，可回溯 | 推完即弃，无留存 |
| 消费确认 | 消费者组 + XACK | 无 ACK 机制 |
| 离线消费 | 支持（pending 续消费） | 不支持（离线丢消息） |
| 延迟 | 略高（需落盘） | 极低（纯内存推送） |

## 本项目选型
- **交易流用 Stream**：订单、成交、撤单、状态变更走 Stream。钱相关绝不能丢，需消费者组 ACK 确认，崩溃重启从 pending 续消费
- **行情流用 Pub/Sub**：tick/kline/depth 广播。行情最新即正确，丢一两个 tick 无影响，要的是低延迟全广播

## 设计哲学
**可靠性 vs 实时性的权衡**：钱必须准（Stream），行情必须快（Pub/Sub）。按业务对消息丢失的容忍度选型，而不是一刀切。`,
    code: `// 交易流：Stream 投递订单（可靠）
await redis.xadd(
  CHANNELS.STREAM_ORDERS_NEW, '*',
  'order_id', String(order.id),
  'user_id', String(userId),
  'symbol', symbol
)
// Python 端：XREADGROUP 消费 + XACK 确认

// 行情流：Pub/Sub 广播（低延迟）
await redis.publish(
  \`ch:market:tick:\${symbol}\`,
  JSON.stringify(tick)
)
// Node WS 转发，前端实时渲染`,
    links: [
      { title: 'Redis Stream vs Pub/Sub 深度对比 - 掘金', url: 'https://juejin.cn/post/7113753525159174152', site: '掘金' },
      { title: 'Redis 消息队列选型 - 知乎', url: 'https://zhuanlan.zhihu.com/p/47863788', site: '知乎' },
    ],
  },
  {
    id: 'trading-disaster-recovery',
    category: '交易系统',
    difficulty: 'expert',
    title: '撮合引擎崩溃后挂单会丢吗？如何实现容灾重建？',
    summary:
      '限价单写 Redis 活跃快照（SET + HASH），撮合进程崩溃重启后从快照 rebuild_from_active 重建订单簿，seen_ids 去重 Stream 重投递，挂单不丢。',
    answer: `## 问题：撮合进程是无状态的内存簿
撮合引擎的订单簿在内存里。一旦进程崩溃，所有未成交挂单的内存状态消失。若不恢复，用户挂单凭空消失，资金冻结却无对应订单。

## 容灾方案：活跃订单快照
1. **写入侧**：Node 落单后，把活跃限价单写 Redis 快照
   - SET orders:active 存所有活跃订单 ID
   - HASH orders:active:{id} 存订单字段（价格/数量/方向等）
2. **更新侧**：成交/撤单时更新或移除快照
3. **重建侧**：Python 启动时 load_active_orders 读全部快照，rebuild_from_active 重建簿

## Stream 重投递去重
崩溃期间 Stream 里可能有未 ACK 的订单消息，重启后会重投递。用 seen_ids 集合去重，避免同一订单重复入簿。

## 关键：重建先于消费
启动顺序必须是「先重建簿 → 再启动消费者」，否则重建前的消息会把订单重复入簿。`,
    code: `# main.py 启动重建
async def main():
    # 1. 先从快照重建订单簿
    active = await load_active_orders(redis)
    rebuilt = engine.rebuild_from_active(active)
    print(f'从快照重建 {rebuilt} 笔挂单')

    # 2. seen_ids 先就位，去重 Stream 重投递
    # 3. 再启动消费者（重建已就绪）
    await asyncio.gather(*market_tasks, match_task, cancel_task)`,
    links: [
      { title: '撮合引擎高可用设计 - 掘金', url: 'https://juejin.cn/post/7057403774378377230', site: '掘金' },
      { title: 'Redis 状态快照与恢复 - CSDN', url: 'https://blog.csdn.net/qq_37232329/article/details/120358235', site: 'CSDN' },
    ],
  },
  {
    id: 'trading-oversell-prevent',
    category: '交易系统',
    difficulty: 'expert',
    title: '高并发下单如何防止资金超卖？带条件 UPDATE 为什么比先查后改好？',
    summary:
      '事务内带条件 UPDATE（WHERE cash_available >= ?）让 DB 原子校验，affectedRows=0 即回滚。比「先 SELECT 再 UPDATE」无竞态窗口。',
    answer: `## 错误方案：先查后改（有竞态）
\`\`\`
1. SELECT cash_available FROM accounts WHERE user_id=?
2. 应用层判断 cash_available >= amount
3. UPDATE accounts SET cash_available -= amount
\`\`\`
步骤 1 和 3 之间有间隙，两个并发请求都读到 1000，都判断通过，都扣款，最终变成负数（超卖）。

## 正确方案：带条件 UPDATE（原子）
\`\`\`
UPDATE accounts
SET cash_available = cash_available - ?,
    cash_frozen = cash_frozen + ?
WHERE user_id = ? AND cash_available >= ?
\`\`\`
DB 用行锁保证原子性，WHERE 条件在 UPDATE 时再次校验。affectedRows=0 说明并发抢占失败，直接回滚。

## 为什么有效
- **原子性**：校验和扣减在一个 SQL 内，无间隙
- **行锁**：UPDATE 触发行锁，并发请求串行执行
- **无需应用层加锁**：DB 层搞定，分布式下也成立

## 配合事务
冻结资金、插入订单、投递 Stream 在同一事务内，任一步失败整体回滚。`,
    code: `// 事务内原子冻结
const conn = await pool.getConnection()
await conn.beginTransaction()
try {
  const [r] = await conn.query(
    \`UPDATE accounts
       SET cash_available = cash_available - ?,
           cash_frozen = cash_frozen + ?
     WHERE user_id = ? AND cash_available >= ?\`,
    [freezeAmount, freezeAmount, userId, freezeAmount]
  )
  if (r.affectedRows === 0) {
    throw new RiskError('no_cash', '可用资金不足')
  }
  await conn.commit()
} catch (e) {
  await conn.rollback()
  throw e
}`,
    links: [
      { title: 'MySQL 并发扣款防超卖方案 - 掘金', url: 'https://juejin.cn/post/7017982051453796382', site: '掘金' },
      { title: '乐观锁与悲观锁 - 知乎', url: 'https://zhuanlan.zhihu.com/p/40242267', site: '知乎' },
    ],
  },
  {
    id: 'trading-risk-control',
    category: '交易系统',
    difficulty: 'hard',
    title: '交易系统的前置风控如何设计？如何保证拒绝记录可审计？',
    summary:
      '12 类风控规则（涨跌停/手数/资金/持仓/幂等等），rejectRisk 统一出口函数「先记日志再抛错」，所有拒绝写入 risk_logs 可查可聚合。',
    answer: `## 风控的位置
前置风控放在下单服务入口，**在冻结资金和投递撮合之前**。拦截非法请求，避免脏数据进入撮合和结算。

## 12 类规则
- **价格类**：涨跌停限制、价格合理性
- **数量类**：最小手数、最大手数
- **资金类**：可用资金不足
- **持仓类**：卖出持仓不足
- **时序类**：交易时段限制
- **幂等类**：client_order_id 防重复提交
- **状态类**：撤单时订单状态校验（仅待成交/部分成交可撤）
- **自成交类**：禁止与自己挂单成交

## 统一出口 rejectRisk
所有拒绝场景收口到一个函数：先写 risk_logs（含 user/symbol/action/rule/message/detail），再抛 RiskError。好处：
1. **全量留痕**：不会漏记，可审计可对账
2. **统一错误模型**：前端按 rule 字段区分提示
3. **可聚合统计**：按 rule 聚合分析风控命中分布`,
    code: `// 风控统一出口：先记日志再抛错
async function rejectRisk({ userId, symbol,
  action, rule, message, detail }) {
  await logRisk(userId, symbol, action, rule,
    detail || message)        // 写入 risk_logs
  throw new RiskError(rule, message)
}

// 调用示例：涨跌停校验
if (price > upperLimit || price < lowerLimit) {
  await rejectRisk({
    userId, symbol, action: 'order',
    rule: 'price_limit', message: '超出涨跌停价',
    detail: \`允许区间 [\${lowerLimit}, \${upperLimit}]\`
  })
}`,
    links: [
      { title: '证券交易风控系统设计 - CSDN', url: 'https://blog.csdn.net/wangdan1992/article/details/106376553', site: 'CSDN' },
      { title: '金融风控架构实践 - 掘金', url: 'https://juejin.cn/post/7048925431555194894', site: '掘金' },
    ],
  },
  {
    id: 'trading-order-book',
    category: '交易系统',
    difficulty: 'hard',
    title: '订单簿用什么数据结构？如何保证撮合 O(log n)？',
    summary:
      '买卖盘各用「价格 → 订单队列」的字典 + bisect 维护的有序价格数组。价位内 FIFO 队列保证时间优先，有序数组二分定位保证价格优先 O(log n)。',
    answer: `## 数据结构选择
- **价格层级**：dict 映射 price → 订单列表，价位内按时间顺序（FIFO）
- **有序价格**：用 bisect 维护排序数组，买盘降序（最高买价在尾）、卖盘升序（最低卖价在首）
- **O(log n) 定位**：bisect 二分查找最优价位

## 为什么不用堆
堆只能取极值，无法高效遍历多档（五档盘口需要前 5 个价位）。有序数组能 O(1) 取任意档位，适合五档展示。

## 为什么不用平衡树
Python 没有内置平衡树，sortedcontainers 的 SortedDict 可用但引入依赖。bisect + list 足够，且价位数量有限（一只股票价格离散点不多）。

## 删除优化
价位订单清空时，从有序数组移除该价格（bisect 定位 + pop），保持数组紧凑。`,
    code: `import bisect

class OrderBook:
    def __init__(self):
        self.bids = {}              # {price: [orders]}
        self.bid_prices = []        # 升序数组，取最高用 [-1]

    def add(self, order):
        price = order.price
        if price not in self.bids:
            bisect.insort(self.bid_prices, price)  # O(log n) 插入
            self.bids[price] = []
        self.bids[price].append(order)             # O(1) 追加，FIFO

    def best_bid(self):
        if not self.bid_prices:
            return None
        return self.bid_prices[-1]                 # O(1) 取最高买价`,
    links: [
      { title: '订单簿数据结构实现 - 掘金', url: 'https://juejin.cn/post/7076282530035449869', site: '掘金' },
      { title: '高频交易数据结构选型 - 知乎', url: 'https://zhuanlan.zhihu.com/p/358698076', site: '知乎' },
    ],
  },
  {
    id: 'trading-market-generation',
    category: '交易系统',
    difficulty: 'hard',
    title: '模拟行情如何生成？几何布朗运动 + 均值回归是什么？',
    summary:
      '用几何布朗运动（GBM）模拟价格随机游走，叠加均值回归让价格围绕基准震荡，涨跌停钳制防止越界。tick 聚合成 1m K 线。',
    answer: `## 几何布朗运动（GBM）
股价模型：dS = μS dt + σS dW
- μ：漂移率（长期趋势）
- σ：波动率（随机扰动强度）
- dW：布朗运动随机项

离散化：S(t+1) = S(t) * exp((μ - σ²/2)Δt + σ√Δt · Z)，Z 是标准正态随机数。

## 均值回归
纯 GBM 会随机游走偏离基准太远。加一个拉回基准的力：
- 价格高于基准时，漂移项加负向修正
- 价格低于基准时，漂移项加正向修正
- 让价格围绕基准价震荡，更像真实股票

## 涨跌停钳制
A股有 ±10%（创业板 ±20%）涨跌停限制。生成价格后钳制到 [昨收×0.9, 昨收×1.1]，防止越界。

## tick → K 线聚合
每秒一个 tick，聚合 1 分钟内的 OHLCV（开高低收量），形成 K 线推送前端。`,
    code: `import math, random

def gen_tick(prev_price, base_price, sigma=0.002):
    # 几何布朗运动 + 均值回归
    drift = 0.0001                          # 基础漂移
    mean_revert = -0.5 * math.log(prev_price / base_price)  # 拉回基准
    z = random.gauss(0, 1)                  # 标准正态
    ret = drift + mean_revert + sigma * z   # 收益率
    new_price = prev_price * math.exp(ret)
    # 涨跌停钳制
    new_price = clamp(new_price,
                      base_price * 0.9, base_price * 1.1)
    return new_price`,
    links: [
      { title: '几何布朗运动模拟股价 - 知乎', url: 'https://zhuanlan.zhihu.com/p/350944158', site: '知乎' },
      { title: '期权定价与 GBM 模型 - CSDN', url: 'https://blog.csdn.net/qq_41028585/article/details/106862555', site: 'CSDN' },
    ],
  },
  {
    id: 'trading-cancel-flow',
    category: '交易系统',
    difficulty: 'hard',
    title: '撤单链路如何设计？如何保证冻结资金正确释放？',
    summary:
      '前端撤单→后端校验状态→Stream 投递撤单指令→撮合引擎 order_book.cancel→释放冻结资金→WS 推送状态。全链路异步可靠。',
    answer: `## 撤单全链路
1. **前端**：点撤单按钮 → POST /api/trading/orders/:id/cancel
2. **后端校验**：订单存在 + 归属用户 + 状态为待成交/部分成交（已成交不可撤）
3. **投递指令**：XADD 到 stream:orders:cancel
4. **撮合处理**：cancel_consumer 消费，order_book.cancel 从簿移除，返回未成交量
5. **释放冻结**：Node 收到撤单回报，事务内 UPDATE accounts 释放冻结资金、UPDATE positions 释放冻结持仓
6. **WS 推送**：通知前端订单状态变 canceled，前端 invalidate 刷新

## 为什么异步而非同步撤单
撮合引擎在 Python 进程，Node 不能直接操作其内存簿。通过 Stream 解耦：Node 投递指令，Python 异步处理，避免跨进程同步等待。

## 状态校验的重要性
只能撤待成交/部分成交的订单。已成交订单撤单无意义，撤单中状态避免重复撤单。校验在投递前做，拦截非法请求。`,
    code: `// 后端撤单：校验 + 投递指令
async function cancelOrder(userId, orderId) {
  const order = await OrderModel.findById(orderId)
  if (!order || Number(order.user_id) !== Number(userId)) {
    throw new RiskError('not_found', '委托单不存在')
  }
  // 仅待成交/部分成交可撤
  if (order.status !== PENDING && order.status !== PARTIAL) {
    throw new RiskError('bad_status', '当前状态不可撤销')
  }
  // 投递撤单指令到 Stream
  await redis.xadd(
    CHANNELS.STREAM_ORDERS_CANCEL, '*',
    'order_id', String(order.id),
    'user_id', String(userId)
  )
}`,
    links: [
      { title: '交易系统撤单设计 - CSDN', url: 'https://blog.csdn.net/wangdan1992/article/details/108237219', site: 'CSDN' },
      { title: '异步任务链路设计 - 掘金', url: 'https://juejin.cn/post/6987553913025220621', site: '掘金' },
    ],
  },
  {
    id: 'trading-consumer-group',
    category: '交易系统',
    difficulty: 'expert',
    title: 'Redis Stream 消费者组如何保证消息不丢？XACK 和 pending 的作用？',
    summary:
      '消费者组让多个消费者分担消费，XREADGROUP 读取后消息进 pending 列表，XACK 确认后才删除。消费者崩溃未 ACK 的消息留在 pending，重启可续消费。',
    answer: `## 消费者组机制
- **XGROUP CREATE** 创建组，组内消费者分担同一 Stream
- **XREADGROUP >** 读取新消息，消息同时进入该消费者的 PEL（pending entries list）
- **XACK** 处理完成后确认，消息从 pending 删除
- 未 ACK 的消息永久留在 pending，直到 ACK 或被回收

## 为什么不丢
1. 消费者读到消息但崩溃了（没 ACK）→ 消息还在 pending
2. 重启后用 XREADGROUP ID 0 重新读自己的 pending，继续处理
3. 处理成功才 XACK，保证至少消费一次

## 本项目的消费者组
- matchers：消费新订单（stream:orders:new）
- cancellers：消费撤单指令（stream:orders:cancel）
- settlers：消费成交回报（stream:trades:done）

## 幂等处理
至少消费一次意味着可能重复消费。成交结算用订单状态校验（已结算则跳过），保证幂等。`,
    code: `# Python 消费者组消费
await redis.xgroup_create(STREAM_ORDERS_NEW, 'matchers', id='0')

while True:
    resp = await redis.xreadgroup(
        'matchers', 'matcher-1',
        {STREAM_ORDERS_NEW: '>'},   # '>' 只读新消息
        count=10, block=2000
    )
    for msg_id, fields in resp:
        await process_order(fields)  # 业务处理
        await redis.xack(STREAM_ORDERS_NEW, 'matchers', msg_id)  # 确认`,
    links: [
      { title: 'Redis Stream 消费者组详解 - 掘金', url: 'https://juejin.cn/post/7113753525159174152', site: '掘金' },
      { title: 'XACK 与消息可靠性 - CSDN', url: 'https://blog.csdn.net/qq_37232329/article/details/120358235', site: 'CSDN' },
    ],
  },
  {
    id: 'trading-pending-reclaim',
    category: '交易系统',
    difficulty: 'expert',
    title: '消费者崩溃后 pending 消息如何回收？Redis 5 没有 XAUTOCLAIM 怎么办？',
    summary:
      'Redis 6 有 XAUTOCLAIM 一键回收，本项目用 Redis 5，用 XPENDING 扫描 + XCLAIM 抢回两步替代，实现崩溃消费者未 ACK 消息的回收。',
    answer: `## 问题场景
消费者 matcher-1 读了一批消息进 pending，但进程崩溃再没启动。这些消息永远留在 pending，无人处理。

## XAUTOCLAIM（Redis 6+）
一条命令扫描 pending 中超时未 ACK 的消息，转移给新消费者重处理。简单但 Redis 5 不支持。

## Redis 5 替代方案：XPENDING + XCLAIM
1. **XPENDING** 查询 pending 列表，筛选出长时间未 ACK 的消息（minIdleTime 超阈值）
2. **XCLAIM** 把这些消息的所有权转移给当前消费者
3. 转移后重新处理 + XACK

## 两步实现的注意点
- 启动时先 drain pending（XPENDING + XCLAIM），再消费新消息
- minIdleTime 要大于正常处理时长，避免抢走正在处理的消息
- 抢回的消息要幂等处理（可能已处理过但 ACK 丢了）

## 本项目实践
matcher-1 启动时先 _drain_pending，把超时 5 秒未 ACK 的消息 XCLAIM 过来重处理，再进入正常消费循环。`,
    code: `# Redis 5 兼容的 pending 回收
async def drain_pending(redis, stream, group, consumer):
    # 1. XPENDING 查超时未 ACK 的消息
    pending = await redis.xpending_range(
        stream, group, min='-', max='+',
        count=100, min_idle_time=5000  # 空闲 5s 以上
    )
    if not pending:
        return
    msg_ids = [p['message_id'] for p in pending]
    # 2. XCLAIM 抢回这些消息
    await redis.xclaim(stream, group, consumer, 0, *msg_ids)
    # 3. 重新处理 + ACK
    for msg_id in msg_ids:
        await process_and_ack(redis, stream, group, msg_id)`,
    links: [
      { title: 'Redis Stream pending 消息回收 - 掘金', url: 'https://juejin.cn/post/7113753525159174152', site: '掘金' },
      { title: 'XAUTOCLAIM 与 XCLAIM 对比 - CSDN', url: 'https://blog.csdn.net/qq_37232329/article/details/120358235', site: 'CSDN' },
    ],
  },
  {
    id: 'trading-responsibility-split',
    category: '交易系统',
    difficulty: 'hard',
    title: '为什么 Python 撮合引擎不直接写 MySQL？职责如何分离？',
    summary:
      'Python 只管算（撮合/行情），Node 只管存（事务落库）。Python 无 DB 凭据更安全，可随时重启，资金安全不依赖撮合进程存活。',
    answer: `## 设计原则：真相源唯一
资金/持仓的真相源**唯一在 MySQL**，由 Node.js 负责事务持久化。Python 绝不直连 DB，只通过 Redis 与外界通信。

## 为什么这样分
1. **安全性**：Python 不持有 DB 凭据，即使被攻破也无法直接改资金
2. **可重启性**：撮合进程可随时重启（容灾重建），不担心数据丢失，因为真相在 DB
3. **职责单一**：Python 专注计算密集的撮合，Node 专注事务一致性，各司其职
4. **技术匹配**：Python asyncio 擅长 IO 并发（撮合+行情），Node 擅长 DB 连接池+事务

## 数据流
- Python 撮合产出成交 → XADD 到 stream:trades:done
- Node 消费成交 → 事务内 INSERT trades + UPDATE orders/positions/accounts → XACK
- 资金变动只发生在 Node 事务里，Python 永远碰不到

## 如果 Python 直写 DB 会怎样
- 撮合进程崩溃时进行中的事务可能半完成，资金状态不一致
- Python 的 DB 连接增加撮合进程负担
- 分布式事务复杂度爆炸`,
    code: `// Node 消费成交回报，事务落库（资金真相源）
async function settleTrade(msg) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    await conn.query('INSERT INTO trades ...', ...)      // 成交记录
    await conn.query('UPDATE orders SET filled_qty ...') // 订单状态
    await conn.query('UPDATE positions SET ...')         // 持仓
    await conn.query('UPDATE accounts SET ...')          // 资金
    await conn.commit()
    await redis.xack(STREAM_TRADES, 'settlers', msg.id)  // 确认
  } catch (e) {
    await conn.rollback()
    throw e   // 不 ACK，消息留 pending 待重试
  }
}`,
    links: [
      { title: '微服务职责分离原则 - 知乎', url: 'https://zhuanlan.zhihu.com/p/95078853', site: '知乎' },
      { title: '单一真相源设计 - 掘金', url: 'https://juejin.cn/post/6844903959486206989', site: '掘金' },
    ],
  },
  {
    id: 'trading-fund-conservation',
    category: '交易系统',
    difficulty: 'expert',
    title: '交易系统如何保证资金守恒？一笔买卖的对账如何验证？',
    summary:
      '资金守恒：可用 + 冻结 + 持仓成本 = 常数。冻结→成交→持仓/资金转移全在事务内，每步可对账：accounts + positions + orders + trades 四表一致。',
    answer: `## 资金守恒方程
\`可用资金 + 冻结资金 = 总资金 - 持仓占用\`
任何时刻这个等式成立。下单冻结只是资金从「可用」挪到「冻结」，总量不变；成交时冻结转为持仓成本，总量仍不变。

## 一笔买卖的资金流
1. **下单冻结**：可用 -= amount，冻结 += amount（总量不变）
2. **成交结算**：冻结 -= amount，持仓成本 += amount（总量不变）
3. **撤单释放**：冻结 -= amount，可用 += amount（总量不变）

## 对账验证
成交后查四表一致性：
- accounts：可用+冻结变化 = 应付金额
- positions：持仓数量/成本变化 = 成交数量/价格
- orders：filled_quantity = 成交量，status 正确
- trades：成交记录的买卖双方配对，金额守恒

## 事务保证
冻结、落单、投递在同一事务；成交结算的 INSERT trades + UPDATE orders/positions/accounts 也在同一事务。任一步失败回滚，不会出现钱扣了订单没落、或成交了资金没动。`,
    code: `// 对账脚本：验证一笔成交的资金守恒
const acc = await pool.query(
  'SELECT cash_available, cash_frozen FROM accounts WHERE user_id=?', [uid])
const pos = await pool.query(
  'SELECT quantity, cost FROM positions WHERE user_id=? AND symbol=?', [uid, sym])
const trades = await pool.query(
  'SELECT * FROM trades WHERE order_id=?', [orderId])

// 守恒校验：可用 + 冻结 + 持仓成本 = 初始资金
const total = acc[0].cash_available + acc[0].cash_frozen
             + pos[0].quantity * pos[0].avg_cost
assert(Math.abs(total - INIT_CASH) < 0.01, '资金不守恒')`,
    links: [
      { title: '交易系统资金对账设计 - CSDN', url: 'https://blog.csdn.net/wangdan1992/article/details/106376553', site: 'CSDN' },
      { title: '金融系统一致性保证 - 掘金', url: 'https://juejin.cn/post/7048925431555194894', site: '掘金' },
    ],
  },
  {
    id: 'trading-depth-click',
    category: '交易系统',
    difficulty: 'hard',
    title: '五档盘口联动点价填单如何实现？前端状态如何传递？',
    summary:
      '五档盘口点击价格触发 onPickPrice 回调，父组件用 nonce 生成 pickedPrice 传给 OrderForm，useEffect 监听变化自动填价并切限价模式。nonce 解决相同价格不触发问题。',
    answer: `## 交互需求
用户点击五档盘口某档价格，自动填入下单面板的价格输入框，并切换到限价单模式，减少手动输入。

## 组件通信链路
1. **DepthBook**：每档价格行绑定 onClick → 调用 onPickPrice(price)
2. **TradingPage（父）**：接收价格，setState 生成 pickedPrice 对象
3. **OrderForm**：props 接收 pickedPrice，useEffect 监听变化，setPrice + setOrderType(LIMIT)

## 为什么用 nonce
如果用户连续点同一档价格（比如 12.50 两次），第二次 pickedPrice.value 仍是 12.50，useEffect 依赖 [pickedPrice] 不会触发（引用变了但...实际上对象引用变了会触发）。但更稳妥的是用 nonce（时间戳）标记每次点击，确保 useEffect 一定触发。

## 为什么切限价模式
市价单没有价格输入框（按市场价成交），点价填单只对限价单有意义。点击价格隐含「我想以这个价挂单」，所以自动切限价。`,
    code: `// 父组件：传递价格
export default function TradingPage() {
  const [pickedPrice, setPickedPrice] = useState<PickedPrice>()

  const handlePickPrice = (price: number) => {
    setPickedPrice({ value: price, nonce: Date.now() })  // nonce 标记每次点击
  }

  return (
    <>
      <DepthBook depth={depth} onPickPrice={handlePickPrice} />
      <OrderForm pickedPrice={pickedPrice} />
    </>
  )
}

// OrderForm：监听价格变化自动填入
useEffect(() => {
  if (pickedPrice) {
    setPrice(String(pickedPrice.value))
    setOrderType(ORDER_TYPE.LIMIT)  // 自动切限价
  }
}, [pickedPrice])`,
    links: [
      { title: 'React 组件通信方式 - 掘金', url: 'https://juejin.cn/post/6844904048057331716', site: '掘金' },
      { title: 'useEffect 依赖陷阱 - 知乎', url: 'https://zhuanlan.zhihu.com/p/358698076', site: '知乎' },
    ],
  },
  {
    id: 'trading-ws-notify-refresh',
    category: '交易系统',
    difficulty: 'hard',
    title: 'WebSocket 收到成交通知后，前端如何实现毫秒级数据刷新？',
    summary:
      'WS 收到订单状态/成交通知 → 调用 React Query 的 invalidateQueries 失效相关缓存 → TanStack Query 自动重新拉取，告别死轮询，毫秒级联动。',
    answer: `## 传统方案的痛点
- **轮询**：每 N 秒拉一次接口，延迟高、浪费请求
- **手动 setState**：通知来了手动改 state，组件多了难维护，多个列表要同步更新

## 本项目方案：WS 通知 + invalidate
1. WS 收到通知（order_status / trade）
2. 按通知类型 invalidateQueries 对应缓存 key
3. TanStack Query 检测到缓存失效，自动后台重新拉取
4. 新数据回来，所有用该 query 的组件自动重渲染

## invalidate 的优势
- **单一数据源**：组件只管从 query 读，不用关心谁更新它
- **自动去重**：同一 key 多次 invalidate 只拉一次
- **stale-while-revalidate**：先显示旧数据，后台拉新数据，无白屏

## 通知类型映射
- order_status → invalidate orders, account, positions
- trade → invalidate orders, trades, account, positions
成交影响资金和持仓，状态变更可能伴随成交，所以多个 key 一起失效。`,
    code: `// WS 通知触发缓存失效
function handleNotify(n: UserNotify) {
  if (n.type === 'order_status') {
    qc.invalidateQueries({ queryKey: ['trading', 'orders'] })
    qc.invalidateQueries({ queryKey: ['trading', 'account'] })
    qc.invalidateQueries({ queryKey: ['trading', 'positions'] })
  } else if (n.type === 'trade') {
    qc.invalidateQueries({ queryKey: ['trading', 'orders'] })
    qc.invalidateQueries({ queryKey: ['trading', 'trades'] })
    qc.invalidateQueries({ queryKey: ['trading', 'account'] })
    qc.invalidateQueries({ queryKey: ['trading', 'positions'] })
  }
}
// TanStack Query 自动重新拉取，组件毫秒级刷新`,
    links: [
      { title: 'React Query invalidateQueries - 掘金', url: 'https://juejin.cn/post/7076282530035449869', site: '掘金' },
      { title: 'WebSocket + React Query 实时方案 - 知乎', url: 'https://zhuanlan.zhihu.com/p/358698076', site: '知乎' },
    ],
  },
]
