import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * 🎯 面试考点：CSP（Content-Security-Policy）是 XSS 的第二道防线
 *
 * 思路：即使攻击者成功把 <script> 注入页面，CSP 也会因为「脚本只能来自同源」
 * 而拒绝执行，同时禁止 inline script / eval，把 XSS 从「可执行」降级为「只是文本」。
 *
 * 为什么只在 build 阶段注入、不放进 index.html：
 * Vite dev server 依赖 inline script（HMR 客户端注入）和 ws 连接，
 * 直接写死在 index.html 会把开发体验打断。生产产物才是需要受约束的形态。
 *
 * 各字段含义：
 * - default-src 'self'        兜底：其他资源默认只允许同源
 * - script-src 'self'         禁止 inline script 与 eval（这条是防 XSS 的核心）
 * - style-src 'unsafe-inline' Tailwind 之外仍有 style={{}} 内联样式，必须放行
 * - img-src data: https:      允许 data URI 与图床图片
 * - connect-src ws: wss:      WebSocket 行情推送（同源部署时 'self' 即可覆盖）
 * - object-src 'none'         禁掉 <object>/<embed> 这类插件挂载点
 * - base-uri 'self'           防止 <base> 被注入后劫持相对路径
 * - form-action 'self'        防止表单被劫持提交到外部站点
 *
 * 补充：真实部署更推荐由 Nginx / Express 响应头下发，支持 frame-ancestors、report-uri
 * （这两个字段在 <meta> 里无效）；这里用 meta 是为了构建产物自带防护、零部署依赖。
 */
const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function prodCspPlugin(): Plugin {
  return {
    name: 'inject-prod-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: PROD_CSP },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

export default defineConfig({
  plugins: [react(), prodCspPlugin()],
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
