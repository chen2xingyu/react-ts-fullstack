"""委托订单数据类

字段与 server 落库的 orders 表对齐（仅保留撮合所需字段）。
Python 撮合引擎不直连 MySQL，订单由 order_consumer 从 Redis Stream 读出再构造。
"""
from dataclasses import dataclass, field

# 与 server/config/trading.js 常量保持一致
SIDE_BUY = 1
SIDE_SELL = 2
TYPE_LIMIT = 1
TYPE_MARKET = 2


@dataclass
class Order:
    order_id: int
    user_id: int
    symbol: str
    side: int            # 1 买 2 卖
    order_type: int      # 1 限价 2 市价
    quantity: int        # 剩余未成交数量（撮合过程中递减）
    original_qty: int    # 原始委托数量
    price: float = 0.0   # 限价单价格；市价单为 0
    seq: int = 0         # 进入订单簿的序号，用于"时间优先"
    active: bool = True  # 是否仍在簿中（撮合后被移除置 False）

    @property
    def is_buy(self) -> bool:
        return self.side == SIDE_BUY

    @property
    def is_limit(self) -> bool:
        return self.order_type == TYPE_LIMIT

    @staticmethod
    def from_stream(fields: dict) -> 'Order':
        """从 Redis Stream 的 field-value 字典构造订单"""
        return Order(
            order_id=int(fields['order_id']),
            user_id=int(fields['user_id']),
            symbol=fields['symbol'],
            side=int(fields['side']),
            order_type=int(fields['order_type']),
            quantity=int(fields['quantity']),
            original_qty=int(fields['quantity']),
            price=float(fields['price']) if fields.get('price') else 0.0,
        )
