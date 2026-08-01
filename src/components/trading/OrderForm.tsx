import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { placeOrder } from '@/api/trading'
import { ORDER_SIDE, ORDER_TYPE } from '@/types/trading'
import type { Stock, Account, Position } from '@/types/trading'

/**
 * 下单面板
 * - 买入/卖出切换、限价/市价切换
 * - 实时显示可用资金（买）/可用持仓（卖）与预估冻结额
 * - 风控错误（资金不足/涨跌停等）由后端返回，拦截器 reject(message)，此处 catch 展示
 * - 成功后失效 委托/资金/持仓 查询，触发联动刷新
 */
export default function OrderForm({
  symbol,
  stock,
  lastPrice,
  account,
  positions,
}: {
  symbol?: string
  stock?: Stock
  lastPrice?: number
  account?: Account
  positions?: Position[]
}) {
  const qc = useQueryClient()
  const [side, setSide] = useState<number>(ORDER_SIDE.BUY)
  const [orderType, setOrderType] = useState<number>(ORDER_TYPE.LIMIT)
  const [price, setPrice] = useState<string>(() => {
    const p = lastPrice ?? stock?.prev_close
    return p ? String(p) : ''
  })
  const [quantity, setQuantity] = useState<string>('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const lotSize = Number(stock?.lot_size) || 100
  const feeRate = Number(account?.fee_rate) || 0
  const prevClose = Number(stock?.prev_close) || 0
  const limitPct = Number(stock?.price_limit_pct) || 0
  const upLimit = +(prevClose * (1 + limitPct)).toFixed(2)
  const downLimit = +(prevClose * (1 - limitPct)).toFixed(2)

  const isBuy = side === ORDER_SIDE.BUY
  const isLimit = orderType === ORDER_TYPE.LIMIT
  const priceNum = Number(price) || 0
  const qtyNum = Number(quantity) || 0
  const refPrice = isLimit ? priceNum : lastPrice || prevClose

  // 可用额度：买入看资金，卖出看持仓
  const available = isBuy
    ? Number(account?.cash_available) || 0
    : positions?.find((p) => p.symbol === symbol)?.available_quantity ?? 0

  // 预估冻结：买入=价×量×(1+费率)；卖出=冻结股数
  const freezeAmount = useMemo(() => {
    if (!qtyNum || !refPrice) return 0
    return isBuy ? +(refPrice * qtyNum * (1 + feeRate)).toFixed(2) : qtyNum
  }, [isBuy, refPrice, qtyNum, feeRate])

  const mutation = useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      setMsg({ type: 'ok', text: '委托已提交，等待撮合' })
      setQuantity('')
      qc.invalidateQueries({ queryKey: ['trading', 'orders'] })
      qc.invalidateQueries({ queryKey: ['trading', 'account'] })
      qc.invalidateQueries({ queryKey: ['trading', 'positions'] })
    },
    onError: (e: Error) => {
      setMsg({ type: 'err', text: e.message || '下单失败' })
    },
  })

  // 快捷数量
  const setQty = (n: number) => setQuantity(String(Math.max(0, n)))
  const maxBuyQty = refPrice
    ? Math.floor((available / (refPrice * (1 + feeRate))) / lotSize) * lotSize
    : 0
  const maxSellQty = Math.floor(available / lotSize) * lotSize

  const handleSubmit = () => {
    setMsg(null)
    if (!symbol) return setMsg({ type: 'err', text: '请选择股票' })
    if (!qtyNum || qtyNum % lotSize !== 0) {
      return setMsg({ type: 'err', text: `数量须为 ${lotSize} 股的整数倍` })
    }
    if (isLimit && (!priceNum || priceNum <= 0)) {
      return setMsg({ type: 'err', text: '请输入限价' })
    }
    if (isLimit && (priceNum > upLimit + 1e-9 || priceNum < downLimit - 1e-9)) {
      return setMsg({ type: 'err', text: `价格须在涨跌停 [${downLimit}, ${upLimit}] 内` })
    }
    mutation.mutate({
      symbol,
      side,
      order_type: orderType,
      price: isLimit ? priceNum : null,
      quantity: qtyNum,
      client_order_id: crypto.randomUUID(),
    })
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">📝 委托下单</h2>
        <span className="text-xs text-gray-400">阶段 3</span>
      </div>

      {/* 买/卖 切换 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide(ORDER_SIDE.BUY)}
          className={`py-1.5 rounded-md text-sm font-medium transition ${
            isBuy ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          买入
        </button>
        <button
          onClick={() => setSide(ORDER_SIDE.SELL)}
          className={`py-1.5 rounded-md text-sm font-medium transition ${
            !isBuy ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          卖出
        </button>
      </div>

      {/* 限价/市价 切换 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: ORDER_TYPE.LIMIT, label: '限价' },
          { v: ORDER_TYPE.MARKET, label: '市价' },
        ].map((t) => (
          <button
            key={t.v}
            onClick={() => setOrderType(t.v)}
            className={`py-1 rounded-md text-xs transition ${
              isLimit === (t.v === ORDER_TYPE.LIMIT)
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 价格 */}
      <div>
        <label className="text-xs text-gray-500">委托价（涨跌停 {downLimit}~{upLimit}）</label>
        <input
          type="number"
          step="0.01"
          value={isLimit ? price : ''}
          placeholder={isLimit ? '输入限价' : '市价（按最新价撮合）'}
          disabled={!isLimit}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>

      {/* 数量 */}
      <div>
        <label className="text-xs text-gray-500">数量（股，{lotSize} 股/手）</label>
        <input
          type="number"
          step={lotSize}
          value={quantity}
          placeholder="输入数量"
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div className="flex gap-1.5 mt-1.5">
          {[100, 500, 1000].map((n) => (
            <button
              key={n}
              onClick={() => setQty((Number(quantity) || 0) + n)}
              className="flex-1 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              +{n}
            </button>
          ))}
          <button
            onClick={() => setQty(isBuy ? maxBuyQty : maxSellQty)}
            className="flex-1 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            {isBuy ? '全仓' : '全卖'}
          </button>
        </div>
      </div>

      {/* 可用 + 预估冻结 */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>可用：{isBuy ? `¥${available.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : `${available} 股`}</span>
        <span>预估{isBuy ? '冻结资金' : '冻结股数'}：{isBuy ? `¥${freezeAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : `${freezeAmount} 股`}</span>
      </div>

      {/* 提交 */}
      <button
        onClick={handleSubmit}
        disabled={mutation.isPending || !symbol}
        className={`py-2 rounded-md text-sm font-semibold text-white transition disabled:opacity-50 ${
          isBuy ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {mutation.isPending ? '提交中...' : `${isBuy ? '买入' : '卖出'} ${stock?.symbol || ''}`}
      </button>

      {msg && (
        <div
          className={`text-xs px-2 py-1.5 rounded ${
            msg.type === 'ok'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  )
}
