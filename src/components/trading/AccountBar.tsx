import type { Account } from '@/types/trading'

function formatMoney(n: number | string) {
  const num = typeof n === 'string' ? parseFloat(n) : n
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * 资金条：展示总资产 / 可用 / 冻结 / 手续费率
 */
export default function AccountBar({
  account,
  loading,
}: {
  account?: Account
  loading?: boolean
}) {
  if (loading || !account) {
    return <div className="card animate-pulse h-20" />
  }

  const items = [
    { label: '总资产', value: `¥${formatMoney(account.cash_total)}`, color: 'text-gray-900' },
    { label: '可用资金', value: `¥${formatMoney(account.cash_available)}`, color: 'text-green-600' },
    { label: '冻结资金', value: `¥${formatMoney(account.cash_frozen)}`, color: 'text-orange-600' },
    {
      label: '手续费率',
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
