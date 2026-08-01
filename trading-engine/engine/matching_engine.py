"""撮合引擎：维护各 symbol 的订单簿，接收新订单并撮合

职责：
- 每只股票一个 OrderBook
- 收到新订单 → 委托对应订单簿撮合 → 产出成交 + 撤单事件
- 成交写 stream:trades:done，撤单写 stream:orders:status（均由 producer 落 Redis）
- 与行情/数据库完全解耦：只读写 Redis Stream
"""
from engine.order_book import OrderBook
from models.order import Order


class MatchingEngine:
    def __init__(self, producer):
        self.producer = producer
        self.books = {}                 # symbol -> OrderBook
        self._trade_seq = [0]           # 共享成交序号（list 便于内层引用）

    def _book(self, symbol):
        book = self.books.get(symbol)
        if book is None:
            book = OrderBook(symbol, self._trade_seq)
            self.books[symbol] = book
        return book

    async def on_order(self, order: Order):
        """处理一笔新订单：撮合 + 发布成交/撤单事件"""
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
