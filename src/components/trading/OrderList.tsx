import { useQuery } from '@tanstack/react-query'
import { getOrders } from '@/api/trading'
import { ORDER_SIDE_LABELS, ORDER_STATUS_LABELS } from '@/types/trading'
import type { Order } from '@/types/trading'

const ORDER_TYPE_LABELS: Record<number, string> = { 1: '限价', 2: '市价' }

const STATUS_COLOR: Record<number, string> = {
  0: 'text-gray-500', // 待成交
  1: 'text-blue-600', // 部分成交
  2: 'text-green-600', // 已成交
  3: 'text-gray-400', // 已撤
  4: 'text-red-600', // 已拒
}

function fmtTime(t: string) {
  if (!t) return ''
  return t.replace('T', ' ').slice(5, 19) // MM-DD HH:mm:ss
}

/**
 * 委托列表
 * - 3s 自动刷新：撮合引擎（阶段4）成交后状态自动联动
 * - 阶段3：主要展示待成交/已拒单，验证资金冻结/风控拒绝
 */
export default function OrderList() {
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['trading', 'orders'],
    queryFn: () => getOrders(),
    refetchInterval: 3000,
  })

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">📋 委托列表</h2>
        <span className="text-xs text-gray-400">阶段 3 · 3s 自动刷新</span>
      </div>
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 pr-4">时间</th>
            <th className="pb-2 pr-4">代码</th>
            <th className="pb-2 pr-4">方向</th>
            <th className="pb-2 pr-4">类型</th>
            <th className="pb-2 pr-4 text-right">价格</th>
            <th className="pb-2 pr-4 text-right">委托</th>
            <th className="pb-2 pr-4 text-right">已成交</th>
            <th className="pb-2 pr-4">状态</th>
            <th className="pb-2">备注</th>
          </tr>
        </thead>
        <tbody>
          {orders?.map((o) => {
            const side = Number(o.side)
            const isBuy = side === 1
            return (
              <tr key={o.id} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-gray-500 text-xs">{fmtTime(o.created_at)}</td>
                <td className="py-2 pr-4 font-mono">{o.symbol}</td>
                <td className={`py-2 pr-4 font-medium ${isBuy ? 'text-red-600' : 'text-green-600'}`}>
                  {ORDER_SIDE_LABELS[side]}
                </td>
                <td className="py-2 pr-4 text-gray-600">{ORDER_TYPE_LABELS[Number(o.order_type)]}</td>
                <td className="py-2 pr-4 text-right">
                  {o.price ? Number(o.price).toFixed(2) : '—'}
                </td>
                <td className="py-2 pr-4 text-right">{o.quantity}</td>
                <td className="py-2 pr-4 text-right">{o.filled_quantity}</td>
                <td className={`py-2 pr-4 font-medium ${STATUS_COLOR[Number(o.status)]}`}>
                  {ORDER_STATUS_LABELS[Number(o.status)]}
                </td>
                <td className="py-2 text-xs text-gray-400">{o.reject_reason || ''}</td>
              </tr>
            )
          })}
          {orders?.length === 0 && !isLoading && (
            <tr>
              <td colSpan={9} className="py-10 text-center text-gray-400">
                暂无委托
              </td>
            </tr>
          )}
          {isLoading && (
            <tr>
              <td colSpan={9} className="py-10 text-center text-gray-400">
                加载中...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
