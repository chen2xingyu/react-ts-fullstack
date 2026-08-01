"""真实行情数据源：新浪实时行情接口

策略：
- 交易时段（工作日 9:30-11:30 / 13:00-15:00）：调新浪 hq.sinajs.cn 批量拉真实行情，
  发布真实 tick + K 线 + 真实五档盘口。成交量/成交额转增量（接口返回当日累计）。
- 非交易时段（周末/盘前盘后）或拉取失败：以真实收盘价为基准做 GBM 微扰动，
  保证 K 线持续滚动，价格锚定真实水平；五档用真实价合成。

选新浪而非东财/akshare 的原因：
- akshare 的 stock_zh_a_spot_em 被东财反爬断连；
- 东财 push2 全市场请求不稳定（轻量可、全量被断）；
- 新浪 hq.sinajs.cn 一次批量查多只、自带真实五档、反爬弱（仅需 Referer）、稳定。

requests 是同步库，用 asyncio.to_thread 包装避免阻塞事件循环。
"""
import asyncio
import os
import random
import re
from datetime import datetime, time as dtime

import requests

from engine.kline_builder import KlineBuilder

SINA_URL = 'https://hq.sinajs.cn/list='
HEADERS = {
    'Referer': 'https://finance.sina.com.cn',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
}
LINE_RE = re.compile(r'var hq_str_(\w+)="(.*)";')


def _sina_code(sym):
    """股票代码转新浪格式：6 开头 sh，其余 sz"""
    return ('sh' if sym.startswith('6') else 'sz') + sym


class RealtimeMarketSource:
    def __init__(self, redis, publisher):
        self.redis = redis
        self.publisher = publisher
        self.builders = {}
        self.interval = float(os.getenv('REAL_INTERVAL', '3.0'))  # 真实源轮询间隔（秒）
        self.sigma = float(os.getenv('SIGMA', '0.0015'))
        self.prices = {}          # sym -> 当前价
        self.last_volume = {}     # sym -> 上次累计成交量（股，算增量）
        self.last_amount = {}     # sym -> 上次累计成交额
        self.stocks_meta = {}     # sym -> 股票元数据
        self.sina_codes = {}      # sym -> 新浪代码

    async def run(self, stocks):
        for s in stocks:
            sym = s['symbol']
            self.builders[sym] = KlineBuilder(sym)
            self.prices[sym] = float(s['prev_close'])
            self.last_volume[sym] = 0
            self.last_amount[sym] = 0.0
            self.stocks_meta[sym] = s
            self.sina_codes[sym] = _sina_code(sym)
        print(f'[realtime] 启动新浪真实行情源：{len(stocks)} 只股票，轮询 {self.interval}s')

        # 启动时先拉一次真实行情，用真实价锚定 self.prices
        # （非交易时段新浪也返回最近交易日收盘价，作为 GBM 降级的真实基准）
        try:
            await self._poll_sina()
            print('[realtime] 启动拉取真实行情成功，价格已锚定真实水平')
        except Exception as e:
            print(f'[realtime] 启动拉取失败，用种子昨收价作基准: {e}')

        while True:
            try:
                if self._in_trading_hours():
                    await self._poll_sina()
                else:
                    await self._simulate_offhours()
            except Exception as e:
                print(f'[realtime] 拉取异常，降级 GBM: {e}')
                await self._simulate_offhours()
            await asyncio.sleep(self.interval)

    @staticmethod
    def _in_trading_hours():
        """A 股交易时段：工作日 9:30-11:30 / 13:00-15:00"""
        now = datetime.now()
        if now.weekday() >= 5:  # 周六(5)、周日(6)休市
            return False
        t = now.time()
        return dtime(9, 30) <= t <= dtime(11, 30) or dtime(13, 0) <= t <= dtime(15, 0)

    async def _poll_sina(self):
        """交易时段：批量拉新浪真实行情，发布真实 tick + 五档"""
        codes = list(self.sina_codes.values())
        text = await asyncio.to_thread(self._fetch_sina, codes)
        quotes = self._parse_sina(text)
        for sym, q in quotes.items():
            price = q['price']
            if price <= 0:
                continue
            # 成交量/成交额是当日累计，转增量（股→手）
            cum_vol = q['cum_volume']
            cum_amt = q['cum_amount']
            inc_vol = max(0, (cum_vol - self.last_volume.get(sym, 0)) // 100)
            inc_amt = max(0.0, cum_amt - self.last_amount.get(sym, 0.0))
            self.last_volume[sym] = cum_vol
            self.last_amount[sym] = cum_amt
            self.prices[sym] = price
            await self._emit(sym, price, inc_vol, inc_amt, q['depth'])

    def _fetch_sina(self, codes):
        r = requests.get(SINA_URL + ','.join(codes), headers=HEADERS, timeout=10)
        r.encoding = 'gbk'
        return r.text

    def _parse_sina(self, text):
        """解析新浪返回：fields[3]=最新价 [8]=成交量(股) [9]=成交额 [10..29]=五档"""
        quotes = {}
        for line in text.strip().split('\n'):
            m = LINE_RE.match(line.strip())
            if not m:
                continue
            sinacode, content = m.group(1), m.group(2)
            f = content.split(',')
            if len(f) < 32:
                continue
            sym = sinacode[2:]
            try:
                price = float(f[3])
                cum_vol = int(float(f[8]))
                cum_amt = float(f[9])
                # 五档：买 i 量=f[10+2(i-1)] 价=f[11+2(i-1)]；卖 i 量=f[20+2(i-1)] 价=f[21+2(i-1)]
                bids = [[float(f[11 + 2 * i]), int(float(f[10 + 2 * i])) // 100] for i in range(5)]
                asks = [[float(f[21 + 2 * i]), int(float(f[20 + 2 * i])) // 100] for i in range(5)]
            except (ValueError, IndexError):
                continue
            quotes[sym] = {
                'price': price,
                'cum_volume': cum_vol,
                'cum_amount': cum_amt,
                'depth': {
                    'bids': bids,
                    'asks': asks,
                    'ts': datetime.now().isoformat(timespec='milliseconds'),
                },
            }
        return quotes

    async def _simulate_offhours(self):
        """非交易时段：以真实收盘价为锚点 GBM 微扰动，K 线持续滚动"""
        for sym, meta in self.stocks_meta.items():
            # 锚点优先用启动时拉到的真实价，退回种子昨收价
            anchor = self.prices.get(sym, float(meta['prev_close']))
            price = self.prices.get(sym, anchor)
            # 弱均值回归（拉回真实价附近）+ 随机扰动
            drift = 0.02 * (anchor - price) / anchor if anchor else 0
            shock = random.gauss(0.0, self.sigma)
            price = round(price * (1 + drift + shock), 2)
            self.prices[sym] = price
            vol = random.randint(1, 30) * 100
            amt = round(price * vol, 2)
            await self._emit(sym, price, vol, amt, self._synth_depth(price))

    async def _emit(self, sym, price, volume, amount, depth):
        """发布 tick + 1m K 线 + 五档盘口"""
        now = datetime.now()
        await self.publisher.publish_tick(sym, {
            'symbol': sym,
            'price': price,
            'volume': volume,
            'amount': amount,
            'ts': now.isoformat(timespec='milliseconds'),
        })
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
        await self.publisher.publish_depth(sym, depth)

    @staticmethod
    def _synth_depth(mid):
        """非交易时段：基于真实价合成五档盘口"""
        spread = max(0.01, round(mid * 0.0002, 2))
        bids = [[round(mid - spread * i, 2), random.randint(1, 10) * 100] for i in range(1, 6)]
        asks = [[round(mid + spread * i, 2), random.randint(1, 10) * 100] for i in range(1, 6)]
        return {'bids': bids, 'asks': asks, 'ts': datetime.now().isoformat(timespec='milliseconds')}
