import { useState } from 'react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/themes/prism.css'
import { useMutation } from '@tanstack/react-query'
import { runPython, type RunResult } from '@/api/python'

// 一键选股脚本：新浪行情接口（与项目 realtime_source.py 同源，反爬弱稳定）
// 从 100 只沪深主流龙头股计算量比（今日成交量/5日均量），按量比降序排名
// 只用 requests + 标准库（含 concurrent.futures 并行拉K线），任意 Python 环境均可跑
const STOCK_PICKER_CODE = String.raw`import requests, re, json
from concurrent.futures import ThreadPoolExecutor, as_completed

# A股量比选股榜（新浪批量行情 + 日K线并行计算）
# 量比 = 今日成交量 / 前5日平均成交量，反映放量/缩量程度
SH = ('600519,601318,601398,601288,601988,601989,601857,600036,601628,601088,'
      '600028,601728,601688,601012,600900,601899,601658,601166,600000,601668,'
      '600276,601888,600030,601066,601225,601138,600585,601633,600438,601336,'
      '600887,600690,601390,601186,600048,601800,600016,601169,600340,601601,'
      '601919,600104,600009,601111,601016,600674,601985,600795,600023,600196')
SZ = ('000001,000002,000651,000858,002594,000333,002415,000568,002714,000063,'
      '300750,300059,000725,002475,300760,000538,002241,000776,002352,300015,'
      '002230,300124,002493,000625,300274,002129,300316,002709,300223,002405,'
      '300498,002736,000100,300433,002466,002460,002128,000635,002179,300458,'
      '002555,000999,002027,300296,002508,300285,002010,000488,002081,000050')
ALL_CODES = SH.split(',') + SZ.split(',')


def wpad(s, width, align='left'):
    """按显示宽度对齐（中文算 2 宽）"""
    s = str(s)
    w = sum(2 if ord(c) > 127 else 1 for c in s)
    pad = max(0, width - w)
    return s + ' ' * pad if align == 'left' else ' ' * pad + s


def fetch_today_sina():
    """新浪批量获取100只股票今日实时行情（价格/涨跌幅/成交量/成交额）"""
    codes = ','.join('sh' + c if c.startswith('6') else 'sz' + c for c in ALL_CODES)
    url = f'https://hq.sinajs.cn/list={codes}'
    headers = {'Referer': 'https://finance.sina.com.cn', 'User-Agent': 'Mozilla/5.0 Chrome/120.0'}
    r = requests.get(url, headers=headers, timeout=10)
    r.encoding = 'gbk'
    result = {}
    for line in r.text.strip().split('\n'):
        m = re.match(r'var hq_str_(\w+)="(.*)";', line.strip())
        if not m:
            continue
        sym = m.group(1)[2:]
        f = m.group(2).split(',')
        if len(f) < 10:
            continue
        try:
            price = float(f[3])
            last_close = float(f[2])
            vol = int(float(f[8])) // 100
            amt = float(f[9])
        except (ValueError, IndexError):
            continue
        if price <= 0:
            continue
        pct = (price - last_close) / last_close * 100 if last_close else 0
        result[sym] = {'name': f[0], 'price': price, 'pct': pct, 'vol': vol, 'amt': amt}
    return result


def fetch_kline_ratio(sym):
    """获取单只股票量比 = 今日成交量 / 前5日平均成交量"""
    prefix = 'sh' if sym.startswith('6') else 'sz'
    url = 'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData'
    params = {'symbol': f'{prefix}{sym}', 'scale': 240, 'ma': 'no', 'datalen': 6}
    headers = {'Referer': 'https://finance.sina.com.cn', 'User-Agent': 'Mozilla/5.0 Chrome/120.0'}
    try:
        r = requests.get(url, params=params, headers=headers, timeout=8)
        r.encoding = 'utf-8'
        data = json.loads(r.text)
        if len(data) >= 2:
            today_vol = int(float(data[-1]['volume']))
            hist_vols = [int(float(bar['volume'])) for bar in data[:-1]]
            avg_vol = sum(hist_vols) / len(hist_vols) if hist_vols else 0
            return sym, today_vol / avg_vol if avg_vol > 0 else 0
    except Exception:
        pass
    return sym, 0


try:
    today_data = fetch_today_sina()
    if not today_data:
        raise RuntimeError('新浪批量行情返回空数据')

    ratios = {}
    pool = list(today_data.keys())
    with ThreadPoolExecutor(max_workers=20) as ex:
        futs = {ex.submit(fetch_kline_ratio, c): c for c in pool}
        for f in as_completed(futs):
            sym, ratio = f.result()
            ratios[sym] = ratio

    rows = []
    for sym, info in today_data.items():
        r = ratios.get(sym, 0)
        if r > 0:
            rows.append({**info, 'sym': sym, 'ratio': r})
    rows.sort(key=lambda x: x['ratio'], reverse=True)
except Exception as e:
    print(f'❌ 拉取失败：{e}')
    raise SystemExit(1)

print(f'=== A股量比选股榜（{len(rows)} 只主流龙头，按量比降序）===\n')
print(f'{wpad("排名", 4, "right")} {wpad("代码", 7)} {wpad("名称", 8)}'
      f'{wpad("最新价", 9, "right")}{wpad("涨跌幅%", 9, "right")}'
      f'{wpad("量比", 6, "right")}{wpad("成交量(手)", 13, "right")}{wpad("成交额(万)", 13, "right")}')
print('-' * 74)
for i, s in enumerate(rows, 1):
    price_s = f"{s['price']:.2f}"
    pct_s = f"{s['pct']:.2f}"
    ratio_s = f"{s['ratio']:.2f}"
    vol_s = f"{s['vol']:,}"
    amt_s = f"{s['amt']/10000:,.0f}"
    print(f'{wpad(i, 4, "right")} {wpad(s["sym"], 7)} {wpad(s["name"], 8)}'
          f'{wpad(price_s, 9, "right")}{wpad(pct_s, 9, "right")}'
          f'{wpad(ratio_s, 6, "right")}{wpad(vol_s, 13, "right")}{wpad(amt_s, 13, "right")}')

print(f'\n共 {len(rows)} 只  |  量比 = 今日成交量 / 前5日平均成交量  |  数据源：新浪 hq.sinajs.cn')
`

// 内置示例代码（String.raw 保留 \n \w 等字面量，确保 Python 代码正确）
const EXAMPLES: Record<string, string> = {
  'pandas 基础': String.raw`import pandas as pd

df = pd.DataFrame({
    '代码': ['600519', '000001', '300750'],
    '名称': ['贵州茅台', '平安银行', '宁德时代'],
    '价格': [1350.6, 11.63, 395.3],
})
print('=== 股票列表 ===')
print(df.to_string(index=False))
print(f'\n平均价: {df["价格"].mean():.2f}')
print(f'最高价: {df["价格"].max()}')
`,
  '条件选股（akshare）': String.raw`import akshare as ak

# 拉全市场 A 股实时行情，选涨幅超过 5% 的股票
df = ak.stock_zh_a_spot_em()
hot = df[df['涨跌幅'] > 5][['代码', '名称', '最新价', '涨跌幅']].sort_values('涨跌幅', ascending=False)
print(f'共 {len(hot)} 只股票涨幅超过 5%：')
print(hot.to_string(index=False))
`,
  '真实行情选股（新浪）': String.raw`import requests, re

# 新浪批量拉 8 只蓝筹真实行情
codes = 'sh600519,sz000001,sz000858,sh601318,sz300750,sh600036,sz002594,sh601899'
r = requests.get(f'https://hq.sinajs.cn/list={codes}', headers={'Referer': 'https://finance.sina.com.cn'})
r.encoding = 'gbk'
stocks = []
for line in r.text.strip().split('\n'):
    m = re.match(r'var hq_str_\w+="(.*)";', line)
    if not m:
        continue
    f = m.group(1).split(',')
    if len(f) > 4 and float(f[3]) > 0:
        stocks.append({'名称': f[0], '现价': float(f[3]), '昨收': float(f[2])})
for s in stocks:
    s['涨跌幅%'] = round((s['现价'] - s['昨收']) / s['昨收'] * 100, 2)
stocks.sort(key=lambda x: x['涨跌幅%'], reverse=True)
print(f'{"名称":<8}{"现价":>10}{"涨跌幅%":>10}')
for s in stocks:
    print(f'{s["名称"]:<8}{s["现价"]:>10}{s["涨跌幅%"]:>10}')
`,
  '量比选股榜': STOCK_PICKER_CODE,
}

const MONO = 'Consolas, Monaco, "Courier New", monospace'

export default function PythonRunner() {
  const [code, setCode] = useState(EXAMPLES['pandas 基础'])
  const [result, setResult] = useState<RunResult | null>(null)

  const mut = useMutation({
    mutationFn: runPython,
    onSuccess: (res) => setResult(res.data),
    onError: (e: Error) =>
      setResult({ stdout: '', stderr: e.message, exitCode: -1, timedOut: false }),
  })

  const handleRun = () => mut.mutate(code)

  // 一键选股：载入脚本到编辑器（可见可改）并立即执行
  const handlePickStocks = () => {
    setCode(STOCK_PICKER_CODE)
    mut.mutate(STOCK_PICKER_CODE)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">🐍 Python 代码运行器</h1>
        <p className="text-sm text-gray-500 mt-1">
          粘贴 DeepSeek 给的 Python 代码（条件选股、数据分析等），点击运行查看真实结果。
          环境已装 <code className="px-1 bg-gray-100 rounded">akshare</code> /{' '}
          <code className="px-1 bg-gray-100 rounded">pandas</code> /{' '}
          <code className="px-1 bg-gray-100 rounded">numpy</code> /{' '}
          <code className="px-1 bg-gray-100 rounded">requests</code>。
        </p>
      </div>

      {/* 一键选股 + 示例选择 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          onClick={handlePickStocks}
          disabled={mut.isPending}
          className="px-4 py-1.5 text-sm rounded-md bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          title="从 100 只沪深主流龙头股计算量比（今日/5日均量），按量比降序排名，一键执行"
        >
          🔥 一键选股（量比榜）
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500">载入示例：</span>
        {Object.keys(EXAMPLES).map((name) => (
          <button
            key={name}
            onClick={() => setCode(EXAMPLES[name])}
            className="px-3 py-1 text-xs rounded-full border border-gray-200 text-gray-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-600 transition"
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 代码编辑器 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-medium text-gray-600">代码编辑区</span>
            <button
              onClick={handleRun}
              disabled={mut.isPending}
              className="px-4 py-1 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {mut.isPending ? '运行中…' : '▶ 运行'}
            </button>
          </div>
          <div className="overflow-auto max-h-[600px]" style={{ fontFamily: MONO }}>
            <Editor
              value={code}
              onValueChange={setCode}
              highlight={(c) => Prism.highlight(c, Prism.languages.python, 'python')}
              padding={12}
              className="text-sm"
              style={{ minHeight: 400, fontFamily: MONO, fontSize: 13 }}
            />
          </div>
        </div>

        {/* 结果区 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-medium text-gray-600">
              运行结果
              {result && (result.exitCode === 0 ? ' ✅' : ' ❌')}
            </span>
          </div>
          <div className="p-4 overflow-auto max-h-[600px]" style={{ fontFamily: MONO }}>
            {mut.isPending && <p className="text-gray-400 text-sm">执行中…</p>}
            {!mut.isPending && !result && (
              <p className="text-gray-400 text-sm">点击「运行」查看结果</p>
            )}
            {result && (
              <>
                {result.stdout && (
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap break-all">{result.stdout}</pre>
                )}
                {result.stderr && (
                  <pre className="text-sm text-red-600 whitespace-pre-wrap break-all mt-2">{result.stderr}</pre>
                )}
                {result.timedOut && (
                  <p className="text-orange-600 text-sm mt-2">⏱️ 执行超时（30s）已终止</p>
                )}
                {!result.stdout && !result.stderr && (
                  <p className="text-gray-400 text-sm">（无输出）</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
