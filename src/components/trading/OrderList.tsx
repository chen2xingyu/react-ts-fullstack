import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cancelOrder, getOrders } from '@/api/trading'
import {
  ORDER_SIDE_LABELS,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
} from '@/types/trading'
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
 * - 阶段 3：主要展示待成交/已拒单，验证资金冻结/风控拒绝
 * - 阶段 5：待成交/部分成交单可撤单（投递引擎 → 释放冻结 → 状态联动）
 */
export default function OrderList() {
  const qc = useQueryClient()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['trading', 'orders'],
    queryFn: () => getOrders(),
    refetchInterval: 3000,
  })

  const cancelMut = useMutation({
    mutationFn: (orderId: number) => cancelOrder(orderId),
    onSuccess: () => {
      setErrMsg(null)
      // 撤单请求已投递：失效委托/资金/持仓，下一轮轮询即可见状态变化
      qc.invalidateQueries({ queryKey: ['trading', 'orders'] })
      qc.invalidateQueries({ queryKey: ['trading', 'account'] })
      qc.invalidateQueries({ queryKey: ['trading', 'positions'] })
    },
    onError: (e: Error) => {
      setErrMsg(e.message || '撤单失败')
    },
    onSettled: () => setPendingId(null),
  })

  const handleCancel = (orderId: number) => {
    setErrMsg(null)
    setPendingId(orderId)
    cancelMut.mutate(orderId)
  }

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">📋 委托列表</h2>
        <span className="text-xs text-gray-400">阶段 5 · 3s 自动刷新 · 支持撤单</span>
      </div>
      {errMsg && (
        <div className="mb-2 text-xs px-2 py-1.5 rounded bg-red-50 text-red-600">
          {errMsg}
        </div>
      )}
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
            <th className="pb-2 pr-4">备注</th>
            <th className="pb-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {orders?.map((o) => {
            const side = Number(o.side)
            const isBuy = side === 1
            const status = Number(o.status)
            const cancellable =
              status === ORDER_STATUS.PENDING || status === ORDER_STATUS.PARTIAL
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
                <td className={`py-2 pr-4 font-medium ${STATUS_COLOR[status]}`}>
                  {ORDER_STATUS_LABELS[status]}
                </td>
                <td className="py-2 pr-4 text-xs text-gray-400">{o.reject_reason || ''}</td>
                <td className="py-2">
                  {cancellable ? (
                    <button
                      onClick={() => handleCancel(o.id)}
                      disabled={pendingId === o.id}
                      className="px-2 py-0.5 text-xs rounded border border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pendingId === o.id ? '提交中' : '撤单'}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            )
          })}
          {orders?.length === 0 && !isLoading && (
            <tr>
              <td colSpan={10} className="py-10 text-center text-gray-400">
                暂无委托
              </td>
            </tr>
          )}
          {isLoading && (
            <tr>
              <td colSpan={10} className="py-10 text-center text-gray-400">
                加载中...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
