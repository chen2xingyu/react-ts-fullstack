import { View, Text, ScrollView, Input } from '@tarojs/components'
import { useState, useMemo } from 'react'
import Taro from '@tarojs/taro'
import {
  getCategories,
  techPoints,
  categoryTagColors,
  depthLabels,
  type TechPoint,
} from '../../data/tech'
import './tech.scss'

export default function Tech() {
  const [activeCategory, setActiveCategory] = useState('全部')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const categories = ['全部', ...getCategories()]

  const filteredPoints = useMemo(() => {
    let points = techPoints
    if (activeCategory !== '全部') {
      points = points.filter(p => p.category === activeCategory)
    }
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase()
      points = points.filter(
        p =>
          p.title.toLowerCase().includes(keyword) ||
          p.summary.toLowerCase().includes(keyword),
      )
    }
    return points
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
          placeholder='搜索技术点关键词...'
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
        <Text className='count-text'>共 {filteredPoints.length} 个技术点</Text>
      </View>

      <View className='question-list'>
        {filteredPoints.map(p => (
          <TechPointCard
            key={p.id}
            point={p}
            expanded={expandedId === p.id}
            onToggle={() => toggleExpand(p.id)}
            onCopyCode={copyCode}
          />
        ))}
      </View>
    </View>
  )
}

interface TechPointCardProps {
  point: TechPoint
  expanded: boolean
  onToggle: () => void
  onCopyCode: (code: string) => void
}

function TechPointCard({ point, expanded, onToggle, onCopyCode }: TechPointCardProps) {
  const tagClass = categoryTagColors[point.category] || ''
  const depthClass = `depth-${point.depth}`

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
          <View className={`tag ${tagClass}`}>{point.category}</View>
          <Text className={depthClass}>{depthLabels[point.depth]}</Text>
        </View>
        <View className='question-title'>{point.title}</View>
        <View className='question-summary'>{point.summary}</View>
        <View className='expand-icon'>
          <Text>{expanded ? '▲ 收起' : '▼ 展开'}</Text>
        </View>
      </View>

      {expanded && (
        <View className='question-body'>
          <View className='answer-section'>
            <View className='answer-label'>📖 深度解析</View>
            <View className='answer-content'>{formatAnswer(point.answer)}</View>
          </View>

          {point.code && (
            <View className='code-section'>
              <View className='code-header'>
                <Text className='code-label'>💻 代码示例</Text>
                <View className='code-copy-btn' onClick={() => onCopyCode(point.code!)}>
                  📋 复制
                </View>
              </View>
              <View className='code-block'>
                <Text className='code-text'>{point.code}</Text>
              </View>
            </View>
          )}

          {point.links.length > 0 && (
            <View className='links-section'>
              <View className='links-label'>🔗 延伸阅读</View>
              {point.links.map((link, i) => (
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
