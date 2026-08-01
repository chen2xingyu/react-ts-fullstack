"""交易引擎入口：行情生成 + 撮合引擎并行运行

asyncio.gather 同时驱动两条任务：
- 行情：MarketGenerator 每秒产 tick/kline/depth，PUBLISH 到 Redis
- 撮合：OrderConsumer 消费 stream:orders:new，撮合后 XADD 成交/撤单到 Redis
"""
import asyncio
import os

from dotenv import load_dotenv

from transport.redis_client import get_redis
from transport.market_publisher import MarketPublisher
from transport.trade_producer import TradeProducer
from transport.order_consumer import OrderConsumer
from engine.market_generator import MarketGenerator
from engine.matching_engine import MatchingEngine

load_dotenv()


async def main():
    print('=== 交易引擎启动（行情 + 撮合）===')
    redis = await get_redis()
    print(f'[redis] 已连接 {os.getenv("REDIS_HOST", "localhost")}:'
          f'{os.getenv("REDIS_PORT", "6379")} db={os.getenv("REDIS_DB", "0")}')

    # 行情
    publisher = MarketPublisher(redis)
    generator = MarketGenerator(redis, publisher)
    stocks = await generator.load_stocks()
    print(f'[generator] 加载 {len(stocks)} 只股票，开始生成行情...')

    # 撮合
    producer = TradeProducer(redis)
    engine = MatchingEngine(producer)
    consumer = OrderConsumer(redis, engine)

    market_tasks = [generator.run_one(s) for s in stocks]
    match_task = consumer.run()

    # 行情（每只股票一个协程）+ 撮合（单消费者协程）并行
    await asyncio.gather(*market_tasks, match_task)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n=== 交易引擎已停止 ===')
