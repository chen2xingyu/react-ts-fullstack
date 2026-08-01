import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRiskLogs, getRiskLogsSummary } from '@/api/trading'
import { RISK_ACTION_LABELS, RISK_RULE_LABELS } from '@/types/trading'
import type { RiskLog, RiskLogSummary } from '@/types/trading'

function fmtTime(t: string) {
  if (!t) return ''
  return t.replace('T', ' ').slice(5, 19) // MM-DD HH:mm:ss
}

type ActionFilter = '' | 'order' | 'cancel'

/**
 * 风控日志列表（阶段 6）
 * - 展示当前用户所有下单/撤单的风控拒绝记录
 * - 顶部按 rule 聚合统计，便于直观看到高频拒绝原因
 * - 5s 自动刷新：下单被拒后可即时看到新日志
 */
export default function RiskLogList() {
  const [action, setAction] = useState<ActionFilter>('')

  const { data: logs, isLoading } = useQuery<RiskLog[]>({
    queryKey: ['trading', 'risk-logs', { action }],
    queryFn: () => getRiskLogs(action ? { action } : undefined),
    refetchInterval: 5000,
  })

  const { data: summary } = useQuery<RiskLogSummary[]>({
    queryKey: ['trading', 'risk-logs', 'summary'],
    queryFn: () => getRiskLogsSummary(),
    refetchInterval: 5000,
  })

  const total = summary?.reduce((s, r) => s + Number(r.cnt), 0) ?? 0

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">🛡 风控日志</h2>
        <span className="text-xs text-gray-400">阶段 6 · 5s 自动刷新</span>
      </div>

      {/* 概览：按规则聚合 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-gray-500">
          共 <span className="font-semibold text-gray-900">{total}</span> 次拒绝
        </span>
        {summary?.map((s) => (
          <span
            key={s.rule}
            className="px-2 py-0.5 text-xs rounded bg-red-50 text-red-600 border border-red-100"
            title={s.rule}
          >
            {RISK_RULE_LABELS[s.rule] || s.rule} · {s.cnt}
          </span>
        ))}
        {total === 0 && (
          <span className="text-xs text-gray-400">暂无拒绝记录 🎉</span>
        )}
      </div>

      {/* 动作过滤 */}
      <div className="flex items-center gap-2 mb-3">
        {(['', 'order', 'cancel'] as ActionFilter[]).map((a) => (
          <button
            key={a || 'all'}
            onClick={() => setAction(a)}
            className={`px-2.5 py-1 text-xs rounded border transition ${
              action === a
                ? 'border-primary-400 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {a ? RISK_ACTION_LABELS[a] : '全部'}
          </button>
        ))}
      </div>

      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 pr-4">时间</th>
            <th className="pb-2 pr-4">动作</th>
            <th className="pb-2 pr-4">代码</th>
            <th className="pb-2 pr-4">规则</th>
            <th className="pb-2">明细</th>
          </tr>
        </thead>
        <tbody>
          {logs?.map((l) => (
            <tr key={l.id} className="border-b border-gray-100">
              <td className="py-2 pr-4 text-gray-500 text-xs">{fmtTime(l.created_at)}</td>
              <td className="py-2 pr-4">
                <span
                  className={`px-1.5 py-0.5 text-xs rounded ${
                    l.action === 'cancel'
                      ? 'bg-orange-50 text-orange-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {RISK_ACTION_LABELS[l.action] || l.action}
                </span>
              </td>
              <td className="py-2 pr-4 font-mono text-xs">{l.symbol || '—'}</td>
              <td className="py-2 pr-4">
                <span className="text-xs font-medium text-red-600">
                  {RISK_RULE_LABELS[l.rule] || l.rule}
                </span>
                <span className="ml-1 text-xs text-gray-400">{l.rule}</span>
              </td>
              <td className="py-2 text-xs text-gray-500">{l.detail || '—'}</td>
            </tr>
          ))}
          {logs?.length === 0 && !isLoading && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-gray-400">
                暂无风控日志
              </td>
            </tr>
          )}
          {isLoading && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-gray-400">
                加载中...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
