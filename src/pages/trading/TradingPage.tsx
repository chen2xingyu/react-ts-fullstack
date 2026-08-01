import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AccountBar from '@/components/trading/AccountBar'
import KLineChart from '@/components/trading/KLineChart'
import DepthBook from '@/components/trading/DepthBook'
import OrderForm, { type PickedPrice } from '@/components/trading/OrderForm'
import OrderList from '@/components/trading/OrderList'
import TradeList from '@/components/trading/TradeList'
import { useMarketSocket, type Tick, type UserNotify } from '@/hooks/useMarketSocket'
import { getAccount, getStocks, getPositions, getKlines } from '@/api/trading'
import type { Stock, Position, Kline } from '@/types/trading'

/**
 * 证券交易系统主页面
 * 阶段 1：资金条 + 股票选择器 + 持仓（真实接口）
 * 阶段 2：K线图 + 五档盘口 + 实时行情（WebSocket）
 * 后续：下单(3) / 委托(3) / 成交(4) 逐步填充
 */
export default function TradingPage() {
  const [symbol, setSymbol] = useState<string>('')
  // 阶段 5：五档点价 → 下单面板（nonce 保证连点同一档也能触发填充）
  const [pickedPrice, setPickedPrice] = useState<PickedPrice | undefined>()
  const qc = useQueryClient()

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['trading', 'account'],
    queryFn: getAccount,
  })

  const { data: stocks } = useQuery<Stock[]>({
    queryKey: ['trading', 'stocks'],
    queryFn: getStocks,
  })

  const { data: positions } = useQuery<Position[]>({
    queryKey: ['trading', 'positions'],
    queryFn: getPositions,
  })

  const current = stocks?.find((s) => s.symbol === symbol) || stocks?.[0]
  const currentSymbol = current?.symbol

  // 切换标的时清空点价（OrderForm 因 key 变化已重置内部价格）
  useEffect(() => {
    setPickedPrice(undefined)
  }, [currentSymbol])

  // K线历史（首次拉取，后续由 WS 实时更新）
  const { data: klineHistory } = useQuery<Kline[]>({
    queryKey: ['trading', 'klines', currentSymbol],
    queryFn: () => getKlines(currentSymbol!, { period: '1m', limit: 500 }),
    enabled: !!currentSymbol,
  })

  // 实时行情
  const { connected, tick, kline, depth } = useMarketSocket(currentSymbol, handleNotify)

  // 阶段 5：五档点价 → 写入 pickedPrice（nonce 自增，连点同价也能触发 effect）
  const handlePickPrice = (price: number) => {
    setPickedPrice({ value: price, nonce: Date.now() })
  }

  // 阶段 5：收到撤单/成交通知 → 即时失效相关查询（无需等 3s 轮询）
  function handleNotify(n: UserNotify) {
    if (n.type === 'order_status') {
      // 撤单状态变更：委托 + 资金 + 持仓都可能变
      qc.invalidateQueries({ queryKey: ['trading', 'orders'] })
      qc.invalidateQueries({ queryKey: ['trading', 'account'] })
      qc.invalidateQueries({ queryKey: ['trading', 'positions'] })
    } else if (n.type === 'trade') {
      // 成交回报：委托 + 成交 + 资金 + 持仓
      qc.invalidateQueries({ queryKey: ['trading', 'orders'] })
      qc.invalidateQueries({ queryKey: ['trading', 'trades'] })
      qc.invalidateQueries({ queryKey: ['trading', 'account'] })
      qc.invalidateQueries({ queryKey: ['trading', 'positions'] })
    }
  }

  return (
    <div className="space-y-4">
      {/* 标题 + 连接状态 + 股票选择器 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📊 证券交易系统</h1>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1 text-xs ${
              connected ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            {connected ? '行情已连接' : '行情断开'}
          </span>
          <select
            value={currentSymbol || ''}
            onChange={(e) => setSymbol(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {stocks?.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 资金条 */}
      <AccountBar account={account} loading={accountLoading} />

      {/* 当前股票信息（含实时价/涨跌） */}
      {current && <StockInfo stock={current} tick={tick} />}

      {/* 主区域：K线 + 五档 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <KLineChart symbol={currentSymbol} kline={kline} history={klineHistory ?? []} />
        </div>
        <DepthBook depth={depth} lastPrice={tick?.price} onPickPrice={handlePickPrice} />
      </div>

      {/* 下单 + 委托（阶段 3） */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <OrderForm
          key={currentSymbol}
          symbol={currentSymbol}
          stock={current}
          lastPrice={tick?.price}
          account={account}
          positions={positions}
          pickedPrice={pickedPrice}
        />
        <div className="lg:col-span-2">
          <OrderList />
        </div>
      </div>

      {/* 持仓列表（阶段 1 真实数据） */}
      <PositionList positions={positions} />

      {/* 成交列表（阶段 4：Python 撮合 → Node 结算落库） */}
      <TradeList />
    </div>
  )
}

/** 当前股票元数据 + 实时价条 */
function StockInfo({ stock, tick }: { stock: Stock; tick: Tick | null }) {
  const limitPct = (Number(stock.price_limit_pct) * 100).toFixed(1)
  const prevClose = Number(stock.prev_close)
  const price = tick ? tick.price : prevClose
  const change = price - prevClose
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0
  const upLimit = (prevClose * (1 + Number(stock.price_limit_pct))).toFixed(2)
  const downLimit = (prevClose * (1 - Number(stock.price_limit_pct))).toFixed(2)
  const priceColor =
    change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-900'

  return (
    <div className="card flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-gray-900">{stock.name}</span>
        <span className="text-gray-400 font-mono">{stock.symbol}</span>
        <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-500">
          {stock.exchange}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${priceColor}`}>{price.toFixed(2)}</span>
        <span className={priceColor}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(2)}
        </span>
        <span className={priceColor}>
          ({changePct >= 0 ? '+' : ''}
          {changePct.toFixed(2)}%)
        </span>
      </div>
      <Field label="昨收" value={prevClose.toFixed(2)} />
      <Field label="涨停" value={upLimit} color="text-red-600" />
      <Field label="跌停" value={downLimit} color="text-green-600" />
      <Field label="涨跌停" value={`${limitPct}%`} />
      <Field label="一手" value={`${stock.lot_size} 股`} />
    </div>
  )
}

function Field({
  label,
  value,
  color = 'text-gray-900',
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  )
}

/** 持仓列表 */
function PositionList({ positions }: { positions?: Position[] }) {
  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">持仓</h2>
        <span className="text-xs text-gray-400">阶段 1 真实数据</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 pr-4">代码</th>
            <th className="pb-2 pr-4 text-right">总持仓</th>
            <th className="pb-2 pr-4 text-right">可卖</th>
            <th className="pb-2 pr-4 text-right">冻结</th>
            <th className="pb-2 pr-4 text-right">均价</th>
            <th className="pb-2 text-right">总成本</th>
          </tr>
        </thead>
        <tbody>
          {positions?.map((p) => (
            <tr key={`${p.user_id}-${p.symbol}`} className="border-b border-gray-100">
              <td className="py-2 pr-4 font-mono">{p.symbol}</td>
              <td className="py-2 pr-4 text-right">{p.quantity}</td>
              <td className="py-2 pr-4 text-right text-green-600">{p.available_quantity}</td>
              <td className="py-2 pr-4 text-right text-orange-600">{p.frozen_quantity}</td>
              <td className="py-2 pr-4 text-right">{Number(p.avg_cost).toFixed(2)}</td>
              <td className="py-2 text-right">{Number(p.total_cost).toFixed(2)}</td>
            </tr>
          ))}
          {positions?.length === 0 && (
            <tr>
              <td colSpan={6} className="py-10 text-center text-gray-400">
                暂无持仓
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
