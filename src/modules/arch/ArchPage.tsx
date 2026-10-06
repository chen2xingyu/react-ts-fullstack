import { useMemo, useState } from 'react'
import { NODES, EDGES, TONE_STYLE, type ArchNode } from './archData'

/**
 * 🎯 面试考点：架构图可视化页
 *
 * 纯 SVG 实现的可交互架构图（不引库）：
 * - 数据驱动：节点/边配置在 archData.ts，改配置即改图
 * - 点击节点 → 下方显示该节点的「面试讲解要点」
 * - 边用节点几何中心连线 + arrowhead marker
 *
 * 讲稿用法：面试被问「介绍下项目架构」→ 打开本页，从浏览器一路点到撮合引擎。
 */

function center(node: ArchNode) {
  return { cx: node.x + node.w / 2, top: node.y, bottom: node.y + node.h }
}

export default function ArchPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => NODES.find((n) => n.id === selectedId) ?? null, [selectedId])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">🗺️ 项目架构图</h1>
      <p className="mb-4 text-sm text-gray-500">
        点击任意节点查看「面试讲解要点」。架构主线：Strangler 渐进迁移 + 缓存/队列/异构引擎。
      </p>

      <svg
        viewBox="0 0 1040 580"
        className="w-full rounded-xl border border-gray-200 bg-white shadow-sm"
        role="img"
        aria-label="项目架构图"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* 边 */}
        {EDGES.map((e) => {
          const from = NODES.find((n) => n.id === e.from)!
          const to = NODES.find((n) => n.id === e.to)!
          const a = center(from)
          const b = center(to)
          const x1 = a.cx
          const y1 = a.bottom
          const x2 = b.cx
          const y2 = b.top
          // 简单垂直连线；斜线场景用中点折线更美观，此处直连即可
          const midY = (y1 + y2) / 2
          const labelX = (x1 + x2) / 2
          const labelY = midY - 4
          return (
            <g key={`${e.from}->${e.to}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#arrow)" />
              {e.label && (
                <text x={labelX} y={labelY} textAnchor="middle" fontSize={10} fill="#64748b">
                  {e.label}
                </text>
              )}
            </g>
          )
        })}

        {/* 节点 */}
        {NODES.map((n) => {
          const style = TONE_STYLE[n.tone]
          const isSelected = n.id === selectedId
          return (
            <g
              key={n.id}
              data-testid={`node-${n.id}`}
              onClick={() => setSelectedId(isSelected ? null : n.id)}
              className="cursor-pointer"
            >
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={10}
                fill={style.fill}
                stroke={isSelected ? style.text : style.stroke}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <text x={n.x + 12} y={n.y + 24} fontSize={13} fontWeight={600} fill={style.text}>
                {n.title}
              </text>
              <text x={n.x + 12} y={n.y + 42} fontSize={11} fill="#475569">
                {n.sub}
              </text>
            </g>
          )
        })}
      </svg>

      {/* 讲解面板 */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm" data-testid="arch-detail">
        {selected ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-800">
              {selected.title} —— 面试讲解要点
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
              {selected.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-400">点击上方任意节点，查看该层的面试讲解要点</p>
        )}
      </div>
    </div>
  )
}
