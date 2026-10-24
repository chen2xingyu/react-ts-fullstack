import { useQuery } from '@tanstack/react-query'
import { getTrades } from '@/api/trading'
import { ORDER_SIDE_LABELS } from '@/types/trading'
import type { Trade } from '@/types/trading'

/**
 * 🎯 面试考点：ISO 时间字符串的轻量格式化
 * trade_time 是 ISO8601("2026-10-24T13:45:08")。这里不引 dayjs/date-fns，
 * 直接 replace('T',' ') + slice(5,19) 裁掉年份与毫秒——展示列对包体积敏感时，
 * 「字符串裁剪」比 new Date() + 手动拼还快且无时区坑。
 * 易错：new Date(iso).toLocaleString() 会按【用户本地时区】转，服务器 UTC 时间会偏 8 小时；
 *  slice 法原样展示服务器时间字符串，时区表现一致。真要做时区换算才上 dayjs。
 */
function fmtTime(t: string) {
  if (!t) return ''
  return t.replace('T', ' ').slice(5, 19) // MM-DD HH:mm:ss
}

/**
 * 成交列表
 * - 3s 自动刷新：撮合引擎（阶段4）成交回报结算后联动
 * - 展示当前用户作为买方/卖方的全部成交
 *
 * 🎯 面试考点：轮询(refetchInterval) vs WebSocket 的取舍
 * 这里用 react-query 的 refetchInterval:3000 做「准实时」拉取，而不是像盘口那样走 WS：
 *   成交列表对秒级延迟不敏感、数据量小、要翻页/累计，轮询实现简单且自带缓存/去重；
 *   盘口/tick 对毫秒级敏感、推送频繁，才用 WS。
 * 进阶：页面切到后台时 refetchInterval 默认仍跑；可加 refetchIntervalInBackground:false
 * 或用 notifyOnChangeProps 省请求。父页面收到 WS 成交通知时会 invalidateQueries
 * （见 TradingPage.handleNotify），把 3s 轮询「即时提速」，二者互补。
 */
export default function TradeList() {
  const { data: trades, isLoading } = useQuery<Trade[]>({
    // queryKey 是 react-query 的缓存身份：['trading','trades'] 全局唯一，
    // invalidateQueries(['trading']) 前缀匹配即可连带失效
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
          {/*
           * 🎯 面试考点：稳定 key 与长列表虚拟化
           * key={t.id} 用数据库主键——成交记录只增不改、id 全局唯一，是最理想的 key。
           * 列表更新策略：3s 轮询返回新数组，react-query 数据引用变化触发重渲；
           * React 按 key 复用未变的 <tr>，只插入/更新变化行，不整表重建。
           * 虚拟化提示：当前量小直接全渲即可；若成交记录上千行滚动，应引入
           * 虚拟滚动(react-window / @tanstack/react-virtual)只渲染可视区行，
           * 否则上千 <tr> 的 DOM 节点会让滚动掉帧。
           */}
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
