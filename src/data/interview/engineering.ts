import { InterviewQuestion } from './types'

export const engineeringQuestions: InterviewQuestion[] = [
  {
    id: 'webpack-hmr',
    category: '工程化',
    difficulty: 'expert',
    title: 'Webpack 的 HMR（热模块替换）原理是什么？它与 Vite 的 HMR 有什么区别？',
    summary:
      'Webpack HMR 基于 webpack-dev-server + WebSocket 推送变更，对比模块差异后局部更新。Vite 基于浏览器原生 ESM，HMR 粒度更细、速度更快。',
    answer: `## Webpack HMR 原理
1. 启动阶段：webpack-dev-server 建立 WebSocket 连接
2. 文件变更：webpack 重新编译，对比模块差异，生成更新块
3. 推送更新：服务器通过 WebSocket 推送更新块给客户端
4. 客户端处理：接收更新块 → 加载新模块 → 执行 accept 回调

## Vite HMR 核心差异
| 特性 | Webpack HMR | Vite HMR |
|------|-------------|----------|
| 构建时机 | 启动时全量编译 | 按需编译 |
| 传输方式 | WebSocket + 更新块 | HTTP 直接请求模块 |
| 更新粒度 | chunk 级别 | 模块级别 |
| 更新速度 | 慢（大型项目） | 快（几乎瞬时） |

## Vite HMR 原理
1. 修改源文件后，Vite 仅编译变更的文件
2. 通过 WebSocket 通知浏览器模块路径变更
3. 浏览器通过 ESM import 重新加载该模块
4. 只更新受影响的组件，不刷新页面`,
    code: `// Webpack HMR
if (module.hot) {
  module.hot.accept('./dependency', () => {
    const newDep = require('./dependency')
  })
  module.hot.accept()  // 接受自身模块更新
}

// Vite HMR
if (import.meta.hot) {
  import.meta.hot.accept('./data.json', (newModule) => {
    console.log('数据更新了', newModule)
  })
}`,
    links: [
      { title: 'Webpack HMR 原理详解 - 掘金', url: 'https://juejin.cn/post/7170378583347654688', site: '掘金' },
      { title: 'Vite HMR 与 Webpack HMR 对比 - 知乎', url: 'https://zhuanlan.zhihu.com/p/541617049', site: '知乎' },
    ],
  },
  {
    id: 'monorepo',
    category: '工程化',
    difficulty: 'hard',
    title: 'Monorepo 架构如何设计？Turborepo、Nx、pnpm workspace 的工作原理是什么？',
    summary:
      'Monorepo 管理多个包在一个仓库。pnpm workspace 管理依赖、Turborepo/Nx 提供增量构建缓存。核心理念是依赖图驱动的任务编排。',
    answer: `## Monorepo 核心问题
1. 依赖管理：多个包共享依赖版本
2. 构建编排：按依赖顺序构建
3. 增量缓存：跳过未变更的包
4. 代码共享：跨包引用代码

## pnpm workspace
- pnpm-workspace.yaml 定义包路径
- workspace: 协议引用内部包
- 内容寻址存储 + 硬链接复用

## Turborepo 原理
1. 构建图：分析 package.json 的 dependsOn 字段
2. 增量计算：基于文件 hash 和 git diff 判断
3. 远程缓存：CI/CD 中缓存构建产物
4. 并行执行：利用多核并行构建

## 方案对比
| 特性 | pnpm workspace | Turborepo | Nx |
|------|---------------|-----------|-----|
| 包管理 | ✅ 内置 | ❌ | ❌ |
| 增量缓存 | ❌ | ✅ | ✅ |
| 构建编排 | ❌ | ✅ | ✅ |
| 远程缓存 | ❌ | ✅ | ✅ |`,
    code: `// pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'

// package.json (workspace root)
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}

// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}

// apps/web/package.json
{
  "dependencies": {
    "@pkg/ui": "workspace:*",     // 引用内部包
    "@pkg/utils": "workspace:*",
  }
}`,
    links: [
      { title: 'Monorepo 架构设计 - 掘金', url: 'https://juejin.cn/post/7212909573988575282', site: '掘金' },
      { title: 'Turborepo vs Nx 对比 - 知乎', url: 'https://zhuanlan.zhihu.com/p/655604378', site: '知乎' },
    ],
  },
  {
    id: 'vite-principle',
    category: '工程化',
    difficulty: 'expert',
    title: 'Vite 的核心原理是什么？它是如何做到比 Webpack 快 10-100 倍的？',
    summary:
      'Vite 基于浏览器原生 ESM，开发时不打包，按需编译。生产使用 Rollup 打包。利用 esbuild 预构建依赖，冷启动速度极快。',
    answer: `## Vite 快的核心原因
### 1. 原生 ESM
- 开发时不打包，浏览器直接加载 ESM 模块
- 只有当浏览器请求某个模块时才编译
- 没有 bundle 过程的 I/O 和解析开销

### 2. esbuild 预构建
- 使用 Go 编写的 esbuild 预构建依赖
- 预构建结果缓存在 node_modules/.vite
- 避免 CommonJS → ESM 的转换开销

### 3. 按需编译
- 只编译被请求的模块
- 修改单个文件只编译该文件
- 没有全量重新编译

## 与 Webpack 对比
| 特性 | Webpack | Vite |
|------|---------|------|
| 开发启动 | 全量打包（秒级~分钟级） | 按需编译（毫秒级） |
| 修改热更新 | 重新打包模块 | 单文件编译+HMR |
| 内存占用 | 高 | 低 |
| 生产构建 | 内置 | Rollup（更优） |`,
    code: `// Vite 核心配置
export default defineConfig({
  optimizeDeps: {
    include: ['react', 'react-dom'],  // 强制预构建
  },
  plugins: [react()],
  resolve: {
    alias: { '@': './src' },
  },
  server: {
    port: 5173,
    hmr: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})`,
    links: [
      { title: 'Vite 核心原理揭秘 - 掘金', url: 'https://juejin.cn/post/7140236257339664397', site: '掘金' },
      { title: 'Vite vs Webpack 原理对比 - 知乎', url: 'https://zhuanlan.zhihu.com/p/651601829', site: '知乎' },
    ],
  },
  {
    id: 'engineering-child-process-runner',
    category: '工程化',
    difficulty: 'expert',
    title: '在线 Python 执行器如何实现？child_process.spawn 为什么写临时文件而不是 -c？',
    summary:
      'spawn 执行用户代码，写临时文件而非 spawn -c 避免引号转义且支持长代码；30s 超时 SIGKILL 防死循环；cwd 隔离到 tmpdir，执行完删除；MAX_LEN 截断防过载。',
    answer: `## 在线代码执行的核心难点
1. **执行隔离**：用户代码可能死循环/读写文件/调系统命令，不能影响宿主进程
2. **超时控制**：死循环必须能强制终止
3. **编码处理**：中文输出不能乱码
4. **资源限制**：代码长度、输出长度都要限制

## spawn vs exec vs fork
| API | 特点 | 适用 |
|---|---|---|
| spawn | 流式输出，不缓冲，参数数组 | 长输出、大程序（本项目） |
| exec | 缓冲全部输出，有 maxBuffer，shell 解析 | 简单命令，输出小 |
| fork | spawn 子进程版，自带 IPC 通道 | Node 子进程通信 |

本项目用 spawn：流式收集 stdout/stderr，避免 exec 的 maxBuffer 溢出，且参数数组避免 shell 注入。

## 为什么写临时文件而非 spawn -c
\`spawn('python', ['-c', code])\` 把代码作命令行参数：
- ❌ 引号/转义地狱：代码含单引号、反斜杠、$ 符号会破坏命令行
- ❌ 命令行长度限制（Windows 32K），长代码直接截断
- ✅ 写 .py 临时文件再 spawn 文件路径：完全规避上述问题

## 安全与资源控制
1. **超时 SIGKILL**：30s 定时器，到点 \`proc.kill('SIGKILL')\` 强杀死循环
2. **工作目录隔离**：\`cwd: os.tmpdir()\`，限制文件操作范围
3. **临时文件清理**：close/error 回调都调 cleanup 删 .py 文件
4. **输出截断**：MAX_LEN 50000 字符防超大输出撑爆内存
5. **编码**：\`PYTHONIOENCODING=utf-8\` 保证中文输出正确

## 更强的隔离：Docker 沙箱
本项目用 tmpdir + 超时做基础隔离，生产环境在线执行器更应 Docker/容器化：限制 CPU/内存/网络/文件系统，彻底防逃逸。`,
    code: `const { spawn } = require('child_process')
const TIMEOUT_MS = 30000

function runCode(code) {
  return new Promise((resolve) => {
    // 写临时文件，避免 -c 的引号转义和长度限制
    const tmpFile = path.join(os.tmpdir(), \`pyrun_\${Date.now()}.py\`)
    fs.writeFileSync(tmpFile, code, 'utf8')

    const proc = spawn(PYTHON, [tmpFile], {
      cwd: os.tmpdir(),                              // 工作目录隔离
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
    })

    proc.stdout.on('data', (d) => stdoutChunks.push(d))
    proc.stderr.on('data', (d) => stderrChunks.push(d))

    // 超时强杀，防死循环
    const timer = setTimeout(() => {
      timedOut = true
      proc.kill('SIGKILL')
    }, TIMEOUT_MS)

    proc.on('close', (exitCode) => {
      clearTimeout(timer)
      fs.unlinkSync(tmpFile)                         // 清理临时文件
      resolve({ stdout, stderr, exitCode, timedOut })
    })
  })
}`,
    links: [
      { title: 'Node.js child_process 详解 - 掘金', url: 'https://juejin.cn/post/6844904183347654688', site: '掘金' },
      { title: '在线代码执行沙箱设计 - 知乎', url: 'https://zhuanlan.zhihu.com/p/651601829', site: '知乎' },
    ],
  },
]
