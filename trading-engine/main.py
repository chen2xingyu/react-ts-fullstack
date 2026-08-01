"""交易引擎入口：行情生成 + 撮合引擎并行运行

asyncio.gather 同时驱动两条任务：
- 行情：MarketGenerator 每秒产 tick/kline/depth，PUBLISH 到 Redis
- 撮合：OrderConsumer 消费 stream:orders:new，撮合后 XADD 成交/撤单到 Redis

阶段 6 容灾：启动时先从 Redis 活跃快照重建订单簿（再消费 Stream），崩溃重启不丢挂单。
"""
import asyncio
import os

from dotenv import load_dotenv

from transport.redis_client import get_redis
from transport.market_publisher import MarketPublisher
from transport.trade_producer import TradeProducer
from transport.order_consumer import OrderConsumer
from transport.cancel_consumer import CancelConsumer
from engine.market_generator import MarketGenerator
from engine.matching_engine import MatchingEngine

load_dotenv()

# 阶段 6 容灾：与 server/config/trading.js CHANNELS 对齐
SET_ORDERS_ACTIVE = 'orders:active'
HASH_ORDER_ACTIVE = lambda oid: f'orders:active:{oid}'


async def load_active_orders(redis):
    """从 Redis 加载所有活跃限价单快照（Node 维护，用于重建簿）"""
    ids = await redis.smembers(SET_ORDERS_ACTIVE)
    orders = []
    for oid in ids:
        f = await redis.hgetall(HASH_ORDER_ACTIVE(oid))
        if f:
            orders.append(f)
    return orders


async def main():
    print('=== 交易引擎启动（行情 + 撮合）===')
    redis = await get_redis()
    print(f'[redis] 已连接 {os.getenv("REDIS_HOST", "localhost")}:'
          f'{os.getenv("REDIS_PORT", "6379")} db={os.getenv("REDIS_DB", "0")}')

    # 行情
    publisher = MarketPublisher(redis)
    generator = MarketGenerator(redis, publisher)
    stocks = await generator.load_stocks()
    print(f'[generator] 加载 {len(stocks)} 只股票')

    # 撮合
    producer = TradeProducer(redis)
    engine = MatchingEngine(producer)

    # 阶段 6 容灾：先从活跃快照重建簿，再启动消费者（seen_ids 先就位以去重 Stream 重投递）
    active = await load_active_orders(redis)
    rebuilt = engine.rebuild_from_active(active)
    print(f'[matcher] 阶段 6 容灾：从快照重建 {rebuilt} 笔挂单')

    consumer = OrderConsumer(redis, engine)
    cancel_consumer = CancelConsumer(redis, engine)

    # 行情源切换：MARKET_SOURCE=real 用 AKShare 真实行情（非交易时段 GBM 降级）；
    # 默认 sim 用几何布朗运动模拟
    market_source = os.getenv('MARKET_SOURCE', 'sim').lower()
    if market_source == 'real':
        from engine.realtime_source import RealtimeMarketSource
        source = RealtimeMarketSource(redis, publisher)
        market_task = source.run(stocks)
        print('[main] 行情源：AKShare 真实行情（交易时段拉东财，非交易时段 GBM 降级）')
    else:
        market_task = asyncio.gather(*[generator.run_one(s) for s in stocks])
        print('[main] 行情源：几何布朗运动模拟（MARKET_SOURCE=real 可切换真实行情）')

    match_task = consumer.run()
    cancel_task = cancel_consumer.run()

    # 行情 + 撮合 + 撤单（阶段 5）并行
    await asyncio.gather(market_task, match_task, cancel_task)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n=== 交易引擎已停止 ===')
