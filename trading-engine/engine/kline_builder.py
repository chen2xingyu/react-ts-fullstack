"""tick -> 1m OHLCV 聚合器"""
from datetime import datetime


class KlineBuilder:
    """每只股票一个实例，把逐笔 tick 聚合成 1 分钟 K 线"""

    def __init__(self, symbol):
        self.symbol = symbol
        self.current = None  # 当前进行中的 1m bar

    @staticmethod
    def _minute_floor(dt):
        return dt.replace(second=0, microsecond=0)

    def update(self, price, volume, amount, now=None):
        """用一笔 tick 更新当前 bar，返回当前 bar 快照（供实时推送）"""
        now = now or datetime.now()
        bar_ts = self._minute_floor(now)

        if self.current is None or bar_ts > self.current['ts']:
            # 新周期开始
            self.current = {
                'ts': bar_ts,
                'open': price,
                'high': price,
                'low': price,
                'close': price,
                'volume': volume,
                'amount': amount,
            }
        else:
            # 同一分钟内，更新 OHLCV
            self.current['high'] = max(self.current['high'], price)
            self.current['low'] = min(self.current['low'], price)
            self.current['close'] = price
            self.current['volume'] += volume
            self.current['amount'] += amount

        return dict(self.current)
