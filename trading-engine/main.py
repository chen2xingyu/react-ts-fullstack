"""交易引擎入口：启动行情生成（阶段 2）。后续阶段在此 gather 撮合等任务"""
import asyncio
import os

from dotenv import load_dotenv

from transport.redis_client import get_redis
from transport.market_publisher import MarketPublisher
from engine.market_generator import MarketGenerator

load_dotenv()


async def main():
    print('=== 交易引擎启动（阶段 2：行情生成）===')
    redis = await get_redis()
    print(f'[redis] 已连接 {os.getenv("REDIS_HOST", "localhost")}:'
          f'{os.getenv("REDIS_PORT", "6379")} db={os.getenv("REDIS_DB", "0")}')

    publisher = MarketPublisher(redis)
    generator = MarketGenerator(redis, publisher)

    stocks = await generator.load_stocks()
    print(f'[generator] 加载 {len(stocks)} 只股票，开始生成行情...')

    tasks = [generator.run_one(s) for s in stocks]
    await asyncio.gather(*tasks)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n=== 交易引擎已停止 ===')
