import { useState, useMemo } from 'react'
import { categories, allQuestions, getQuestionsByCategory, type Category, type InterviewQuestion } from '@/data/interview'

export default function Interview() {
  const [activeCategory, setActiveCategory] = useState<'全部' | Category>('全部')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredQuestions = useMemo(() => {
    let list = activeCategory === '全部' ? allQuestions : getQuestionsByCategory(activeCategory)
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase()
      list = list.filter(
        (q) =>
          q.title.toLowerCase().includes(kw) ||
          q.summary.toLowerCase().includes(kw) ||
          q.category.toLowerCase().includes(kw),
      )
    }
    return list
  }, [activeCategory, searchKeyword])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">高级前端面试题库 🔥</h1>
        <p className="text-gray-600">
          涵盖交易系统、Python 异步、实时通信、React 原理、V8、网络协议、工程化、TypeScript、CSS、性能优化、安全等 11 大方向，
          共 <span className="font-bold text-primary-600">{allQuestions.length}</span> 道硬核题目
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-500">筛选：</span>
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
          placeholder="🔍 搜索题目关键词..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="space-y-4">
        {filteredQuestions.length === 0 && (
          <div className="card text-center text-gray-400 py-12">暂无匹配的题目</div>
        )}
        {filteredQuestions.map((q, index) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={index + 1}
            expanded={expandedId === q.id}
            onToggle={() => toggleExpand(q.id)}
          />
        ))}
      </div>
    </div>
  )
}

function QuestionCard({
  question,
  index,
  expanded,
  onToggle,
}: {
  question: InterviewQuestion
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
              {question.category}
            </span>
            {question.difficulty === 'expert' ? (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">专家级</span>
            ) : (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">困难</span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{question.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{question.summary}</p>
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

      {expanded && (
        <div className="mt-6 space-y-4">
          <AnswerContent content={question.answer} />

          {question.code && (
            <CodeBlock code={question.code} />
          )}

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">🔗 拓展阅读</h4>
            <div className="flex flex-wrap gap-2">
              {question.links.map((link, i) => (
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
