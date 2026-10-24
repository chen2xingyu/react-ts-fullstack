import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cancelOrder, getOrders } from '@/api/trading'
import {
  ORDER_SIDE_LABELS,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
} from '@/types/trading'
import type { Order } from '@/types/trading'

// 🎯 面试考点：状态枚举 → 文案/配色的「映射表」模式
// 业务里订单状态是数字枚举（0待成交/1部分成交/2已成交/3已撤/4已拒）。
// 不要在 JSX 里写 if/else 大段判断，用 Record<number, string> 查表，
// 新增状态只需加一行映射，组件逻辑零改动（开闭原则）。
// TS→JS：Record<number, string> 编译后擦除，运行时就是普通对象字面量；
//   因此这里的 key 是数字，访问时必须先 Number(o.status) 归一化（后端可能下发字符串）。
const ORDER_TYPE_LABELS: Record<number, string> = { 1: '限价', 2: '市价' }

// 状态徽标配色：灰=待办/终态中性，蓝=进行中，绿=成功，红=拒绝。
// 行业惯例：成交类用绿、风险/拒绝类用红，和 A 股红涨绿跌相反，注意区分语境。
const STATUS_COLOR: Record<number, string> = {
  0: 'text-gray-500', // 待成交
  1: 'text-blue-600', // 部分成交
  2: 'text-green-600', // 已成交
  3: 'text-gray-400', // 已撤
  4: 'text-red-600', // 已拒
}

// 🎯 面试考点：时间字符串格式化与时区坑
// 后端返回 ISO 串如 "2026-10-24T13:45:00"，这里 replace('T',' ') 去 T、slice(5,19)
//   截掉年份和秒后的部分，展示为 "MM-DD HH:mm:ss"。
// 易错点（高频追问）：slice 截取的是【字符串前 N 位】，前提是后端时间按本地时区、
//   且格式定长。若后端返回 UTC "T00:00:00Z"，直接截会差 8 小时——正规做法是
//   new Date(t) 后用 Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai' })
//   转换，不要靠字符串切割处理跨时区时间。
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

  // 🎯 面试考点：轮询（refetchInterval）vs WebSocket 推送
  // refetchInterval: 3000 表示每 3 秒重新拉一次订单列表，让撮合后的状态变化可见。
  //   这是「低频、容忍延迟」场景的简单方案；缺点是无论数据变没变都在空轮询、
  //   且多标签页时会重复请求。生产高实时场景用 WebSocket/SSE 推送替代。
  // react-query 还会在窗口重新聚焦、网络恢复时自动 refetch，无需手动写定时器。
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['trading', 'orders'],
    queryFn: () => getOrders(),
    refetchInterval: 3000,
  })

  // 🎯 面试考点：撤单——乐观更新 vs 服务端确认（本实现是「保守更新」）
  // 乐观更新（optimistic update）：点撤单瞬间先在本地把状态改成「已撤」，
  //   失败再回滚——体验快，但出错要回滚逻辑。
  // 本实现：mutate 后并不改本地状态，而是 invalidateQueries 让下一轮 3s 轮询
  //   自然拉到撤单结果——实现简单、不会出现「假撤单」，代价是用户要等下一轮才看到。
  // pendingId 记录正在撤哪一单，仅禁用该单按钮（disabled={pendingId === o.id}），
  //   防止同一单重复点撤；onSettled 里 setPendingId(null) 无论成败都解除禁用。
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
            // 🎯 面试考点：可撤单的状态判定
            // 只有「待成交」和「部分成交」还能撤（还有未成交量可撤）；
            // 已全成/已撤/已拒都是终态，撤无意义。业务规则决定 UI 是否展示按钮。
            const cancellable =
              status === ORDER_STATUS.PENDING || status === ORDER_STATUS.PARTIAL
            return (
              // 🎯 面试考点：列表 key 的正确用法
              // key 必须用稳定、唯一的业务 ID（o.id），绝不能用数组 index——
              //   用 index 当 key 时，列表头部插入/删除会让 React 误复用 DOM，
              //   导致输入串位、动画错乱、状态错位。key 的作用是帮 React 识别
              //   「哪一行是哪一行」，做 diff 时精准复用。
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
