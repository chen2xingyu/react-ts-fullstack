import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRiskLogs, getRiskLogsSummary } from '@/api/trading'
import { RISK_ACTION_LABELS, RISK_RULE_LABELS } from '@/types/trading'
import type { RiskLog, RiskLogSummary } from '@/types/trading'

// 🎯 面试考点：时间字符串格式化与时区坑（同 OrderList）
// 直接 slice 切割 "2026-10-24T13:45:00" 取 MM-DD HH:mm:ss，仅适用于后端按本地时区、
//   格式定长的场景。跨时区生产代码应 new Date(t) + Intl.DateTimeFormat 转换，
//   不能靠字符串截取处理 UTC 时间。
function fmtTime(t: string) {
  if (!t) return ''
  return t.replace('T', ' ').slice(5, 19) // MM-DD HH:mm:ss
}

// 🎯 面试考点：字符串字面量联合类型做「有限状态集」
// '' | 'order' | 'cancel' 把过滤器的合法取值锁死在编译期：
//   任何误写 setAction('oreder') 直接 TS 报错。
// TS→JS：这个联合类型编译后完全擦除，运行时 action 就是普通字符串 ''/'order'/'cancel'，
//   类型只在写代码时保护你，不产生任何运行时代码。
type ActionFilter = '' | 'order' | 'cancel'

/**
 * 风控日志列表（阶段 6）
 * - 展示当前用户所有下单/撤单的风控拒绝记录
 * - 顶部按 rule 聚合统计，便于直观看到高频拒绝原因
 * - 5s 自动刷新：下单被拒后可即时看到新日志
 */
export default function RiskLogList() {
  const [action, setAction] = useState<ActionFilter>('')

  // 🎯 面试考点：react-query 的 queryKey 是缓存身份——过滤器必须进 key
  // queryKey: ['trading','risk-logs',{ action }]：react-query 会把整个 key 做
  //   「深度序列化」当成缓存键。所以切换 action 等于换了一个全新的缓存条目，
  //   旧筛选结果保留在另一个 key 下，切回来时直接命中缓存、无需重新请求。
  // 易错点：只把 queryKey 写成 ['trading','risk-logs'] 而把 action 放进 queryFn 闭包——
  //   那切换筛选后两个筛选会共享同一份缓存，互相污染、拿到错数据。
  // refetchInterval 5s：下单被拒后日志列表即时可见（低频容忍延迟的轮询方案）。
  const { data: logs, isLoading } = useQuery<RiskLog[]>({
    queryKey: ['trading', 'risk-logs', { action }],
    queryFn: () => getRiskLogs(action ? { action } : undefined),
    refetchInterval: 5000,
  })

  // 顶部按规则聚合的统计是另一个 query：它和明细列表 key 不同（'summary' 结尾），
  //   互不干扰，各自独立缓存/轮询。
  const { data: summary } = useQuery<RiskLogSummary[]>({
    queryKey: ['trading', 'risk-logs', 'summary'],
    queryFn: () => getRiskLogsSummary(),
    refetchInterval: 5000,
  })

  // 🎯 面试考点：数组 reduce 聚合（无额外 state）
  // 总数由 summary 直接 reduce 推出，不另开 state——派生值永远从已有数据算，
  // 保持单一数据源。s + Number(r.cnt) 的 Number() 是因为后端可能下发字符串数字。
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
        {/* 🎯 面试考点：日志级别 → 配色（info/warn/danger）的语义映射
            这里动作徽标：撤单 cancel 用 orange（warn，需留意）、下单 order 用
            blue（info，普通事件）；规则名一律 red（danger，拒绝=风险命中）。
            配色语义要全项目统一：用户看到红色就知道是「被拒/风险」。
            🎯 追问：日志量级大了怎么优化？——本组件用全量渲染 <tr>，成百上千行
            时会卡顿。大数据量应上「虚拟滚动」（react-window / @tanstack/react-virtual）：
            只渲染可视区内的几十行 DOM，其余用占位撑开高度，渲染量从 O(n) 降到 O(视口行数)。 */}
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
