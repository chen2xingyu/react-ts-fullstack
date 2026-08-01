"""订单消费者：XREADGROUP 消费新订单 Stream，喂给撮合引擎

消费者组 matchers：崩溃重启后可用 XPENDING 恢复未 ACK 的消息，保证不丢单。
"""
import asyncio

from models.order import Order

STREAM_ORDERS_NEW = 'stream:orders:new'
GROUP_MATCHERS = 'matchers'
CONSUMER_NAME = 'matcher-1'


class OrderConsumer:
    def __init__(self, redis, engine):
        self.redis = redis
        self.engine = engine

    async def _ensure_group(self):
        try:
            await self.redis.xgroup_create(STREAM_ORDERS_NEW, GROUP_MATCHERS, id='0', mkstream=True)
            print(f'[matcher] 创建消费者组 {GROUP_MATCHERS}')
        except Exception as e:
            # BUSYGROUP: 组已存在，忽略
            if 'BUSYGROUP' not in str(e):
                print(f'[matcher] 创建消费者组警告: {e}')

    async def run(self):
        await self._ensure_group()
        print(f'[matcher] 开始消费 {STREAM_ORDERS_NEW} (consumer={CONSUMER_NAME})')
        while True:
            try:
                resp = await self.redis.xreadgroup(
                    GROUP_MATCHERS,
                    CONSUMER_NAME,
                    {STREAM_ORDERS_NEW: '>'},
                    count=10,
                    block=2000,
                )
            except Exception as e:
                print(f'[matcher] XREADGROUP 异常: {e}')
                await asyncio.sleep(1)
                continue

            if not resp:
                continue

            for _stream, messages in resp:
                for msg_id, fields in messages:
                    try:
                        order = Order.from_stream(fields)
                        trades, cancels = await self.engine.on_order(order)
                        if trades or cancels:
                            print(f'[matcher] 订单 {order.order_id} {order.symbol} '
                                  f'{"买" if order.is_buy else "卖"} {order.original_qty}'
                                  f' → 成交 {len(trades)} 笔, 撤单 {len(cancels)} 笔')
                    except Exception as e:
                        # 单条解析/撮合异常不阻断消费；ACK 掉避免毒丸阻塞
                        print(f'[matcher] 订单处理异常 msg={msg_id}: {e}')
                    finally:
                        await self.redis.xack(STREAM_ORDERS_NEW, GROUP_MATCHERS, msg_id)
