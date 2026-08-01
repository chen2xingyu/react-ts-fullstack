"""行情生成器：几何布朗运动 + 均值回归，每秒产 tick，聚合 1m K线，合成五档"""
import asyncio
import json
import os
import random
from datetime import datetime

from engine.kline_builder import KlineBuilder

# 默认股票列表（Redis Hash trading:stocks 为空时兜底，与 server/scripts/init-trading-db.js 种子一致）
DEFAULT_STOCKS = [
    {'symbol': '600519', 'name': '贵州茅台', 'prev_close': 1680.00, 'price_limit_pct': 0.10},
    {'symbol': '000001', 'name': '平安银行', 'prev_close': 12.50, 'price_limit_pct': 0.10},
    {'symbol': '000858', 'name': '五粮液', 'prev_close': 158.00, 'price_limit_pct': 0.10},
    {'symbol': '601318', 'name': '中国平安', 'prev_close': 48.00, 'price_limit_pct': 0.10},
    {'symbol': '300750', 'name': '宁德时代', 'prev_close': 210.00, 'price_limit_pct': 0.20},
    {'symbol': '600036', 'name': '招商银行', 'prev_close': 35.00, 'price_limit_pct': 0.10},
    {'symbol': '002594', 'name': '比亚迪', 'prev_close': 245.00, 'price_limit_pct': 0.10},
    {'symbol': '601899', 'name': '紫金矿业', 'prev_close': 15.00, 'price_limit_pct': 0.10},
]


class MarketGenerator:
    def __init__(self, redis, publisher):
        self.redis = redis
        self.publisher = publisher
        self.builders = {}
        self.tick_interval = float(os.getenv('TICK_INTERVAL', '1.0'))
        self.sigma = float(os.getenv('SIGMA', '0.0015'))
        self.kappa = float(os.getenv('KAPPA', '0.05'))

    async def load_stocks(self):
        """优先从 Redis Hash 读股票元数据，为空则用默认列表"""
        stocks = []
        try:
            raw = await self.redis.hgetall('trading:stocks')
            if raw:
                for val in raw.values():
                    stocks.append(json.loads(val))
        except Exception as e:
            print(f'[generator] 读取 trading:stocks 失败，使用默认列表: {e}')
        if not stocks:
            stocks = DEFAULT_STOCKS
            print('[generator] Redis 无股票元数据，使用默认 8 只')
        return stocks

    async def run_one(self, stock):
        sym = stock['symbol']
        name = stock.get('name', '')
        prev_close = float(stock['prev_close'])
        limit = float(stock['price_limit_pct'])
        up_limit = round(prev_close * (1 + limit), 2)
        down_limit = round(prev_close * (1 - limit), 2)
        price = prev_close
        self.builders[sym] = KlineBuilder(sym)
        print(f'[generator] {sym} {name} 启动 行情 '
              f'prev_close={prev_close} 涨停={up_limit} 跌停={down_limit}')

        while True:
            # 均值回归项（向昨收回归）+ 随机扰动项（几何布朗运动）
            drift = self.kappa * (prev_close - price) / prev_close
            shock = random.gauss(0.0, self.sigma)
            price = price * (1 + drift + shock)
            price = round(min(max(price, down_limit), up_limit), 2)

            volume = random.randint(1, 50) * 100  # 按手（100股）
            amount = round(price * volume, 2)
            now = datetime.now()

            tick = {
                'symbol': sym,
                'price': price,
                'volume': volume,
                'amount': amount,
                'ts': now.isoformat(timespec='milliseconds'),
            }
            await self.publisher.publish_tick(sym, tick)

            # K 线实时更新
            bar = self.builders[sym].update(price, volume, amount, now)
            await self.publisher.publish_kline(sym, {
                'symbol': sym,
                'period': '1m',
                'ts': bar['ts'].isoformat(),
                'open': bar['open'],
                'high': bar['high'],
                'low': bar['low'],
                'close': bar['close'],
                'volume': bar['volume'],
                'amount': bar['amount'],
            })

            # 合成五档（真实订单簿五档在阶段 4 撮合引擎中产生）
            await self.publisher.publish_depth(sym, self._synth_depth(price))

            await asyncio.sleep(self.tick_interval)

    @staticmethod
    def _synth_depth(mid):
        spread = max(0.01, round(mid * 0.0002, 2))
        bids = []
        asks = []
        for i in range(1, 6):
            bids.append([round(mid - spread * i, 2), random.randint(1, 10) * 100])
            asks.append([round(mid + spread * i, 2), random.randint(1, 10) * 100])
        return {
            'bids': bids,
            'asks': asks,
            'ts': datetime.now().isoformat(timespec='milliseconds'),
        }
