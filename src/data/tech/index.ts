import { TechPoint, categories, Category } from './types'
import { tradingPoints } from './trading'
import { pythonPoints } from './python'
import { realtimePoints } from './realtime'
import { reactPoints } from './react'
import { v8Points } from './v8'
import { networkPoints } from './network'
import { engineeringPoints } from './engineering'
import { tsPoints } from './typescript'
import { cssPoints } from './css'
import { performancePoints } from './performance'
import { securityPoints } from './security'

export type { TechPoint, Category }

export { categories }

export const allPoints: TechPoint[] = [
  ...tradingPoints,
  ...pythonPoints,
  ...realtimePoints,
  ...reactPoints,
  ...v8Points,
  ...networkPoints,
  ...engineeringPoints,
  ...tsPoints,
  ...cssPoints,
  ...performancePoints,
  ...securityPoints,
]

export function getPointsByCategory(category: Category): TechPoint[] {
  return allPoints.filter((q) => q.category === category)
}

export function getPointById(id: string): TechPoint | undefined {
  return allPoints.find((q) => q.id === id)
}
