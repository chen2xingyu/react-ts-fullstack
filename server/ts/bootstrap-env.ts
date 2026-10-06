/**
 * v2 子应用注入（main.ts 的第二个 import，必须在旧 app.js 求值之前）
 *
 * 🎯 面试考点：Express 中间件栈在 app.js 模块求值时就定型了，
 * 所以在 main() 函数体里 app.use('/api/v2', ...) 会排在旧 404 后面而失效。
 * 这里在 app.js 被导入"之前"创建好 TS 子应用挂到 globalThis，
 * app.js 预留的挂载槽读到后立即转交，保证中间件顺序正确。
 */
import type { Express } from 'express'
import { createV2App } from './app.js'

declare global {
  // eslint-disable-next-line no-var
  var __labV2App: Express | undefined
}

globalThis.__labV2App = createV2App()
