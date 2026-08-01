export interface TechLink {
  title: string
  url: string
  site: '掘金' | 'CSDN' | '知乎' | '博客园' | 'GitHub' | '其他'
}

export interface TechPoint {
  id: string
  category: string
  depth: 'implementation' | 'principle'
  title: string
  summary: string
  answer: string
  code?: string
  links: TechLink[]
}

export const categories = [
  '交易系统',
  'Python 异步',
  '实时通信',
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
