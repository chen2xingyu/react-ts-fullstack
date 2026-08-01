import { useState } from 'react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/themes/prism.css'
import { useMutation } from '@tanstack/react-query'
import { runPython, type RunResult } from '@/api/python'

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

      {/* 示例选择 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
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
