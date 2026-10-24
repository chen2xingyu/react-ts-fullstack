import type { Account } from '@/types/trading'

/**
 * 🎯 面试考点：金额展示与「浮点精度陷阱」（金融必考）
 * 入参 string|number 兼容：后端金额常以字符串下发，parseFloat 转 number 仅为【展示】。
 * 核心红线：金额【绝不能】用裸 double 做累计/撮合/结算 —— 0.1+0.2=0.30000000000000004，
 * 千分/万分位累积会出 1 分钱误差。正确姿势：
 *   后端用整数「分」或 decimal 字符串存储与计算，前端只负责格式化展示；
 *   本组件的 toLocaleString 固定 2 位小数，就是纯展示，不做任何运算。
 * toFixed(n) 注意：它返回字符串、且存在 1.005→"1.00" 的银行家舍入边界问题，
 * 仅适合展示，不适合判等。TS→JS：number|string 联合类型编译后擦除。
 */
function formatMoney(n: number | string) {
  const num = typeof n === 'string' ? parseFloat(n) : n
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * 资金条：展示总资产 / 可用 / 冻结 / 手续费率
 *
 * 🎯 面试考点：加载态/空态的占位策略
 * loading || !account 时先渲染 animate-pulse 骨架块，而不是白屏或报错——
 * 先渲染「结构占位」能避免布局抖动(cls)，骨架屏优于 spinner 居中。
 * 追问：这里为什么不区分 error 态？错误态应由父级 react-query 的 error 分支兜底，
 * presentational 组件只吃 loading/数据两个开关，保持职责单一。
 */
export default function AccountBar({
  account,
  loading,
}: {
  account?: Account
  loading?: boolean
}) {
  // 早返回(early return)骨架屏：hooks 之后、渲染主体之前短路，符合 React 规则
  if (loading || !account) {
    return <div className="card animate-pulse h-20" />
  }

  const items = [
    { label: '总资产', value: `¥${formatMoney(account.cash_total)}`, color: 'text-gray-900' },
    { label: '可用资金', value: `¥${formatMoney(account.cash_available)}`, color: 'text-green-600' },
    { label: '冻结资金', value: `¥${formatMoney(account.cash_frozen)}`, color: 'text-orange-600' },
    {
      label: '手续费率',
      // fee_rate 后端存小数(0.00025)，展示 ×100 成百分比；toFixed(4) 保留 4 位
      // 🎯 易错：百分比换算属于「展示换算」可放前端，但若用于实扣金额则必须后端算，避免浮点误差
      value: `${(Number(account.fee_rate) * 100).toFixed(4)}%`,
      color: 'text-gray-500',
    },
  ]

  return (
    <div className="card grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((it) => (
        <div key={it.label}>
          <div className="text-xs text-gray-500">{it.label}</div>
          <div className={`text-lg font-semibold ${it.color}`}>{it.value}</div>
        </div>
      ))}
    </div>
  )
}
