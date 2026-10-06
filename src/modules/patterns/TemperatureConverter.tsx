import { useState } from 'react'

/**
 * 🎯 面试考点：状态提升（Lifting State Up）
 *
 * 两个兄弟输入框需要保持同步（摄氏 ⇄ 华氏），状态不能放在任何一方内部，
 * 否则另一个拿不到 → 提升到最近的公共父组件，通过 props 下发 value + onChange。
 *
 * 面试追问：
 * - 「状态提升的代价」：父组件重渲染范围变大 → 配合 memo / 状态下放 / Context 取舍
 * - 「单一数据源」：摄氏值是唯一 state，华氏由它推导（派生值不重复存，避免不一致）
 */

function toFahrenheit(c: number): number {
  return (c * 9) / 5 + 32
}
function toCelsius(f: number): number {
  return ((f - 32) * 5) / 9
}

/** 子组件完全受控：不持有状态，只回调上报 */
function TemperatureInput({
  scale,
  value,
  onChange,
}: {
  scale: 'c' | 'f'
  value: string
  onChange: (value: string) => void
}) {
  const label = scale === 'c' ? '摄氏 °C' : '华氏 °F'
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      <input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="输入温度"
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
      />
    </label>
  )
}

export default function TemperatureConverter() {
  // 状态提升到公共父组件：只存「最后编辑的一方」，另一方推导
  const [state, setState] = useState<{ value: string; scale: 'c' | 'f' }>({ value: '', scale: 'c' })

  const celsius = state.scale === 'f' ? tryConvert(state.value, toCelsius) : state.value
  const fahrenheit = state.scale === 'c' ? tryConvert(state.value, toFahrenheit) : state.value

  const num = parseFloat(celsius)
  const boiling = !Number.isNaN(num) && num >= 100

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <TemperatureInput scale="c" value={celsius} onChange={(v) => setState({ value: v, scale: 'c' })} />
        <TemperatureInput scale="f" value={fahrenheit} onChange={(v) => setState({ value: v, scale: 'f' })} />
      </div>
      <p data-testid="boiling-verdict" className={`mt-3 text-sm font-medium ${boiling ? 'text-red-600' : 'text-gray-500'}`}>
        {state.value === '' ? '输入温度后给出沸点判断' : boiling ? '🔥 水会沸腾（≥100°C）' : '💧 水不会沸腾'}
      </p>
    </div>
  )
}

function tryConvert(value: string, convert: (n: number) => number): string {
  const num = parseFloat(value)
  if (Number.isNaN(num)) return ''
  const rounded = Math.round(convert(num) * 100) / 100
  return String(rounded)
}
