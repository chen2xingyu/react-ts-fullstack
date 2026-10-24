import { useState, useMemo } from 'react'
import { categories, allPoints, getPointsByCategory, type Category, type TechPoint } from '@/data/tech'

export default function Tech() {
  // 🎯 面试考点：三组独立 state 的拆分设计
  // activeCategory：分类 tab，类型用联合字面量 '全部' | Category —— 比 string 严格，
  //   写错拼写（如 'Frontend'）编译期即报错；TS→JS：这串联合类型编译后完全擦除，
  //   运行时 activeCategory 就是个普通字符串，TS 只在编译期帮你拦拼写。
  // searchKeyword：搜索框受控值；expandedId：当前展开卡片 id，用「单个 id | null」
  //   而不是 Set<string> —— 手风琴式只允许展开一张，null 表示全部收起，状态最简。
  // 追问：若需求变成「可同时展开多张」，就应换成 Set/数组，别在 string|null 上硬塞。
  const [activeCategory, setActiveCategory] = useState<'全部' | Category>('全部')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 🎯 面试考点：派生数据用 useMemo 缓存，而不是再开一份 state
  // filteredPoints = 分类过滤 + 关键词过滤的结果，完全由 activeCategory /
  // searchKeyword 推导出来 —— 这类「可由现有 state 算出的值」不要另存 state
  // （否则两个 state 容易不同步：改了分类忘了同步过滤结果）。useMemo 只在依赖
  // [activeCategory, searchKeyword] 变化时重算，输入不变就复用上次结果，
  // 避免每次渲染都 list.filter 一遍。
  // 易错点①：依赖漏写 → 闭包拿到旧值；②把 useMemo 当万能性能药，小数据量 filter
  //   极快，memo 本身也有开销，按需用。
  // 追问：搜索为什么不防抖？这里是几十条本地数据，前端即时 filter 成本可忽略；
  //   若数据来自后端接口，就必须像 useDebounce 那样防抖再发请求。
  const filteredPoints = useMemo(() => {
    let list = activeCategory === '全部' ? allPoints : getPointsByCategory(activeCategory)
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase()
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(kw) ||
          p.summary.toLowerCase().includes(kw) ||
          p.category.toLowerCase().includes(kw),
      )
    }
    return list
  }, [activeCategory, searchKeyword])

  // 🎯 面试考点：函数式更新 setState(prev => ...)
  // prev === id ? null : id —— 再点同一张就收起（置 null），点别的就切过去。
  // 用函数形式拿 prev 而不是直接闭包 expandedId，是因为事件回调里状态可能被
  // 批量更新；函数式更新保证读到最新 state，避免闭包捕获旧值。
  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">项目技术难点解析 🔥</h1>
        <p className="text-gray-600">
          涵盖交易系统、Python 异步、实时通信、React 原理、V8、网络协议、工程化、TypeScript、CSS、性能优化、安全等{' '}
          {categories.length} 大方向，共 <span className="font-bold text-primary-600">{allPoints.length}</span> 个核心技术难点
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-500">分类：</span>
        {/* 🎯 面试考点：分类按钮 onClick 里的 as 断言
            cat 来自 ['全部', ...categories]：TS 推断为 string[]，直接
            setActiveCategory(cat) 会报「string 不能赋给 '全部'|Category」。
            这里用 as 断言收窄 —— 正确写法是断言成目标联合类型；
            易错：写成 cat as any 就等于放弃了类型检查。 */}
        {['全部', ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat as '全部' | Category)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              activeCategory === cat
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 搜索技术点关键词..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="space-y-4">
        {filteredPoints.length === 0 && (
          <div className="card text-center text-gray-400 py-12">暂无匹配的技术点</div>
        )}
        {/* 🎯 面试考点：列表 key 用稳定业务 id，不用 index
            key={p.id}：过滤/增删时 React 靠 key 识别「哪一项是哪一项」并就地复用 DOM；
            用 index 当 key 会在顺序变化时导致状态错位（这里卡片有 expanded 展开态，
            错位展开会串）。index 只用于展示编号。 */}
        {filteredPoints.map((p, index) => (
          <TechPointCard
            key={p.id}
            point={p}
            index={index + 1}
            expanded={expandedId === p.id}
            onToggle={() => toggleExpand(p.id)}
          />
        ))}
      </div>
    </div>
  )
}

// 🎯 面试考点：函数组件 props 的类型写法（解构 + 内联对象类型）
// { point, index, expanded, onToggle }: { point: TechPoint; ... }
// —— 在参数后面用对象字面量类型描述 props 形状，是 React 函数组件最常见写法。
// onToggle: () => void 表示「一个无参无返回值的函数」，调用方把 onClick 传进来。
// TS→JS：编译后这整段类型注解消失，组件就是个普通函数，props 是运行时对象。
// 追问：和 Vue 的区别 —— Vue props 靠 defineProps 声明、有运行时信息；React 靠 TS
//   类型静态约束，没有运行时校验；要运行时校验得另加 zod / prop-types。
function TechPointCard({
  point,
  index,
  expanded,
  onToggle,
}: {
  point: TechPoint
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="card transition-shadow hover:shadow-md">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-mono">#{String(index).padStart(2, '0')}</span>
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded">
              {point.category}
            </span>
            {point.depth === 'principle' ? (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">原理深度</span>
            ) : (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">实现要点</span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{point.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{point.summary}</p>
        </div>
        <button
          className={`ml-4 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 🎯 面试考点：{expanded && (...)} 条件渲染 = 不渲染即卸载
          收起时 AnswerContent/CodeBlock 整个不挂载（不是 CSS 隐藏），省渲染开销；
          代价是每次展开都重新挂载、内部 state 丢失（CodeBlock 的 copied 每次展开
          都重置，这里是刻意可接受的）。 */}
      {expanded && (
        <div className="mt-6 space-y-4">
          <AnswerContent content={point.answer} />

          {point.code && (
            <CodeBlock code={point.code} />
          )}

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">🔗 延伸阅读</h4>
            <div className="flex flex-wrap gap-2">
              {point.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 hover:underline"
                >
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                    {link.site}
                  </span>
                  {link.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 🎯 面试考点：把 Markdown 字符串手搓成 ReactNode（受控渲染 vs dangerouslySetInnerHTML）
// 为什么不直接 dangerouslySetInnerHTML？——录入的 content 里若混入 <script> 或
// onerror=...，innerHTML 会直接执行，是存储型 XSS。这里逐行解析成 <h4>/<li>/<p>
// 等安全标签，文本一律作为 React 子节点 {text} 渲染，React 默认对文本做 HTML
// 转义，天然防 XSS。currentList/listType 是「跨行累积」状态：连续的 "1. " 行先攒进
// currentList，遇到空行/新类型就 flushList() 一次性输出一个 <ol>/<ul>。
function AnswerContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let listType: 'ordered' | 'unordered' | null = null

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const ListTag = listType === 'ordered' ? 'ol' : 'ul'
      const className = listType === 'ordered' ? 'list-decimal' : 'list-disc'
      elements.push(
        <ListTag key={`list-${elements.length}`} className={`${className} ml-6 mb-2 space-y-1 text-gray-700`}>
          {currentList.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ListTag>,
      )
      currentList = []
      listType = null
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    if (trimmed === '') {
      flushList()
      return
    }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      flushList()
      elements.push(<hr key={idx} className="my-3 border-gray-200" />)
      return
    }

    // Code block delimiter - skip
    if (/^```/.test(trimmed)) {
      flushList()
      return
    }

    // Headers
    const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)/)
    if (headerMatch) {
      flushList()
      const level = headerMatch[1].length
      const text = headerMatch[2]
      const sizes: Record<number, string> = { 1: 'text-xl', 2: 'text-lg', 3: 'text-base' }
      elements.push(
        <h4 key={idx} className={`${sizes[level]} font-semibold text-gray-800 mt-3 mb-2`}>
          {text}
        </h4>,
      )
      return
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList()
      elements.push(
        <blockquote key={idx} className="border-l-4 border-primary-300 pl-4 py-1 my-2 text-gray-600 bg-primary-50">
          {renderInline(trimmed.slice(2))}
        </blockquote>,
      )
      return
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      if (listType !== 'ordered') flushList()
      listType = 'ordered'
      currentList.push(trimmed.replace(/^\d+\.\s/, ''))
      return
    }

    // Unordered list (must check after ordered)
    if (/^[-*]\s/.test(trimmed)) {
      if (listType !== 'unordered') flushList()
      listType = 'unordered'
      currentList.push(trimmed.slice(2))
      return
    }

    // Numbered content like "1. xxx" that's not a list item in markdown
    // Actually handled by ordered list above

    // Paragraph - but skip lines that start with number followed by period (which are ordered list)
    flushList()
    elements.push(<p key={idx} className="text-gray-700 leading-relaxed">{renderInline(trimmed)}</p>)
  })

  flushList()

  return <div className="space-y-2">{elements}</div>
}

// 🎯 面试考点：while + regex.exec 手动切分行内 **加粗**
// boldRegex.exec 循环匹配，match.index 给出每段位置，把「匹配之间的普通文本」和
// 「**加粗** 包裹的 <strong>」交替 push 进数组。普通字符串与 React 节点混合返回，
// 又是一处「不用 innerHTML」的安全渲染。
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let key = 0

  const boldRegex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <strong key={`b-${key++}`} className="font-semibold text-gray-900">
        {match[1]}
      </strong>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  // 🎯 面试考点：剪贴板 API + 降级方案，与「2 秒后复位 copied」
  // navigator.clipboard 需要 HTTPS/localhost 且在用户手势里触发；非安全上下文会
  // reject，catch 里退回到传统的隐藏 textarea + execCommand('copy')。
  // setCopied(true) 后 setTimeout 2s 复位按钮文案 —— 易错：组件卸载时 timer 未清，
  // 会对已卸载组件 setState，严谨写法用 useEffect cleanup 清掉 timer。
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? '✓ 已复制' : '📋 复制'}
      </button>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    </div>
  )
}
