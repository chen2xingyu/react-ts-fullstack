"""撮合引擎：维护各 symbol 的订单簿，接收新订单并撮合

职责：
- 每只股票一个 OrderBook
- 收到新订单 → 委托对应订单簿撮合 → 产出成交 + 撤单事件
- 成交写 stream:trades:done，撤单写 stream:orders:status（均由 producer 落 Redis）
- 与行情/数据库完全解耦：只读写 Redis Stream

阶段 6 容灾：
- seen_ids 记录已处理/已重建的 order_id，Stream 重投递时去重（快照重建后旧消息重复）
- rebuild_from_active 从 Node 维护的活跃快照重建订单簿，崩溃重启不丢挂单
"""
from engine.order_book import OrderBook
from models.order import Order, TYPE_LIMIT


class MatchingEngine:
    def __init__(self, producer):
        self.producer = producer
        self.books = {}                 # symbol -> OrderBook
        self._trade_seq = [0]           # 共享成交序号（list 便于内层引用）
        self.seen_ids = set()           # 已处理订单 id（去重 + 重建标记）

    def _book(self, symbol):
        book = self.books.get(symbol)
        if book is None:
            book = OrderBook(symbol, self._trade_seq)
            self.books[symbol] = book
        return book

    async def on_order(self, order: Order):
        """处理一笔新订单：撮合 + 发布成交/撤单事件"""
        # 阶段 6 容灾去重：重启后已从快照重建的挂单，其 Stream 消息重投递时跳过
        if order.order_id in self.seen_ids:
            print(f'[matcher] 跳过重复订单 #{order.order_id}（已从快照重建）')
            return [], []
        self.seen_ids.add(order.order_id)

        book = self._book(order.symbol)
        trades, cancels = book.match(order)

        for trade in trades:
            await self.producer.publish_trade(trade)

        for ev in cancels:
            # ev: {order_id, user_id, unfilled_qty, reason}
            await self.producer.publish_order_status(
                order_id=ev['order_id'],
                user_id=ev['user_id'],
                status=3,  # CANCELED
                unfilled_qty=ev['unfilled_qty'],
                reason=ev['reason'],
            )

        # incoming 限价单若已全部成交，无需额外事件（Node 据成交累计推导状态）
        return trades, cancels

    async def on_cancel(self, order_id, user_id, symbol):
        """处理用户撤单（阶段 5）：从簿中移除挂单 → 产出 status 事件

        引擎是订单簿的唯一权威：unfilled_qty 取自簿中剩余量（撮合中递减过的
        order.quantity），而非后端 DB 的 filled_quantity（可能因成交回报在途而滞后）。
        - 找到并撤销（unfilled>0）：写 stream:orders:status，Node 释放冻结 + 置 CANCELED
        - 未在簿中（unfilled=0，已成交/已撤）：不产出事件，委托单状态由成交回报推导
        """
        book = self._book(symbol)
        unfilled = book.cancel(order_id)
        if unfilled > 0:
            await self.producer.publish_order_status(
                order_id=order_id,
                user_id=user_id,
                status=3,  # CANCELED
                unfilled_qty=unfilled,
                reason='user_cancel',
            )
            print(f'[matcher] 撤单 #{order_id} {symbol} 释放剩余 {unfilled}')
        else:
            print(f'[matcher] 撤单 #{order_id} {symbol} 未在簿中（已成交/已撤），跳过')
        return unfilled

    def rebuild_from_active(self, orders_data):
        """阶段 6 容灾：从 Node 活跃快照重建订单簿

        orders_data: list[dict] 各含 order_id/user_id/symbol/side/order_type/price/quantity/filled_quantity
        - 仅限价单入簿（市价单不挂簿）
        - remaining = quantity - filled_quantity；按 order_id 升序重建保持时间优先
        - 全部加入 seen_ids，避免后续 Stream 重投递导致重复入簿
        """
        orders_data = sorted(orders_data, key=lambda x: int(x['order_id']))
        count = 0
        for f in orders_data:
            order_type = int(f.get('order_type', 0))
            if order_type != TYPE_LIMIT:
                continue
            remaining = int(f['quantity']) - int(f.get('filled_quantity', 0))
            if remaining <= 0:
                continue
            order = Order(
                order_id=int(f['order_id']),
                user_id=int(f['user_id']),
                symbol=f['symbol'],
                side=int(f['side']),
                order_type=order_type,
                quantity=remaining,
                original_qty=int(f['quantity']),
                price=float(f['price']) if f.get('price') else 0.0,
            )
            order.active = True
            self._book(order.symbol)._add(order)
            self.seen_ids.add(order.order_id)
            count += 1
        return count
