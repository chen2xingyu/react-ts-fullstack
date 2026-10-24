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
// 🎯 面试必背：XSS 三型区分（常考）
//   1. 存储型（Stored）：恶意脚本被存进数据库（评论/简介），其他用户访问时被读取执行
//      —— 危害最大，影响面广。
//   2. 反射型（Reflected）：恶意脚本拼在 URL 参数里，服务端「反射」回页面立即执行
//      —— 典型载体是钓鱼链接 https://x.com/search?q=<script>...。
//   3. DOM 型：服务端根本没参与，纯前端 JS 把 location.hash / location.search
//      直接塞进 innerHTML —— 本演示的 payload 若被写入 innerHTML 就是 DOM 型。
// 共性：本质都是「数据被当成代码执行」；防御核心=输入转义 + 输出编码 + CSP。
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
          {/* 🎯 原理：React 默认对 JSX 插值做 HTML 实体转义（< → &lt; 等），
              所以 {input} 天然安全；但 dangerouslySetInnerHTML 是「显式告诉 React
              这就是 HTML，别转义」，于是 <img onerror=...> 被原样插入 DOM → 立即触发。
              正误对比：
              ✅ <div>{userInput}</div>                 —— 当纯文本渲染，安全
              ✅ <div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(html)}} /> —— 富文本必须先消毒
              ❌ <div dangerouslySetInnerHTML={{__html: userInput}} /> —— 裸奔，等同 innerHTML
              追问：为什么叫 __html 双下划线？历史上是为了「防止用户直接用」，
              提醒开发者这是 escape hatch，不是普通 API。 */}
          <div data-testid="xss-dangerous" className="min-h-[40px] rounded bg-white p-2 text-sm" dangerouslySetInnerHTML={{ __html: input }} />
          <p className="mt-2 text-xs text-red-600">onerror 会执行 alert（真实环境会偷 Cookie/发请求）</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="mb-2 text-xs font-medium text-emerald-700">✅ textContent / JSX 插值（安全）</div>
          {/* 🎯 原理：{input} 走的是 createTextNode → 等价于 textContent，
              浏览器把内容当纯文本，< > " ' 全部当字符显示，不解析标签。 */}
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
// 🎯 面试考点：CSRF（跨站请求伪造）原理一句话——
//   「浏览器在请求时会自动带上目标域的 Cookie」，所以恶意站点只要能诱导
//   你的浏览器「自动发一个 POST 到银行接口」，服务器就分不清是你点的还是别人骗的。
//
// 🎯 本演示三按钮对应的三种防御姿势：
//   1. ✅ 带 X-CSRF-Token（自定义 header）—— 为什么恶意站点伪造不了？
//      因为 Content-Type: application/json + 自定义 header 属于「非简单请求」，
//      浏览器会先发 OPTIONS 预检，恶意站点的响应没有 CORS 放行，真实请求根本发不出去。
//   2. 🛡️ 不带 Token（被拦截 403）—— 服务端校验失败直接拒。
//   3. ⚠️ 无防护接口 —— 演示「裸奔」状态下谁都能调。
//
// 🎯 三大防御（必背）：
//   - CSRF Token：服务端下发随机 token，前端请求时回传，跨站读不到这个值。
//   - SameSite Cookie=Lax/Strict：浏览器规定跨站请求不带 Cookie（最现代方案）。
//   - 校验 Origin / Referer header：服务端判断请求是不是自家页面发的。
//
// 🎯 顺带一句 CSP：Content-Security-Policy 响应头限制「脚本只能从哪个源加载、
//    禁止 inline script」，即使 XSS 注入成功也执行不了，是 XSS 的第二道防线。
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
