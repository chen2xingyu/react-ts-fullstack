import { View, Text, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import { getCategories, techPoints, categoryColors, categoryTagColors } from '../../data/tech'
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
    ? techPoints.length
    : techPoints.filter(p => p.category === activeCategory).length

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category)
    Taro.switchTab({ url: '/pages/tech/tech' })
  }

  const handleStartPractice = () => {
    Taro.switchTab({ url: '/pages/tech/tech' })
  }

  return (
    <View className='container'>
      <View className='card hero'>
        <View className='hero-title'>🔥 项目技术难点解析</View>
        <View className='hero-desc'>
          涵盖 React 原理、V8、网络协议、工程化、TypeScript、CSS、性能优化、安全等技术方向
        </View>
        <View className='hero-stats'>
          <View className='stat-item'>
            <Text className='stat-num'>{techPoints.length}</Text>
            <Text className='stat-label'>个技术难点</Text>
          </View>
          <View className='stat-item'>
            <Text className='stat-num'>{categories.length}</Text>
            <Text className='stat-label'>大技术方向</Text>
          </View>
          <View className='stat-item'>
            <Text className='stat-num'>{filteredCount}</Text>
            <Text className='stat-label'>个/分类</Text>
          </View>
        </View>
        <View className='btn-primary' onClick={handleStartPractice}>
          查看技术难点 🚀
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
              {techPoints.filter(p => p.category === category).length} 个
            </Text>
          </View>
        ))}
      </View>

      <View className='section-title'>🔥 热门技术点</View>
      <ScrollView scrollX className='hot-scroll'>
        {techPoints.slice(0, 5).map(p => (
          <View
            key={p.id}
            className='hot-item'
            onClick={() => Taro.switchTab({ url: '/pages/tech/tech' })}
          >
            <View className={`tag ${categoryTagColors[p.category]}`}>{p.category}</View>
            <Text className='hot-title'>{p.title}</Text>
          </View>
        ))}
      </ScrollView>

      <View className='footer'>
        <Text className='footer-text'>💪 每天深入一个技术点，吃透项目原理</Text>
      </View>
    </View>
  )
}
