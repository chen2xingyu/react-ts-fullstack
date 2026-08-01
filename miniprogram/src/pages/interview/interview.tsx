import { View, Text, ScrollView, Input } from '@tarojs/components'
import { useState, useMemo } from 'react'
import Taro from '@tarojs/taro'
import {
  getCategories,
  interviewQuestions,
  categoryTagColors,
  difficultyLabels,
  type InterviewQuestion,
} from '../../data/interview'
import './interview.scss'

export default function Interview() {
  const [activeCategory, setActiveCategory] = useState('全部')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const categories = ['全部', ...getCategories()]

  const filteredQuestions = useMemo(() => {
    let questions = interviewQuestions
    if (activeCategory !== '全部') {
      questions = questions.filter(q => q.category === activeCategory)
    }
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase()
      questions = questions.filter(
        q =>
          q.title.toLowerCase().includes(keyword) ||
          q.summary.toLowerCase().includes(keyword),
      )
    }
    return questions
  }, [activeCategory, searchKeyword])

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const copyCode = async (code: string) => {
    try {
      await Taro.setClipboardData({ data: code })
      Taro.showToast({ title: '已复制代码', icon: 'success' })
    } catch {
      Taro.showToast({ title: '复制失败', icon: 'none' })
    }
  }

  return (
    <View className='container'>
      <View className='search-bar'>
        <Text className='search-icon'>🔍</Text>
        <Input
          className='search-input'
          placeholder='搜索题目关键词...'
          value={searchKeyword}
          onInput={e => setSearchKeyword(e.detail.value)}
        />
      </View>

      <ScrollView scrollX className='category-scroll'>
        {categories.map(cat => (
          <View
            key={cat}
            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            <Text>{cat}</Text>
          </View>
        ))}
      </ScrollView>

      <View className='question-count'>
        <Text className='count-text'>共 {filteredQuestions.length} 题</Text>
      </View>

      <View className='question-list'>
        {filteredQuestions.map(q => (
          <QuestionCard
            key={q.id}
            question={q}
            expanded={expandedId === q.id}
            onToggle={() => toggleExpand(q.id)}
            onCopyCode={copyCode}
          />
        ))}
      </View>
    </View>
  )
}

interface QuestionCardProps {
  question: InterviewQuestion
  expanded: boolean
  onToggle: () => void
  onCopyCode: (code: string) => void
}

function QuestionCard({ question, expanded, onToggle, onCopyCode }: QuestionCardProps) {
  const tagClass = categoryTagColors[question.category] || ''
  const diffClass = `difficulty-${question.difficulty}`

  const formatAnswer = (answer: string) => {
    return answer
      .split('\n')
      .filter(line => line.trim())
      .map((line, i) => {
        const trimmed = line.trim()
        if (/^##/.test(trimmed)) {
          return <View key={i} className='answer-h2'>{trimmed.replace(/^#+\s*/, '')}</View>
        }
        if (/^\d+\.\s/.test(trimmed)) {
          return <View key={i} className='answer-list-item'>{trimmed}</View>
        }
        if (/^[-*]\s/.test(trimmed)) {
          return <View key={i} className='answer-bullet'>• {trimmed.slice(2)}</View>
        }
        return <View key={i} className='answer-p'>{trimmed}</View>
      })
  }

  return (
    <View className='question-card'>
      <View className='question-header' onClick={onToggle}>
        <View className='question-meta'>
          <View className={`tag ${tagClass}`}>{question.category}</View>
          <Text className={diffClass}>{difficultyLabels[question.difficulty]}</Text>
        </View>
        <View className='question-title'>{question.title}</View>
        <View className='question-summary'>{question.summary}</View>
        <View className='expand-icon'>
          <Text>{expanded ? '▲ 收起' : '▼ 展开'}</Text>
        </View>
      </View>

      {expanded && (
        <View className='question-body'>
          <View className='answer-section'>
            <View className='answer-label'>📖 详细答案</View>
            <View className='answer-content'>{formatAnswer(question.answer)}</View>
          </View>

          {question.code && (
            <View className='code-section'>
              <View className='code-header'>
                <Text className='code-label'>💻 代码示例</Text>
                <View className='code-copy-btn' onClick={() => onCopyCode(question.code!)}>
                  📋 复制
                </View>
              </View>
              <View className='code-block'>
                <Text className='code-text'>{question.code}</Text>
              </View>
            </View>
          )}

          {question.links.length > 0 && (
            <View className='links-section'>
              <View className='links-label'>🔗 拓展阅读</View>
              {question.links.map((link, i) => (
                <View
                  key={i}
                  className='link-item'
                  onClick={() => {
                    Taro.setClipboardData({ data: link.url })
                    Taro.showToast({ title: '链接已复制', icon: 'none' })
                  }}
                >
                  <Text className='link-title'>{link.title}</Text>
                  <Text className='link-site'>[{link.site}]</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}
