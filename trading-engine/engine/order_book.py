"""订单簿：价格优先 + 时间优先，自成交防范

设计要点：
- 不依赖第三方包，用 bisect 维护有序价格列表 + dict[price] -> deque[Order]
  bids 降序（买价高的优先）：取末位最大
  asks 升序（卖价低的优先）：取首位最小
- 时间优先：同价位按进入订单簿的 seq 升序（FIFO），deque 左进左出
- 撮合价格取 maker（挂单方）价格
- 自成交防范：incoming 与同 user 的挂单相遇时，撤掉挂单（emit cancel），继续撮合 incoming

match() 返回 (trades, cancels)：
  trades:  本次产生的成交（由 trade_producer 写 stream:trades:done）
  cancels: 被撤销的挂单/未成交余额（由 order_status 写 stream:orders:status）
"""
import bisect
from collections import deque
from models.order import Order, SIDE_BUY, TYPE_MARKET
from models.trade import Trade, SIDE_BUY as TRADE_BUY, SIDE_SELL as TRADE_SELL


class OrderBook:
    def __init__(self, symbol, trade_seq_holder):
        self.symbol = symbol
        # price -> deque[Order]
        self.bids = {}        # 买单
        self.asks = {}        # 卖单
        self.bid_prices = []  # 升序（best = 末位）
        self.ask_prices = []  # 升序（best = 首位）
        self._trade_seq_holder = trade_seq_holder  # 共享成交序号生成器

    @property
    def best_bid(self):
        return self.bid_prices[-1] if self.bid_prices else None

    @property
    def best_ask(self):
        return self.ask_prices[0] if self.ask_prices else None

    def _add(self, order):
        book = self.bids if order.is_buy else self.asks
        prices = self.bid_prices if order.is_buy else self.ask_prices
        p = order.price
        lvl = book.get(p)
        if lvl is None:
            book[p] = lvl = deque()
            bisect.insort(prices, p)
        lvl.append(order)

    def _pop_resting(self, is_buy, price):
        """弹出指定价位的队首挂单；价位空了则清理"""
        book = self.bids if is_buy else self.asks
        prices = self.bid_prices if is_buy else self.ask_prices
        lvl = book.get(price)
        if not lvl:
            return None
        order = lvl.popleft()
        if not lvl:
            del book[price]
            idx = bisect.bisect_left(prices, price)
            if idx < len(prices) and prices[idx] == price:
                prices.pop(idx)
        return order

    def _put_back_front(self, order):
        """把部分成交后的挂单放回其价位队首（价位已被清理则重建）"""
        book = self.bids if order.is_buy else self.asks
        prices = self.bid_prices if order.is_buy else self.ask_prices
        p = order.price
        lvl = book.get(p)
        if lvl is None:
            book[p] = lvl = deque()
            bisect.insort(prices, p)
        lvl.appendleft(order)

    def match(self, incoming):
        """撮合 incoming 订单，返回 (trades, cancels)"""
        trades = []
        cancels = []

        while incoming.quantity > 0:
            if incoming.is_buy:
                best = self.best_ask
                if best is None:
                    break
                # 限价买：对方最优卖价须 <= 委托价
                if incoming.is_limit and best > incoming.price + 1e-9:
                    break
                resting = self._pop_resting(is_buy=False, price=best)
                self._cross(incoming, resting, trades, cancels)
            else:
                best = self.best_bid
                if best is None:
                    break
                # 限价卖：对方最优买价须 >= 委托价
                if incoming.is_limit and best < incoming.price - 1e-9:
                    break
                resting = self._pop_resting(is_buy=True, price=best)
                self._cross(incoming, resting, trades, cancels)

        # 未成交余额处理
        if incoming.quantity > 0:
            if incoming.is_limit:
                # 限价单挂簿等待
                incoming.active = True
                self._add(incoming)
            else:
                # 市价单余额不能挂簿，撤销
                incoming.active = False
                cancels.append({
                    'order_id': incoming.order_id,
                    'user_id': incoming.user_id,
                    'unfilled_qty': incoming.quantity,
                    'reason': 'market_unfilled',
                })
        return trades, cancels

    def _cross(self, incoming, resting, trades, cancels):
        """incoming 与一个挂单成交（或因自成交撤销挂单）"""
        # 自成交防范：撤销挂单，继续撮合 incoming
        if resting.user_id == incoming.user_id:
            resting.active = False
            cancels.append({
                'order_id': resting.order_id,
                'user_id': resting.user_id,
                'unfilled_qty': resting.quantity,
                'reason': 'self_trade',
            })
            return

        fill_qty = min(incoming.quantity, resting.quantity)
        price = resting.price  # maker 价
        amount = round(price * fill_qty, 4)

        if incoming.is_buy:
            buy_order, sell_order = incoming, resting
            active_side = TRADE_BUY
        else:
            buy_order, sell_order = resting, incoming
            active_side = TRADE_SELL

        self._trade_seq_holder[0] += 1
        trade = Trade(
            trade_no=Trade.make_no(self._trade_seq_holder[0]),
            symbol=self.symbol,
            buy_order_id=buy_order.order_id,
            sell_order_id=sell_order.order_id,
            buyer_id=buy_order.user_id,
            seller_id=sell_order.user_id,
            side=active_side,
            price=price,
            quantity=fill_qty,
            amount=amount,
            ts=int(__import__('time').time() * 1000),
        )
        trades.append(trade)

        incoming.quantity -= fill_qty
        resting.quantity -= fill_qty
        if resting.quantity <= 0:
            resting.active = False
        else:
            # 挂单未吃完，重新放回队首（保持时间优先）
            self._put_back_front(resting)

    def top_levels(self, n=5):
        """五档快照（阶段 5 联动用）"""
        bids = []
        for p in reversed(self.bid_prices[-n:]):
            qty = sum(o.quantity for o in self.bids[p])
            bids.append([p, qty])
        asks = []
        for p in self.ask_prices[:n]:
            qty = sum(o.quantity for o in self.asks[p])
            asks.append([p, qty])
        return {'bids': bids, 'asks': asks}
