"""行情发布器：把 tick / kline / depth 推到 Redis（Pub/Sub + Hash 快照）"""
import json


class MarketPublisher:
    def __init__(self, redis):
        self.redis = redis

    async def publish_tick(self, symbol, tick):
        """PUBLISH tick + HSET 最新价快照（REST 兜底用）"""
        pipe = self.redis.pipeline()
        pipe.publish(f'ch:market:tick:{symbol}', json.dumps(tick))
        pipe.hset(
            f'quote:tick:{symbol}',
            mapping={
                'symbol': symbol,
                'last_price': tick['price'],
                'volume': tick['volume'],
                'amount': tick['amount'],
                'ts': tick['ts'],
            },
        )
        await pipe.execute()

    async def publish_kline(self, symbol, kline):
        await self.redis.publish(f'ch:market:kline:{symbol}', json.dumps(kline))

    async def publish_depth(self, symbol, depth):
        await self.redis.publish(f'ch:market:depth:{symbol}', json.dumps(depth))
