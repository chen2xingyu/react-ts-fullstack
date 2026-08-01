"""成交 / 订单状态生产者：把撮合结果 XADD 到 Redis Stream

- stream:trades:done    每笔成交（Node tradeConsumer 消费 → 事务结算）
- stream:orders:status  撤单/拒绝（Node orderStatusConsumer 消费 → 释放冻结）

Stream + 消费者组保证可靠投递：消费者崩溃重启后可读 pending 重新处理，不丢消息。
"""
STREAM_TRADES_DONE = 'stream:trades:done'
STREAM_ORDERS_STATUS = 'stream:orders:status'


class TradeProducer:
    def __init__(self, redis):
        self.redis = redis

    async def publish_trade(self, trade):
        await self.redis.xadd(STREAM_TRADES_DONE, trade.to_stream())

    async def publish_order_status(self, order_id, user_id, status, unfilled_qty, reason):
        await self.redis.xadd(
            STREAM_ORDERS_STATUS,
            {
                'order_id': str(order_id),
                'user_id': str(user_id),
                'status': str(status),
                'unfilled_qty': str(unfilled_qty),
                'reason': reason,
            },
        )
