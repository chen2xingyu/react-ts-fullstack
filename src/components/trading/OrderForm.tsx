import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { placeOrder } from '@/api/trading'
import { ORDER_SIDE, ORDER_TYPE } from '@/types/trading'
import type { Stock, Account, Position } from '@/types/trading'

/**
 * 🎯 面试考点：点价填单的「外部输入 → 内部状态」桥接（nonce 解决同值不触发）
 * 父组件五档行情格子被点击时，父组件更新 pickedPrice 并下发。为什么需要 nonce 自增？
 *   React.useEffect 的依赖是「Object.is 浅比较」：用户连续点【同一个价位】时，
 *   pickedPrice.value 没变，effect 依赖整体引用若也没变，effect 就不会重跑——
 *   点了等于白点。给每次点击一个自增 nonce，对象引用每次都变，effect 必然重跑。
 * 易错点：不要用 value 是否变化当触发条件；也不要在渲染期直接 setPrice（渲染期
 *   setState 会触发「Cannot update while rendering」无限循环，必须放 effect/事件里）。
 */
export interface PickedPrice {
  value: number
  nonce: number
}

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
  pickedPrice,
}: {
  symbol?: string
  stock?: Stock
  lastPrice?: number
  account?: Account
  positions?: Position[]
  pickedPrice?: PickedPrice
}) {
  // 🎯 面试考点：受控组件（controlled component）与表单状态组织
  // 受控 = 表单元素的 value 由 React state 提供、onChange 里 set 回 state，
  // state 是唯一数据源（等同 Vue v-model，但 React 无指令，必须手写 value+onChange 一对）。
  // 状态组织取舍（高频追问）：
  //   - 多个 useState（本文件：side/orderType/price/quantity/msg 分开）：
  //     粒度细、类型独立清晰、局部更新；缺点字段多时样板代码多。
  //   - 一个 form 对象 useState<FormState>：setForm({...form, price}) 必须整体展开，
  //     极易漏展开产生脏数据；大型表单实战用 react-hook-form（注册+非受控）规避重渲染。
  // TS→JS：useState<number>() 的 <number> 编译后完全擦除，运行时就是 useState(ORDER_SIDE.BUY)。
  const qc = useQueryClient()
  const [side, setSide] = useState<number>(ORDER_SIDE.BUY)
  const [orderType, setOrderType] = useState<number>(ORDER_TYPE.LIMIT)
  // 🎯 面试考点：useState 函数式惰性初始化（lazy initializer）
  // useState(() => ...) 传入函数时，React 只会在【首次渲染】调用一次，结果作为初始值；
  // 若写成 useState(计算结果)，每次渲染都会重复执行那段计算（这里仅取两个字段，
  // 影响小，但初始值昂贵时——如 new Date()、深拷贝、正则解析——必须用惰性初始化）。
  const [price, setPrice] = useState<string>(() => {
    const p = lastPrice ?? stock?.prev_close
    return p ? String(p) : ''
  })
  // 🎯 面试考点：金额/数量为什么存 string 而不是 number
  // 输入框 value 是字符串；金额存 string 可保留用户输入过程（如 "12."、"12.30"），
  // 避免受控输入时 Number 转换把 "12." 变成 12 导致光标跳动/无法输小数点。
  // 提交时再 Number(price) 转数值。易错：浮点金额直接用二进制 number 累加会丢精度，
  // 金融场景建议以「分为单位的整数」或 decimal 库计算。
  const [quantity, setQuantity] = useState<string>('')
  // msg 用联合类型 { type: 'ok'|'err'; text } | null：
  // TS 字面量联合让 UI 分支只能在两种色之间取，杜绝拼写错误的 type。
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // 阶段 5：五档点价 → 自动填入委托价并切到限价模式（nonce 保证同价可重复触发）
  // 记录已消费的 nonce，避免在 effect 里同步 setState 造成级联渲染
  // 🎯 面试考点：useRef 存「上一次看到的值」做幂等消费（防 effect 重复消费同一外部值）
  // 为什么不能直接在 effect 里 if (pickedPrice) 就 setPrice？因为 effect 依赖
  //   [pickedPrice]，父组件每次重渲染若新建了 pickedPrice 对象，effect 会重复触发，
  //   导致 setPrice 反复执行（虽幂等但多余）。用 consumedPriceNonce.current 记录
  //   已处理到哪个 nonce，只在「新 nonce」时才消费一次——典型的 ref 做跨渲染持久标记用法。
  // 为什么用 ref 而不是 state？ref.current 变更【不触发渲染】，正是这里要的：
  //   它只是账本，不需要驱动 UI。追问：useRef 和 useState 的区别？ref 可变、不触发渲染、
  //   每次渲染共享同一对象；state 变更触发渲染、读的是当次快照。
  const consumedPriceNonce = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (pickedPrice && pickedPrice.nonce !== consumedPriceNonce.current) {
      consumedPriceNonce.current = pickedPrice.nonce
      setPrice(String(pickedPrice.value))
      setOrderType(ORDER_TYPE.LIMIT)
    }
    // eslint 依赖数组只写 [pickedPrice]：consumedPriceNonce 是 ref，按规范无需列入依赖。
  }, [pickedPrice])

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

  // 🎯 面试考点：派生数据用 useMemo，而非塞进 state
  // freezeAmount 完全由 isBuy/refPrice/qtyNum/feeRate 推出——凡是能由已有 state/
  // props 算出来的值，都不要另开一个 state（否则两处真相，容易忘记同步更新导致不一致）。
  // useMemo 的作用是「缓存昂贵计算结果」，依赖不变时跳过重算；它不是性能银弹，
  //   简单计算不包 useMemo 反而省了比对开销。追问：useMemo 和 useCallback 区别？
  //   useMemo 缓存【值】，useCallback 缓存【函数引用】（防止子组件无谓重渲染）。
  // 易错点：依赖数组漏写某个用到的变量 → 闭包抓到旧值，这是 Hooks 最常见 bug。
  const freezeAmount = useMemo(() => {
    if (!qtyNum || !refPrice) return 0
    return isBuy ? +(refPrice * qtyNum * (1 + feeRate)).toFixed(2) : qtyNum
  }, [isBuy, refPrice, qtyNum, feeRate])

  // 🎯 面试考点：useMutation 与防重复提交、缓存失效
  // useMutation 管「写操作」（区别于 useQuery 管读）。mutation.mutate(...) 触发请求，
  //   mutation.isPending 在请求期间为 true——提交按钮据此 disabled，从 UI 层杜绝
  //   连点导致的重复下单（前端第一道防线；后端还需幂等键兜底，见 client_order_id）。
  // onSuccess 里 qc.invalidateQueries(...)：把 orders/account/positions 三个 query
  //   标记为 stale，react-query 会在其下次可见时自动重新拉取——这是「下单成功后
  //   冻结资金、持仓、委托列表联动刷新」的核心机制，比手动 setState 各列表省事且一致。
  // onError 拿到的 e 来自 request.ts 响应拦截器：业务 code≠0 时拦截器已 reject(message)，
  //   所以这里直接 e.message 就是后端风控文案（资金不足/涨跌停等）。
  const mutation = useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      setMsg({ type: 'ok', text: '委托已提交，等待撮合' })
      setQuantity('') // 提交成功后清空数量——避免重复提交同数量单
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

  // 🎯 面试考点：表单校验时机（提交时 / 失焦时 / 输入时）与客户端校验定位
  // 本文件采用【提交时统一校验】：点提交才跑全部规则，首个不通过即 return setMsg(err)。
  //   三种时机的取舍（高频追问）：
  //   - 提交时校验（本做法）：最简单、不过度打扰；缺点用户填完才知道错。
  //   - 失焦 onBlur 校验：体验折中，字段离开时即时提示。
  //   - 输入时 onChange 实时校验：配合防抖，体验最好但实现最重。
  // 注意：客户端校验只是【体验层】，服务端必须再校验一遍（拦截器 reject 风控文案
  //   即服务端兜底）。这里还用 1e-9 容差比较价格边界，避免浮点 21.0000000001 误判越界。
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
      // 市价单不传价格（null）：由交易所按最新价撮合；限价单才带 priceNum。
      price: isLimit ? priceNum : null,
      quantity: qtyNum,
      // 🎯 面试考点：幂等键（idempotency key）——防重复提交的服务端防线
      // crypto.randomUUID() 每次请求生成唯一 client_order_id：即便前端重试/网络重试，
      //   后端凭此键去重，保证同一笔请求不会被撮合成两笔单。前端 disabled 只是第一层，
      //   幂等键才是最终兜底（断网重发、双击、重试都靠它）。
      // crypto.randomUUID 为浏览器原生 API，产出 RFC4122 v4 UUID。
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
        {/* 🎯 面试考点：受控 vs 非受控输入的取舍
            受控（这里）：value 始终由 state 驱动，可随时读取/校验/重置，本例全用受控。
            非受控：input 不写 value，用 useRef 在提交时 e.target.value 取值，
              适合极简单的表单或迁移老代码（性能略好但失去 React 单向数据流约束）。
            这里市价时 value 置空并 disabled：UI 层直接告诉用户「市价不用填价」，
            同时 disabled 的 input 不会被表单收集，避免误传脏值。 */}
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
      {/* disabled={mutation.isPending}：请求进行中按钮置灰，配合文案「提交中...」，
          是防重复提交的 UI 层实现（服务端幂等键见 handleSubmit 内注释）。 */}
      <button
        onClick={handleSubmit}
        disabled={mutation.isPending || !symbol}
        className={`py-2 rounded-md text-sm font-semibold text-white transition disabled:opacity-50 ${
          isBuy ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {mutation.isPending ? '提交中...' : `${isBuy ? '买入' : '卖出'} ${stock?.symbol || ''}`}
      </button>

      {/* 错误/成功反馈条：msg 为 null 时不渲染；type 决定配色。
          易错点：每次提交前 setMsg(null) 先清旧提示，避免上一次错误残留。 */}
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
