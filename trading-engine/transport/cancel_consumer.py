"""撤单消费者（阶段 5）：XREADGROUP 消费撤单 Stream，交给撮合引擎从簿中移除

消费者组 cancellers：崩溃重启后用 XPENDING+XCLAIM 回收未 ACK 的撤单指令（阶段 6 容灾），
避免撤单请求因崩溃丢失。与 order_consumer 互不干扰。
（XAUTOCLAIM 为 Redis 6.2+ 命令，本机 Redis 5.0 不支持，故用 XPENDING+XCLAIM 替代）
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

    async def _handle(self, fields):
        order_id = int(fields['order_id'])
        user_id = int(fields['user_id'])
        symbol = fields['symbol']
        await self.engine.on_cancel(order_id, user_id, symbol)

    async def _drain_pending(self):
        """阶段 6 容灾：回收本消费者崩溃前未 ACK 的 pending 撤单指令

        Redis 5.0 无 XAUTOCLAIM，用 XPENDING_RANGE 列出 pending id，再 XCLAIM 取回字段处理。
        """
        try:
            pending = await self.redis.xpending_range(
                STREAM_ORDERS_CANCEL, GROUP_CANCELLERS, min='-', max='+', count=100,
                consumername=CONSUMER_NAME,
            )
            if not pending:
                return
            ids = [p['message_id'] for p in pending]
            claimed = await self.redis.xclaim(
                STREAM_ORDERS_CANCEL, GROUP_CANCELLERS, CONSUMER_NAME,
                min_idle_time=0, message_ids=ids,
            )
            for msg_id, fields in claimed:
                try:
                    await self._handle(fields)
                except Exception as e:
                    print(f'[canceller] pending 处理异常 msg={msg_id}: {e}')
                finally:
                    await self.redis.xack(
                        STREAM_ORDERS_CANCEL, GROUP_CANCELLERS, msg_id
                    )
            print(f'[canceller] pending 回收 {len(claimed)} 条')
        except Exception as e:
            print(f'[canceller] pending 回收异常: {e}')

    async def run(self):
        await self._ensure_group()
        await self._drain_pending()  # 阶段 6：先回收 pending
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
                        await self._handle(fields)
                    except Exception as e:
                        # 单条异常不阻断消费；ACK 掉避免毒丸阻塞
                        print(f'[canceller] 撤单处理异常 msg={msg_id}: {e}')
                    finally:
                        await self.redis.xack(
                            STREAM_ORDERS_CANCEL, GROUP_CANCELLERS, msg_id
                        )
