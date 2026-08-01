import { InterviewQuestion } from './types'

export const securityQuestions: InterviewQuestion[] = [
  {
    id: 'xss',
    category: '安全',
    difficulty: 'hard',
    title: 'XSS 攻击的原理是什么？如何从前端角度防御 XSS？',
    summary:
      'XSS（跨站脚本）攻击是在页面中注入恶意脚本执行。存储型危害最大。防御方法：输入校验、输出转义、CSP、HttpOnly Cookie、DOMPurify。',
    answer: `## XSS 攻击类型
### 1. 反射型 XSS
- URL 参数注入恶意脚本
- 示例：example.com/search?q=<script>alert('XSS')</script>
- 危害：盗取用户 Cookie/Token、发起操作

### 2. 存储型 XSS
- 恶意脚本存储到数据库中
- 其他用户访问时触发
- 危害：危害范围最广

### 3. DOM 型 XSS
-前端代码直接使用用户输入操作 DOM
- 示例：document.write(urlParams.name)

## 防御方案

### 1. 输出转义
将特殊字符转为 HTML 实体：
- < → <
- > → >
- & → &
- " → "
- ' → '

### 2. 使用安全 API
- 禁止使用 innerHTML、document.write
- 使用 textContent、setAttribute
- 使用框架安全 API（React 默认转义）

### 3. CSP（内容安全策略）
通过 HTTP 头限制可执行的脚本来源：
Content-Security-Policy: default-src 'self'; script-src 'self'

### 4. HttpOnly Cookie
设置 cookie 时加上 HttpOnly 标记，JS 无法读取

### 5. DOMPurify
对 HTML 内容进行白名单过滤，清除危险标签和事件`,
    code: `// React 默认转义 - 安全
// <div>{userInput}</div>
// 即使 userInput = '<script>alert(1)</script>'，也会被转义显示

// ❌ 危险：直接插入 HTML
dangerouslySetInnerHTML={{ __html: userInput }}

// ✅ 安全：使用 DOMPurify 过滤
import DOMPurify from 'dompurify'
const cleanHtml = DOMPurify.sanitize(userInput)
dangerouslySetInnerHTML={{ __html: cleanHtml }}

// ✅ 使用安全的第三方库
// marked + DOMPurify 组合
import { marked } from 'marked'
const html = marked(userMarkdown)
const cleanHtml = DOMPurify.sanitize(html)

// CSP 响应头示例
// Content-Security-Policy:
//   default-src 'self'
//   script-src 'self' 'unsafe-inline'
//   style-src 'self' 'unsafe-inline'
//   img-src 'self' data:
//   connect-src 'self' https://api.example.com

// Cookie 安全设置
// Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict`,
    links: [
      { title: 'XSS 攻击与防御 - 掘金', url: 'https://juejin.cn/post/7214305089924382777', site: '掘金' },
      { title: 'OWASP XSS 防御指南 - 官方', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Scripting_Prevention_Cheat_Sheet.html', site: '其他' },
    ],
  },
  {
    id: 'cors',
    category: '安全',
    difficulty: 'hard',
    title: 'CORS 跨域的完整流程是怎样的？简单请求和预检请求有什么区别？',
    summary:
      'CORS 通过 HTTP 头部实现跨域资源共享。简单请求直接发送，预检请求先 OPTIONS 协商。关键头部：Access-Control-Allow-Origin、Access-Control-Allow-Credentials。',
    answer: `## 跨域原因
浏览器的同源策略：协议、域名、端口三者必须相同。

## CORS 解决方案

### 简单请求
满足所有条件：
- 方法：GET/POST/HEAD
- Content-Type：text/plain、application/x-www-form-urlencoded、multipart/form-data
- 不使用自定义请求头

流程：
1. 浏览器直接发送请求
2. 服务器返回 Access-Control-Allow-Origin 等头部
3. 浏览器判断是否允许跨域

### 预检请求（Preflight）
不满足简单请求条件时触发：

1. 浏览器发送 OPTIONS 请求，携带：
   - Origin：请求源
   - Access-Control-Request-Method：实际请求方法
   - Access-Control-Request-Headers：自定义头

2. 服务器返回：
   - Access-Control-Allow-Origin：允许的源
   - Access-Control-Allow-Methods：允许的方法
   - Access-Control-Allow-Headers：允许的头
   - Access-Control-Max-Age：预检缓存时间

3. 浏览器发送实际请求

## 关键注意事项
- 不能使用通配符 + 凭证（Credentials）
- 凭证模式下必须指定具体 Origin
- Vite dev server proxy 可以开发时绕过 CORS`,
    code: `// 服务器 CORS 配置
// Express
const cors = require('cors')

// 允许所有源（不安全）
app.use(cors())

// 指定源（推荐）
app.use(cors({
  origin: ['http://localhost:5173', 'https://example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}))

// Nginx CORS 配置
server {
  location /api {
    add_header Access-Control-Allow-Origin $http_origin;
    add_header Access-Control-Allow-Credentials true;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    
    if ($request_method = OPTIONS) {
      return 204;
    }
  }
}

// Vite 开发代理（开发时绕过 CORS）
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})`,
    links: [
      { title: 'CORS 跨域详解 - 掘金', url: 'https://juejin.cn/post/6844904170556149640', site: '掘金' },
      { title: 'MDN CORS 文档 - MDN', url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS', site: '其他' },
    ],
  },
  {
    id: 'csrf',
    category: '安全',
    difficulty: 'hard',
    title: 'CSRF 攻击原理是什么？SameSite Cookie 和 Token 验证如何防御？',
    summary:
      'CSRF 诱导已登录用户在不知情的情况下发送请求。防御方法：SameSite Cookie、CSRF Token、Referer/Origin 校验、Double Submit Cookie。',
    answer: `## CSRF 攻击原理
1. 用户已登录目标网站 A，Cookie 保存在浏览器
2. 用户访问恶意网站 B
3. 网站 B 包含一个向网站 A 发送请求的表单/图片
4. 浏览器自动携带 Cookie 发送请求
5. 网站 A 认为是用户主动操作

## 防御方案

### 1. SameSite Cookie
- Strict：完全禁止第三方携带
- Lax：只允许 GET 导航携带
- None：允许所有（必须搭配 Secure）

### 2. CSRF Token
- 服务器生成 Token，存入 Session
- 每次请求需携带 Token（Header 或 Form）
- 服务器验证 Token 与 Session 是否匹配

### 3. Double Submit Cookie
- 服务器设置一个 Cookie：csrfToken=abc123
- 前端读取 Cookie，在请求中携带 X-CSRF-Token 头
- 后端校验两者是否一致（无需 Session 存储）

### 4. Referer/Origin 校验
- 检查请求来源是否在允许列表中
- 简单但不够灵活

## React 项目实践
- 使用 axios/ fetch 时自动附加 CSRF Token
- 登录后从接口获取 Token 存入 Cookie
- 每次请求自动读取 Cookie 中的 Token 放入 Header`,
    code: `// Double Submit Cookie 实现
// 后端登录时设置 Cookie
// Set-Cookie: XSRF-TOKEN=randomToken; HttpOnly=false; SameSite=Lax

// 前端 axios 拦截器
import axios from 'axios'
import Cookies from 'js-cookie'

const axiosInstance = axios.create({
  baseURL: '/api',
})

// 自动读取 XSRF-TOKEN Cookie 并放入请求头
axiosInstance.interceptors.request.use((config) => {
  const token = Cookies.get('XSRF-TOKEN')
  if (token) {
    config.headers['X-CSRF-Token'] = token
  }
  return config
})

// 后端校验中间件
function csrfProtection(req, res, next) {
  const cookieToken = req.cookies['XSRF-TOKEN']
  const headerToken = req.headers['x-csrf-token']
  
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF 校验失败' })
  }
  next()
}

// SameSite Cookie
// Set-Cookie: sessionId=xxx; SameSite=Lax; HttpOnly; Secure`,
    links: [
      { title: 'CSRF 攻击与防御 - 掘金', url: 'https://juejin.cn/post/7214305089924382777', site: '掘金' },
      { title: 'OWASP CSRF 防御指南 - 官方', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site-Request-Forgery_Prevention_Cheat_Sheet.html', site: '其他' },
    ],
  },
]
