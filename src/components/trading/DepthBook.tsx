import type { Depth } from '@/hooks/useMarketSocket'

function fmt(n: number) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * 五档盘口
 * A股惯例：卖盘在上（绿），买盘在下（红），中间为最新价
 * depth.asks[0] / bids[0] 最接近中间价
 *
 * 阶段 5：点价联动 —— 点击任一档位价格，回调 onPickPrice，
 * 由父页面透传给 OrderForm 自动填入委托价（并切到限价模式）。
 */
export default function DepthBook({
  depth,
  lastPrice,
  onPickPrice,
}: {
  depth: Depth | null
  lastPrice?: number
  onPickPrice?: (price: number) => void
}) {
  const asks = depth?.asks ?? []
  const bids = depth?.bids ?? []
  // 卖盘从高到低展示（asks[4]→asks[0]）
  const asksDesc = [...asks].reverse()

  const Row = ({
    label,
    price,
    qty,
    color,
  }: {
    label: string
    price: number
    qty: number
    color: string
  }) => (
    <div
      // 阶段 5：点价填单 —— 点击价格回调父组件
      onClick={() => onPickPrice?.(price)}
      title={onPickPrice ? '点击填入委托价' : undefined}
      className={`flex items-center text-sm py-1 px-2 rounded ${
        onPickPrice ? 'cursor-pointer hover:bg-primary-50 transition' : ''
      }`}
    >
      <span className="w-10 text-gray-400">{label}</span>
      <span className={`flex-1 font-mono ${color}`}>{fmt(price)}</span>
      <span className="flex-1 text-right text-gray-600 font-mono">{qty}</span>
    </div>
  )

  return (
    <div className="card h-[420px] flex flex-col">
      <div className="flex items-center justify-between px-2 py-2 border-b border-gray-100">
        <span className="text-sm font-semibold">五档盘口</span>
        {lastPrice !== undefined && (
          <span className="text-base font-bold text-gray-900 font-mono">
            {fmt(lastPrice)}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {asks.length === 0 && bids.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            等待行情...
          </div>
        ) : (
          <>
            {asksDesc.map((lv, i) => (
              <Row
                key={`a${i}`}
                label={`卖${asks.length - i}`}
                price={lv[0]}
                qty={lv[1]}
                color="text-green-600"
              />
            ))}
            <div className="my-1 border-t border-dashed border-gray-200" />
            {bids.map((lv, i) => (
              <Row
                key={`b${i}`}
                label={`买${i + 1}`}
                price={lv[0]}
                qty={lv[1]}
                color="text-red-600"
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
