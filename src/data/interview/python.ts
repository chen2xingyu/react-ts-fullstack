import { InterviewQuestion } from './types'

// Python 异步方向：asyncio 事件循环、协程、redis.asyncio 等
export const pythonQuestions: InterviewQuestion[] = [
  {
    id: 'python-asyncio-event-loop',
    category: 'Python 异步',
    difficulty: 'expert',
    title: 'Python asyncio 事件循环原理是什么？单线程如何处理并发？',
    summary:
      '事件循环是一个无限循环，不断监听就绪的 IO 事件并调度对应协程执行。单线程靠 IO 多路复用（epoll/select）实现并发：IO 等待时让出执行权给其他协程。',
    answer: `## 事件循环核心
事件循环（Event Loop）是 asyncio 的调度中枢：
1. 维护一个就绪任务队列和一组 IO 监听
2. 用 IO 多路复用（Linux epoll / Windows IOCP）监听 fd 就绪
3. 有 IO 就绪 → 唤醒对应协程恢复执行
4. 协程遇到 await IO → 挂起，让出执行权给其他就绪协程
5. 循环往复，单线程内多个协程交替执行

## 单线程为何能并发
- **IO 密集场景**：大部分时间在等网络/磁盘，等待时让出 CPU 给其他协程
- **无锁切换**：协程切换在用户态，无内核态线程切换开销，无竞态
- **对比多线程**：线程切换需内核介入，且有 GIL 限制

## asyncio.gather 并行
\`asyncio.gather(coro1, coro2)\` 同时调度多个协程，它们的事件循环交替执行，整体耗时约等于最慢的那个，而非串行累加。

## 本项目应用
撮合引擎用 asyncio.gather 同时驱动：每只股票的行情生成协程 + 订单消费协程 + 撤单消费协程，单进程处理多只股票实时行情与撮合。`,
    code: `import asyncio

async def task(name, delay):
    await asyncio.sleep(delay)      # IO 等待，让出执行权
    return f'{name} done'

async def main():
    # 三个任务并行，总耗时约 max(1,2,3)=3s，而非 1+2+3=6s
    results = await asyncio.gather(
        task('A', 1),
        task('B', 2),
        task('C', 3),
    )
    print(results)

asyncio.run(main())  # 启动事件循环`,
    links: [
      { title: 'Python asyncio 事件循环详解 - 掘金', url: 'https://juejin.cn/post/6844904053585821703', site: '掘金' },
      { title: 'asyncio 官方文档 - GitHub', url: 'https://docs.python.org/zh-cn/3/library/asyncio.html', site: 'GitHub' },
    ],
  },
  {
    id: 'python-coroutine-vs-thread',
    category: 'Python 异步',
    difficulty: 'hard',
    title: '协程、线程、进程有什么区别？为什么撮合引擎用协程？',
    summary:
      '进程是资源单位、线程是调度单位、协程是用户态轻量线程。协程切换在用户态无内核开销，单线程无锁无竞态，适合 IO 密集的撮合引擎。',
    answer: `## 三者对比
| | 进程 | 线程 | 协程 |
|---|---|---|---|
| 资源 | 独立内存空间 | 共享进程内存 | 共享线程内存 |
| 切换 | 内核态，开销大 | 内核态，中等 | 用户态，极小 |
| 并发 | 多核并行 | 多核并行（受 GIL） | 单线程并发 |
| 通信 | IPC（管道/队列） | 共享内存+锁 | 同线程直接访问 |
| 安全 | 最隔离 | 需加锁 | 无锁（单线程） |

## Python 的 GIL
Python 线程受 GIL（全局解释器锁）限制，同一时刻只有一个线程执行 Python 字节码。CPU 密集任务多线程无法利用多核，IO 密集任务多线程可行（IO 时释放 GIL）。

## 为什么撮合用协程
1. **IO 密集**：撮合主要在等 Redis 消息（XREADGROUP），协程 IO 等待时让出，高效
2. **无锁**：单线程协程，订单簿无需加锁，代码简单
3. **轻量**：协程切换无内核开销，每只股票一个协程无压力
4. **避开 GIL**：协程本就单线程，GIL 不是问题

## 什么时候用多进程
CPU 密集任务（如大量数值计算）应 multiprocessing 绕开 GIL 利用多核。撮合是 IO 密集，协程最优。`,
    code: `# 协程：单线程无锁访问订单簿
class MatchingEngine:
    def __init__(self):
        self.order_book = OrderBook()  # 无需加锁

    async def consume_orders(self):
        while True:
            msgs = await redis.xreadgroup(...)  # IO 等待时让出
            for msg in msgs:
                self.order_book.match(msg)      # 单线程，无竞态

# 对比：多线程需加锁
import threading
lock = threading.Lock()
def match(msg):
    with lock:                    # 必须加锁，否则竞态
        order_book.match(msg)`,
    links: [
      { title: '协程 vs 线程 vs 进程 - 掘金', url: 'https://juejin.cn/post/6844904053585821703', site: '掘金' },
      { title: 'Python GIL 原理详解 - 知乎', url: 'https://zhuanlan.zhihu.com/p/75304142', site: '知乎' },
    ],
  },
  {
    id: 'python-async-await',
    category: 'Python 异步',
    difficulty: 'expert',
    title: 'async/await 的执行原理？await 时发生了什么？',
    summary:
      'async def 定义协程函数，调用返回 coroutine 对象。await 挂起当前协程、把控制权交还事件循环，等 awaitable 完成后恢复执行。本质是状态机。',
    answer: `## async def 的本质
\`async def f()\` 定义的不是普通函数，调用它返回一个 coroutine 对象（不立即执行）。必须用 await 或事件循环调度才会执行。

## await 做了什么
\`await expr\` 中 expr 必须是 awaitable（coroutine / Task / Future）：
1. 挂起当前协程，保存执行上下文（局部变量、指令位置）
2. 把控制权交还事件循环
3. 事件循环调度其他就绪协程执行
4. awaitable 完成后，事件循环恢复当前协程，返回结果

## 状态机视角
CPython 把 async 函数编译成状态机，每个 await 是一个挂起点。协程恢复时从上次挂起点继续，状态保存在帧对象里。

## 常见误区
- \`asyncio.run(coro)\` 启动事件循环并执行协程
- 直接调用 \`coro()\` 不会执行，需 await
- \`asyncio.create_task(coro)\` 把协程包装成 Task 并立即调度

## 本项目应用
\`await redis.xreadgroup(...)\` 等待 Redis 响应时挂起，事件循环去跑行情生成协程，Redis 数据回来后再恢复撮合协程。`,
    code: `async def fetch_order(redis, order_id):
    # await 挂起，等 Redis 返回
    data = await redis.hgetall(f'order:{order_id}')
    return data      # 恢复后返回

async def main():
    # create_task 立即调度，不阻塞
    task = asyncio.create_task(fetch_order(redis, 1))
    # 此时事件循环可执行其他协程
    do_something_else()
    # await 等待 task 完成
    result = await task

asyncio.run(main())`,
    links: [
      { title: 'Python async/await 原理 - 掘金', url: 'https://juejin.cn/post/6844904053585821703', site: '掘金' },
      { title: '协程状态机原理 - 知乎', url: 'https://zhuanlan.zhihu.com/p/75304142', site: '知乎' },
    ],
  },
  {
    id: 'python-asyncio-gather',
    category: 'Python 异步',
    difficulty: 'hard',
    title: 'asyncio.gather 如何并行调度多任务？异常如何处理？',
    summary:
      'gather 把多个协程包装成 Task 并发调度，等待全部完成返回结果列表。默认任一异常会向上抛，return_exceptions=True 则异常作为结果返回不中断其他任务。',
    answer: `## gather 的作用
\`asyncio.gather(*coros)\` 同时调度多个协程：
1. 把每个协程包装成 Task 并立即加入事件循环
2. 等待所有 Task 完成，按传入顺序返回结果列表
3. 总耗时 ≈ 最慢任务，而非累加

## 本项目典型用法
\`asyncio.gather(*market_tasks, match_task, cancel_task)\` 同时驱动：
- 8 只股票各自的行情生成协程
- 订单撮合消费协程
- 撤单消费协程
它们共享一个事件循环，IO 等待时交替执行。

## 异常处理
- **默认**：任一协程抛异常，gather 立即抛出，其他协程仍在跑（但不等待）
- **return_exceptions=True**：异常对象作为对应位置的结果返回，不中断其他任务
- **取消传播**：取消 gather 会取消所有子 Task

## gather vs wait
- gather：返回结果列表，按顺序，简单
- wait：返回 (done, pending) 集合，更灵活，可控制何时停止`,
    code: `async def main():
    # 并行：行情(8只) + 撮合 + 撮合 + 撤单
    market_tasks = [generator.run_one(s) for s in stocks]  # 8 个行情协程
    match_task = consumer.run()                             # 撮合消费
    cancel_task = cancel_consumer.run()                     # 撤单消费

    # gather 并发调度，所有协程共享事件循环
    await asyncio.gather(*market_tasks, match_task, cancel_task)

# 异常处理示例
results = await asyncio.gather(
    task1(), task2(),
    return_exceptions=True   # 异常作为结果，不中断
)
for r in results:
    if isinstance(r, Exception):
        print('某任务失败:', r)`,
    links: [
      { title: 'asyncio.gather 详解 - 掘金', url: 'https://juejin.cn/post/6844904053585821703', site: '掘金' },
      { title: 'gather vs wait 对比 - 知乎', url: 'https://zhuanlan.zhihu.com/p/75304142', site: '知乎' },
    ],
  },
  {
    id: 'python-redis-asyncio',
    category: 'Python 异步',
    difficulty: 'hard',
    title: 'redis.asyncio 异步客户端如何不阻塞事件循环？',
    summary:
      'redis.asyncio 用 asyncio 的 socket + 协议解析，所有命令是协程，等待 Redis 响应时挂起让出执行权。配合 Stream 的 XREADGROUP block 实现长轮询不浪费 CPU。',
    answer: `## 同步 vs 异步 Redis 客户端
- **redis（同步）**：命令阻塞调用线程，等待网络响应期间线程空转
- **redis.asyncio**：命令是协程，await 时挂起，事件循环去跑其他协程

## 不阻塞事件循环的原理
1. 用 asyncio 的非阻塞 socket 发送命令
2. await 等待响应，协程挂起
3. 事件循环监听 socket 可读，恢复协程读取结果
4. 等待期间其他协程照常执行

## XREADGROUP block 的妙用
\`XREADGROUP ... block=2000\` 阻塞最多 2 秒等新消息：
- 有消息立即返回
- 2 秒无消息返回空，循环重试
- block 期间协程挂起，**不占 CPU**，事件循环可跑其他协程

## 本项目应用
撮合引擎用 redis.asyncio：
- XREADGROUP 消费订单 Stream（block 等待）
- XADD 产出成交回报
- PUBLISH 行情
- SMEMBERS/HGETALL 读活跃快照重建簿
全部异步，单事件循环驱动多只股票行情 + 撮合 + 撤单并行。`,
    code: `import redis.asyncio as redis

async def consume_orders(redis, engine):
    # block=2000: 最多等 2s，期间协程挂起不占 CPU
    while True:
        resp = await redis.xreadgroup(   # await 挂起，让出执行权
            'matchers', 'matcher-1',
            {STREAM_ORDERS_NEW: '>'},
            count=10, block=2000
        )
        for msg_id, fields in resp:
            engine.match(fields)                     # 撮合（CPU，很快）
            await redis.xack(STREAM_ORDERS_NEW,      # ACK（IO，挂起）
                             'matchers', msg_id)`,
    links: [
      { title: 'redis.asyncio 使用指南 - 掘金', url: 'https://juejin.cn/post/7076282530035449869', site: '掘金' },
      { title: '异步 Redis 客户端原理 - CSDN', url: 'https://blog.csdn.net/qq_37232329/article/details/120358235', site: 'CSDN' },
    ],
  },
  {
    id: 'python-single-thread-concurrency',
    category: 'Python 异步',
    difficulty: 'expert',
    title: 'Python 单线程协程如何支撑高并发？会撞 CPU 瓶颈吗？',
    summary:
      '单线程协程靠 IO 多路复用支撑高并发连接，适合 IO 密集场景。CPU 密集任务会阻塞事件循环，应用多进程或 executor 卸载，避免拖慢所有协程。',
    answer: `## 单线程高并发的本质
高并发 ≠ 高并行。单线程协程处理的是**大量 IO 等待**的并发：
- 1 万个连接，每个 99% 时间在等网络
- 事件循环用 epoll 同时监听 1 万个 fd
- 谁就绪就调度谁的协程，CPU 实际占用很低

## 何时撞 CPU 瓶颈
- **IO 密集**（网络/磁盘等待）：协程完美，单线程撑万级并发
- **CPU 密集**（计算）：协程灾难！一个协程算 1 秒不 await，整个事件循环卡死 1 秒，所有协程都卡

## CPU 任务的卸载方案
1. **run_in_executor**：把 CPU 任务丢到线程池/进程池，不阻塞事件循环
   \`\`\`python
   result = await loop.run_in_executor(None, cpu_heavy_func, args)
   \`\`\`
2. **multiprocessing**：CPU 密集用多进程绕开 GIL 利用多核
3. **分片让出**：长任务切片，每片后 await asyncio.sleep(0) 让出一次

## 本项目情况
撮合引擎是 IO 密集（等 Redis），单协程撮合 CPU 开销极小（订单簿查找 O(log n)），不会阻塞事件循环。行情生成的随机数计算也极快。所以单线程协程完全够用。

## 经验法则
- IO 密集 → asyncio 协程
- CPU 密集 → multiprocessing 多进程
- 混合 → 协程 + executor 卸载 CPU 任务`,
    code: `import asyncio

async def cpu_task_in_executor():
    loop = asyncio.get_event_loop()
    # CPU 密集任务丢线程池，不阻塞事件循环
    result = await loop.run_in_executor(
        None,              # 默认线程池
        cpu_heavy_compute, # 同步 CPU 密集函数
        data
    )
    return result

# 分片让出：长任务切片，定期让出
async def batch_process(items):
    for i, item in enumerate(items):
        process(item)
        if i % 100 == 0:
            await asyncio.sleep(0)   # 让出一次，其他协程可执行`,
    links: [
      { title: 'Python 高并发模型选型 - 掘金', url: 'https://juejin.cn/post/6844904053585821703', site: '掘金' },
      { title: '事件循环阻塞问题 - 知乎', url: 'https://zhuanlan.zhihu.com/p/75304142', site: '知乎' },
    ],
  },
]
