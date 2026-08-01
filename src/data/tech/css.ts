import { TechPoint } from './types'

export const cssPoints: TechPoint[] = [
  {
    id: 'css-bfc',
    category: 'CSS 深入',
    depth: 'implementation',
    title: 'CSS 的 BFC（块格式化上下文）是什么？它如何解决 margin 折叠和浮动问题？',
    summary:
      'BFC 是一个独立的渲染区域，内部元素不会影响外部。可以通过 overflow:hidden、display:flow-root、position:absolute 等方式创建 BFC。',
    answer: `## 什么是 BFC
BFC（Block Formatting Context）是 CSS 2.1 规范中的一个概念，指一个独立的块级渲染区域。

## BFC 的布局规则
1. 内部的块级元素从上到下排列
2. 内部元素之间的 margin 不会与外部折叠
3. BFC 区域不会与浮动元素重叠
4. 计算 BFC 高度时，浮动子元素也参与计算

## 如何创建 BFC
| 属性 | 值 |
|------|------|
| overflow | hidden/auto/scroll |
| display | flow-root（标准方式） |
| position | absolute/fixed |
| float | left/right |
| display | inline-block/table-cell |
| contain | layout/content |

## BFC 的应用
### 1. 解决 margin 折叠
.parent { overflow: hidden; }
.child { margin-top: 50px; }  /* 不会与父元素折叠 */

### 2. 清除浮动
.container { overflow: hidden; }  /* BFC 包含浮动子元素 */

### 3. 防止浮动文字环绕
.text { overflow: hidden; }  /* 文字不环绕浮动图片 */`,
    code: `<!-- margin 折叠问题 -->
<div class="parent">
  <div class="child" style="margin-top: 50px;">子元素</div>
</div>

<!-- 解决方案：BFC -->
<div class="parent" style="overflow: hidden;">
  <div class="child" style="margin-top: 50px;">子元素</div>
</div>

<!-- 清除浮动 -->
<style>
  .container {
    display: flow-root;  /* 现代方式 */
  }
  .container::after {
    content: '';
    display: block;
    clear: both;
  }
</style>`,
    links: [
      { title: 'CSS BFC 详解 - 掘金', url: 'https://juejin.cn/post/2058617478998274066', site: '掘金' },
      { title: 'BFC 深入理解 - CSDN', url: 'https://blog.csdn.net/weixin_44827258/article/details/123965397', site: 'CSDN' },
    ],
  },
  {
    id: 'css-flex',
    category: 'CSS 深入',
    depth: 'implementation',
    title: 'Flexbox 的布局原理是什么？justify-content 和 align-items 的区别？',
    summary:
      'Flexbox 是一维布局模型，通过 flex container 和 flex item 实现。justify-content 控制主轴方向，align-items 控制交叉轴方向。',
    answer: `## Flex 核心概念
- 主轴（Main Axis）：flex-direction 指定的方向
- 交叉轴（Cross Axis）：与主轴垂直的方向
- 主轴起点/终点：main-start/main-end
- 交叉轴起点/终点：cross-start/cross-end

## justify-content（主轴对齐）
- flex-start：主轴起点对齐
- flex-end：主轴终点对齐
- center：居中对齐
- space-between：两端对齐，间距相等
- space-around：两端间距为中间间距的一半
- space-evenly：所有间距相等

## align-items（交叉轴对齐）
- flex-start：交叉轴起点对齐
- flex-end：交叉轴终点对齐
- center：居中对齐
- stretch：拉伸填充（默认）
- baseline：基线对齐

## 关键属性
- flex: 1 = flex: 1 1 0%（放大、缩小、基础尺寸）
- flex-grow：放大比例
- flex-shrink：缩小比例
- flex-basis：基础尺寸
- flex-wrap：换行控制

## 实战技巧
- 垂直居中：display:flex; align-items:center; justify-content:center
- 等分空间：flex:1
-  sticky footer：flex-direction:column; flex:1`,
    code: `/* 垂直居中 */
.center-box {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

/* 等分空间 */
.equal-width {
  display: flex;
}
.equal-width > div {
  flex: 1;
}

/* Sticky Footer */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.content {
  flex: 1;
}

/* 响应式导航 */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.nav-menu {
  display: flex;
  gap: 1rem;
}

/* 圣杯布局 */
.holy-grail {
  display: flex;
}
.sidebar { flex: 0 0 200px; }
.main { flex: 1; }
.aside { flex: 0 0 150px; }`,
    links: [
      { title: 'Flexbox 完全指南 - 掘金', url: 'https://juejin.cn/post/2756462919647989773', site: '掘金' },
      { title: 'Flex 布局深入理解 - 知乎', url: 'https://zhuanlan.zhihu.com/p/24658053', site: '知乎' },
    ],
  },
  {
    id: 'css-modules',
    category: 'CSS 深入',
    depth: 'implementation',
    title: 'CSS-in-JS、CSS Modules、Styled Components 的原理和区别？',
    summary:
      '三者都是解决样式隔离问题。CSS-in-JS 在运行时生成样式，CSS Modules 编译时生成唯一类名，Styled Components 基于 CSS-in-JS 增加组件化能力。',
    answer: `## CSS-in-JS
### 原理
- 运行时在 <head> 中插入 <style> 标签
- 样式与组件共进退，组件卸载时移除样式
- 支持动态样式、主题切换、RTL 等

### 代表库
- styled-components
- Emotion
- Material UI (makeStyles)

## CSS Modules
### 原理
- 编译时将类名转换为唯一 hash（如 .card__abc123）
- 通过 import styles from './xxx.module.css' 引用
- 构建时确定，无运行时开销

### 限制
- 只能使用 camelCase 类名
- 不能使用组合选择器
- 动态样式需要 inline style

## Styled Components
### 原理
- 基于 CSS-in-JS，使用 Tagged Template Literals
- 自动生成唯一类名
- 支持 props 动态样式
- 支持 ThemeProvider

## 对比
| 特性 | CSS-in-JS | CSS Modules | Styled Components |
|------|-----------|-------------|-------------------|
| 隔离方式 | 运行时 | 编译时 | 运行时 |
| 动态样式 | ✅ | ❌ | ✅ |
| 性能 | 中 | 高 | 中 |
| 学习成本 | 低 | 低 | 中 |
| SSR 支持 | 需要配置 | 原生支持 | 需要配置 |`,
    code: `// CSS Modules
import styles from './Button.module.css'
<button className={styles.primary}>按钮</button>

// 编译后
// .Button_primary__hash123 { background: blue; }
// <button class="Button_primary__hash123">按钮</button>

// Styled Components
import styled from 'styled-components'
const Button = styled.button\`
  background: \${props => props.primary ? 'blue' : 'gray'};
  color: white;
  padding: 8px 16px;
\`
<Button primary>按钮</Button>

// Emotion (CSS-in-JS)
import { css } from '@emotion/react'
const style = css\`
  background: blue;
  color: white;
\`
<div css={style}>内容</div>`,
    links: [
      { title: 'CSS-in-JS vs CSS Modules - 掘金', url: 'https://juejin.cn/post/3422871614450626562', site: '掘金' },
      { title: '样式方案对比 - 知乎', url: 'https://zhuanlan.zhihu.com/p/311451838', site: '知乎' },
    ],
  },
]
