"""成交数据类

字段与 server 落库的 trades 表对齐。由撮合引擎产生，trade_producer 写入
Redis Stream `stream:trades:done`，Node.js tradeConsumer 消费后事务结算。
"""
import time
from dataclasses import dataclass, asdict

SIDE_BUY = 1   # 主动方为买
SIDE_SELL = 2  # 主动方为卖


@dataclass
class Trade:
    trade_no: str
    symbol: str
    buy_order_id: int
    sell_order_id: int
    buyer_id: int
    seller_id: int
    side: int        # 主动方方向（incoming 的方向）
    price: float
    quantity: int
    amount: float
    ts: int          # 毫秒时间戳

    def to_stream(self) -> dict:
        """转为 Redis Stream field-value（值需为字符串）"""
        d = asdict(self)
        return {k: str(v) for k, v in d.items()}

    @staticmethod
    def make_no(seq: int) -> str:
        """生成成交编号：T + 毫秒时间戳 + 序号"""
        return f'T{int(time.time() * 1000)}{seq:06d}'
