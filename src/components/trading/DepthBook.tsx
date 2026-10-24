import type { Depth } from '@/hooks/useMarketSocket'

/**
 * 🎯 面试考点：盘口(Depth)数据模型与金额格式化
 * Depth = { asks: [price, qty][], bids: [price, qty][] }，每行是二元组数组而非对象，
 * 省字节（WS 高频推送时 payload 越小越好）。约定：asks/bids 都按「离中间价最近」排在 [0]，
 * bids[0] 是最高买价、asks[0] 是最低卖价。
 * toLocaleString('zh-CN', {2位小数}) 是「展示层」格式化的标准答案：千分位 + 固定小数位，
 * 比手动正则拼接更稳。TS→JS：二元组 number[][] 的类型编译后擦除，运行时就是普通数组。
 */
function fmt(n: number) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * 五档盘口
 * A股惯例：卖盘在上（绿），买盘在下（红），中间为最新价
 * depth.asks[0] / bids[0] 最接近中间价
 *
 * 🎯 面试考点：红涨绿跌 vs 绿涨红跌（必背文化差异）
 * 国内(A股/港股偏红)：红=涨/买盘主动，绿=跌/卖盘主动；欧美反过来(绿涨红跌)。
 * 本项目与 TradeList/StockInfo 统一用「红买绿卖」。易错：直接照搬国外图表库默认色
 * (lightweight-charts 默认绿涨红跌)，所以上面 K线图里才要手动把 upColor 设成红色。
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
  // 🎯 易错：reverse() 是【原地】修改。必须先 [...asks] 浅拷贝再 reverse，
  // 否则会反转父组件/缓存里的 asks 引用，下次渲染顺序错乱（纯组件不该改入参）。
  // 卖盘从高到低展示（asks[4]→asks[0]）
  const asksDesc = [...asks].reverse()

  /**
   * 🎯 面试考点（高频易错）：把组件定义在组件函数体内 = 每次渲染都是「新组件类型」
   * Row 在 DepthBook 内部声明，DepthBook 每次渲染都会生成一个全新的 Row 函数引用，
   * React 协调时认为「组件类型变了」→ 卸载旧 Row 树、挂载新 Row 树，
   * 导致 input/焦点/内部 state 全部丢失、列表抖动。这里档位无内部 state、量又只有 10 行，
   * 所以问题不爆发；但一旦 Row 里有状态或 memo，必须【提到组件外】接收 props。
   * 正确写法：const Row = memo(function Row(props){...}) 挪到 DepthBook 外层。
   */
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
            {/*
             * 🎯 面试考点：index 作 key 的适用边界
             * 这里用 a0..a4 / b0..b4 作 key 是【可接受】的：五档是固定位序、不会增删、
             * 顺序就是语义位置（卖5..卖1），没有跨列表移动项。
             * 反面教材：列表会插入/删除/排序/过滤时用 index 作 key，React 会按位置复用 DOM，
             * 导致内容错位、带 state 的行状态串台。口诀：「列表项有稳定 id 用 id；
             * 纯静态位序展示才可接受 index」。
             * 渲染优化：盘口是 WS 高频推送，但五档仅 10 行，直接重渲即可；
             * 若扩到上百档流水，再考虑 React.memo 包 Row + 虚拟滚动。
             */}
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
