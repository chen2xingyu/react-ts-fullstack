import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// 🎯 面试考点：Vitest 与 Vite 共用一套转换管线，
// 组件测试跑在 jsdom（浏览器环境模拟）里，别名与 vite.config.ts 保持一致
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})
