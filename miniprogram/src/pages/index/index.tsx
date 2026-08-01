import { View, Text, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import { getCategories, interviewQuestions, categoryColors, categoryTagColors } from '../../data/interview'
import './index.scss'

const categoryIcons: Record<string, string> = {
  'React 原理': '⚛️',
  'V8 & 浏览器': '🔧',
  '网络与协议': '🌐',
  '工程化': '🛠️',
  'TypeScript': '📘',
  'CSS 深入': '🎨',
  '性能优化': '⚡',
  '安全': '🛡️',
}

export default function Index() {
  const categories = getCategories()
  const [activeCategory, setActiveCategory] = useState<string>('全部')

  const filteredCount = activeCategory === '全部'
    ? interviewQuestions.length
    : interviewQuestions.filter(q => q.category === activeCategory).length

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category)
    Taro.switchTab({ url: '/pages/interview/interview' })
  }

  const handleStartPractice = () => {
    Taro.switchTab({ url: '/pages/interview/interview' })
  }

  return (
    <View className='container'>
      <View className='card hero'>
        <View className='hero-title'>🔥 高级前端面试题库</View>
        <View className='hero-desc'>
          涵盖 React 原理、V8、网络协议、工程化、TypeScript、CSS、性能优化、安全等 8 大方向
        </View>
        <View className='hero-stats'>
          <View className='stat-item'>
            <Text className='stat-num'>{interviewQuestions.length}</Text>
            <Text className='stat-label'>道硬核题目</Text>
          </View>
          <View className='stat-item'>
            <Text className='stat-num'>{categories.length}</Text>
            <Text className='stat-label'>大技术方向</Text>
          </View>
          <View className='stat-item'>
            <Text className='stat-num'>{filteredCount}</Text>
            <Text className='stat-label'>题/分类</Text>
          </View>
        </View>
        <View className='btn-primary' onClick={handleStartPractice}>
          开始刷题 🚀
        </View>
      </View>

      <View className='section-title'>📚 技术分类</View>
      <View className='category-grid'>
        {categories.map(category => (
          <View
            key={category}
            className='category-item'
            style={{ backgroundColor: categoryColors[category] }}
            onClick={() => handleCategoryClick(category)}
          >
            <Text className='category-icon'>{categoryIcons[category]}</Text>
            <Text className='category-name'>{category}</Text>
            <Text className='category-count'>
              {interviewQuestions.filter(q => q.category === category).length} 题
            </Text>
          </View>
        ))}
      </View>

      <View className='section-title'>🔥 热门题目</View>
      <ScrollView scrollX className='hot-scroll'>
        {interviewQuestions.slice(0, 5).map(q => (
          <View
            key={q.id}
            className='hot-item'
            onClick={() => Taro.switchTab({ url: '/pages/interview/interview' })}
          >
            <View className={`tag ${categoryTagColors[q.category]}`}>{q.category}</View>
            <Text className='hot-title'>{q.title}</Text>
          </View>
        ))}
      </ScrollView>

      <View className='footer'>
        <Text className='footer-text'>💪 每天复习 3 题，拿下高级前端 offer</Text>
      </View>
    </View>
  )
}
