import { useQuery } from '@tanstack/react-query'
import { getTrades } from '@/api/trading'
import { ORDER_SIDE_LABELS } from '@/types/trading'
import type { Trade } from '@/types/trading'

function fmtTime(t: string) {
  if (!t) return ''
  return t.replace('T', ' ').slice(5, 19) // MM-DD HH:mm:ss
}

/**
 * 成交列表
 * - 3s 自动刷新：撮合引擎（阶段4）成交回报结算后联动
 * - 展示当前用户作为买方/卖方的全部成交
 */
export default function TradeList() {
  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ['trading', 'trades'],
    queryFn: () => getTrades(),
    refetchInterval: 3000,
  })

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">✅ 成交列表</h2>
        <span className="text-xs text-gray-400">阶段 4 · 3s 自动刷新</span>
      </div>
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 pr-4">成交时间</th>
            <th className="pb-2 pr-4">编号</th>
            <th className="pb-2 pr-4">代码</th>
            <th className="pb-2 pr-4">方向</th>
            <th className="pb-2 pr-4 text-right">成交价</th>
            <th className="pb-2 pr-4 text-right">成交量</th>
            <th className="pb-2 pr-4 text-right">成交额</th>
            <th className="pb-2">对手方</th>
          </tr>
        </thead>
        <tbody>
          {trades?.map((t) => {
            const side = Number(t.side)
            const isBuy = side === 1
            return (
              <tr key={t.id} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-gray-500 text-xs">{fmtTime(t.trade_time)}</td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-400">{t.trade_no}</td>
                <td className="py-2 pr-4 font-mono">{t.symbol}</td>
                <td className={`py-2 pr-4 font-medium ${isBuy ? 'text-red-600' : 'text-green-600'}`}>
                  {ORDER_SIDE_LABELS[side]}
                </td>
                <td className="py-2 pr-4 text-right">{Number(t.price).toFixed(2)}</td>
                <td className="py-2 pr-4 text-right">{t.quantity}</td>
                <td className="py-2 pr-4 text-right">{Number(t.amount).toFixed(2)}</td>
                <td className="py-2 text-xs text-gray-400">
                  买#{t.buy_order_id} / 卖#{t.sell_order_id}
                </td>
              </tr>
            )
          })}
          {trades?.length === 0 && !isLoading && (
            <tr>
              <td colSpan={8} className="py-10 text-center text-gray-400">
                暂无成交
              </td>
            </tr>
          )}
          {isLoading && (
            <tr>
              <td colSpan={8} className="py-10 text-center text-gray-400">
                加载中...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
