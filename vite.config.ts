import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * 🎯 面试考点：manualChunks 手动分包
         *
         * 策略：把不常变的第三方库单独打 chunk，利用浏览器长缓存；
         * 业务代码更新时 vendor hash 不变 → 用户无需重新下载大文件。
         *
         * - react-vendor: react/react-dom/router 框架层（最稳定，缓存最久）
         * - query-vendor: tanstack query 等数据层
         * - 面试追问：为什么不用默认分包？→ 默认按入口+动态 import 分，
         *   vendor 与业务混在同一 chunk，业务改一行全量失效
         */
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/react|react-dom|react-router|scheduler/.test(id)) return 'react-vendor'
            if (/@tanstack|zustand|axios/.test(id)) return 'query-vendor'
            return 'vendor'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
