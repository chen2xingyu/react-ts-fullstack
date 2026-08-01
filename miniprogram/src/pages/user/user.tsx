import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { interviewQuestions, getCategories } from '../../data/interview'
import './user.scss'

export default function User() {
  const categories = getCategories()

  const handleClearCache = () => {
    Taro.showModal({
      title: '确认清除',
      content: '确定要清除所有缓存数据吗？',
      success: res => {
        if (res.confirm) {
          Taro.clearStorageSync()
          Taro.showToast({ title: '已清除', icon: 'success' })
        }
      },
    })
  }

  const handleContact = () => {
    Taro.showModal({
      title: '联系作者',
      content: '如果你有任何建议或反馈，欢迎联系我们！',
      showCancel: false,
      confirmText: '好的',
    })
  }

  return (
    <View className='container'>
      <View className='profile-card'>
        <View className='avatar'>👨‍💻</View>
        <View className='user-info'>
          <Text className='user-name'>前端开发者</Text>
          <Text className='user-desc'>每天进步一点点，面试不再慌</Text>
        </View>
      </View>

      <View className='stats-card'>
        <View className='stats-item'>
          <Text className='stats-num'>{interviewQuestions.length}</Text>
          <Text className='stats-label'>题库总数</Text>
        </View>
        <View className='stats-divider' />
        <View className='stats-item'>
          <Text className='stats-num'>{categories.length}</Text>
          <Text className='stats-label'>技术方向</Text>
        </View>
        <View className='stats-divider' />
        <View className='stats-item'>
          <Text className='stats-num'>{interviewQuestions.length}</Text>
          <Text className='stats-label'>已收录</Text>
        </View>
      </View>

      <View className='menu-list'>
        <View className='menu-item' onClick={() => Taro.switchTab({ url: '/pages/interview/interview' })}>
          <Text className='menu-icon'>📚</Text>
          <Text className='menu-text'>开始刷题</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={() => {
          Taro.setClipboardData({ data: 'https://juejin.cn/tag/前端' })
          Taro.showToast({ title: '链接已复制', icon: 'none' })
        }}>
          <Text className='menu-icon'>🔗</Text>
          <Text className='menu-text'>掘金前端</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={() => {
          Taro.setClipboardData({ data: 'https://segmentfault.com/t/前端' })
          Taro.showToast({ title: '链接已复制', icon: 'none' })
        }}>
          <Text className='menu-icon'>🔗</Text>
          <Text className='menu-text'>SegmentFault</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={handleClearCache}>
          <Text className='menu-icon'>🗑️</Text>
          <Text className='menu-text'>清除缓存</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={handleContact}>
          <Text className='menu-icon'>💬</Text>
          <Text className='menu-text'>意见反馈</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item'>
          <Text className='menu-icon'>ℹ️</Text>
          <Text className='menu-text'>关于我们</Text>
          <Text className='menu-arrow'>v1.0.0</Text>
        </View>
      </View>

      <View className='footer'>
        <Text className='footer-text'>React + TypeScript 面试题库</Text>
        <Text className='footer-sub'>Powered by Taro · 仅供学习交流</Text>
      </View>
    </View>
  )
}
