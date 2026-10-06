import { useState } from 'react'

/**
 * 🎯 面试考点：Web 安全实验室（XSS + CSRF）
 *
 * 1. XSS（跨站脚本）：用户输入未转义直接渲染 → 注入恶意脚本
 *    演示：dangerouslySetInnerHTML 直接插入 vs textContent 安全渲染
 *    防御：React 默认转义 JSX 插值；富文本用 DOMPurify 白名单过滤
 *
 * 2. CSRF（跨站请求伪造）：利用用户已登录的 Cookie，恶意站点伪造请求
 *    演示：带/不带 X-CSRF-Token 的转账接口对照
 *    防御：自定义 Header（CORS 拦截）/ SameSite Cookie / CSRF Token
 */

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">🔒 Web 安全实验室</h1>
      <p className="mb-6 text-sm text-gray-500">XSS 注入对照 + CSRF 转账攻防演示。</p>
      <XssDemo />
      <CsrfDemo />
    </div>
  )
}

/* ── XSS 演示 ── */
const XSS_PAYLOAD = '<img src=x onerror="alert(\'XSS 攻击成功\')">'

function XssDemo() {
  const [input, setInput] = useState(XSS_PAYLOAD)
  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-gray-800">1. XSS —— 危险渲染 vs 安全渲染</h2>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="mb-4 w-full rounded-md border border-gray-300 px-3 py-1.5 font-mono text-sm focus:border-red-400 focus:outline-none"
        placeholder="输入 HTML/脚本"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
          <div className="mb-2 text-xs font-medium text-red-700">❌ dangerouslySetInnerHTML（危险）</div>
          <div data-testid="xss-dangerous" className="min-h-[40px] rounded bg-white p-2 text-sm" dangerouslySetInnerHTML={{ __html: input }} />
          <p className="mt-2 text-xs text-red-600">onerror 会执行 alert（真实环境会偷 Cookie/发请求）</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="mb-2 text-xs font-medium text-emerald-700">✅ textContent / JSX 插值（安全）</div>
          <div data-testid="xss-safe" className="min-h-[40px] rounded bg-white p-2 text-sm">{input}</div>
          <p className="mt-2 text-xs text-emerald-600">React 默认转义，HTML 被当纯文本显示</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        考点：富文本场景用 DOMPurify 白名单过滤（script/iframe/on* 属性全删）；URL 参数防 javascript: 协议。
      </p>
    </section>
  )
}

/* ── CSRF 演示 ── */
function CsrfDemo() {
  const [balance, setBalance] = useState(1000)
  const [log, setLog] = useState<string[]>([])

  const queryBalance = async () => {
    const res = await fetch('/api/v2/security/csrf/balance?user=demo')
    const json = await res.json()
    setBalance(json.data.balance)
    setLog((l) => [...l, `💰 查询余额：¥${json.data.balance}`])
  }

  const transferSafe = async () => {
    const res = await fetch('/api/v2/security/csrf/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'demo-token-123' },
      body: JSON.stringify({ user: 'demo', amount: 100 }),
    })
    const json = await res.json()
    if (res.ok) {
      setBalance(json.data.balance)
      setLog((l) => [...l, `✅ 带 Token 转账成功：-¥100，余额 ¥${json.data.balance}`])
    }
  }

  const transferUnsafe = async () => {
    const res = await fetch('/api/v2/security/csrf/transfer/unsafe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'demo', amount: 100 }),
    })
    const json = await res.json()
    setBalance(json.data.balance)
    setLog((l) => [...l, `⚠️ 无防护转账成功：-¥100，余额 ¥${json.data.balance}（恶意站点可伪造）`])
  }

  const transferBlocked = async () => {
    const res = await fetch('/api/v2/security/csrf/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'demo', amount: 100 }),
    })
    if (res.status === 403) {
      setLog((l) => [...l, '🛡️ 缺少 X-CSRF-Token，转账被拦截（CSRF 防御生效）'])
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-gray-800">2. CSRF —— 转账攻防对照</h2>
      <div className="mb-4 flex items-center gap-3">
        <div className="text-2xl font-bold text-gray-900">¥{balance}</div>
        <button onClick={queryBalance} className="rounded bg-gray-600 px-3 py-1.5 text-xs text-white hover:bg-gray-700">
          刷新余额
        </button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button onClick={transferSafe} className="rounded bg-emerald-600 px-3 py-2 text-xs text-white hover:bg-emerald-700">
          ✅ 带 Token 转账
        </button>
        <button onClick={transferBlocked} className="rounded bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700">
          🛡️ 不带 Token（被拦截）
        </button>
        <button onClick={transferUnsafe} className="rounded bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700">
          ⚠️ 无防护接口转账
        </button>
        <button onClick={() => setLog([])} className="rounded bg-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-400">
          清空日志
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto rounded bg-gray-50 p-3 font-mono text-xs text-gray-700">
        {log.length === 0 ? <p className="text-gray-400">点击按钮观察日志</p> : log.map((l, i) => <p key={i}>{l}</p>)}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        考点：自定义 Header（X-CSRF-Token）无法被恶意站点跨域伪造（CORS 拦截）；SameSite Cookie 限制第三方携带。
      </p>
    </section>
  )
}
