export interface InterviewLink {
  title: string
  url: string
  site: '掘金' | 'CSDN' | '知乎' | '博客园' | 'GitHub' | '其他'
}

export interface InterviewQuestion {
  id: string
  category: string
  difficulty: 'hard' | 'expert'
  title: string
  summary: string
  answer: string
  code?: string
  links: InterviewLink[]
}

export const categories = [
  'React 原理',
  'V8 & 浏览器',
  '网络与协议',
  '工程化',
  'TypeScript',
  'CSS 深入',
  '性能优化',
  '安全',
] as const

export type Category = (typeof categories)[number]
