import { InterviewQuestion, categories, Category } from './types'
import { reactQuestions } from './react'
import { v8Questions } from './v8'
import { networkQuestions } from './network'
import { engineeringQuestions } from './engineering'
import { tsQuestions } from './typescript'
import { cssQuestions } from './css'
import { performanceQuestions } from './performance'
import { securityQuestions } from './security'

export type { InterviewQuestion, Category }

export { categories }

export const allQuestions: InterviewQuestion[] = [
  ...reactQuestions,
  ...v8Questions,
  ...networkQuestions,
  ...engineeringQuestions,
  ...tsQuestions,
  ...cssQuestions,
  ...performanceQuestions,
  ...securityQuestions,
]

export function getQuestionsByCategory(category: Category): InterviewQuestion[] {
  return allQuestions.filter((q) => q.category === category)
}

export function getQuestionsById(id: string): InterviewQuestion | undefined {
  return allQuestions.find((q) => q.id === id)
}
