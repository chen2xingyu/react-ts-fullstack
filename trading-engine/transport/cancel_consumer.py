"""撤单消费者（阶段 5）：XREADGROUP 消费撤单 Stream，交给撮合引擎从簿中移除

消费者组 cancellers：崩溃重启后可读 pending 重新处理，撤单指令不丢。
与 order_consumer 互不干扰：撤单针对已在簿的挂单，与新增订单流时序无关。
"""
import asyncio

STREAM_ORDERS_CANCEL = 'stream:orders:cancel'
GROUP_CANCELLERS = 'cancellers'
CONSUMER_NAME = 'canceller-1'


class CancelConsumer:
    def __init__(self, redis, engine):
        self.redis = redis
        self.engine = engine

    async def _ensure_group(self):
        try:
            await self.redis.xgroup_create(
                STREAM_ORDERS_CANCEL, GROUP_CANCELLERS, id='0', mkstream=True
            )
            print(f'[canceller] 创建消费者组 {GROUP_CANCELLERS}')
        except Exception as e:
            # BUSYGROUP: 组已存在，忽略
            if 'BUSYGROUP' not in str(e):
                print(f'[canceller] 创建消费者组警告: {e}')

    async def run(self):
        await self._ensure_group()
        print(f'[canceller] 开始消费 {STREAM_ORDERS_CANCEL} (consumer={CONSUMER_NAME})')
        while True:
            try:
                resp = await self.redis.xreadgroup(
                    GROUP_CANCELLERS,
                    CONSUMER_NAME,
                    {STREAM_ORDERS_CANCEL: '>'},
                    count=10,
                    block=2000,
                )
            except Exception as e:
                print(f'[canceller] XREADGROUP 异常: {e}')
                await asyncio.sleep(1)
                continue

            if not resp:
                continue

            for _stream, messages in resp:
                for msg_id, fields in messages:
                    try:
                        order_id = int(fields['order_id'])
                        user_id = int(fields['user_id'])
                        symbol = fields['symbol']
                        await self.engine.on_cancel(order_id, user_id, symbol)
                    except Exception as e:
                        # 单条异常不阻断消费；ACK 掉避免毒丸阻塞
                        print(f'[canceller] 撤单处理异常 msg={msg_id}: {e}')
                    finally:
                        await self.redis.xack(
                            STREAM_ORDERS_CANCEL, GROUP_CANCELLERS, msg_id
                        )
