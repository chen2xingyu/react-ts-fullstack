import AppRouter from './router'

/**
 * 🎯 面试考点：App 组件 = 纯路由壳（与 Vue 的 main 区别）
 * 在 Vue 里入口常是 new Vue({ router, render })；React 是“一切皆组件”，
 * 所以 App 只负责把 <AppRouter/>（即 <Routes> 树）挂出来，Provider（路由/缓存/StrictMode）
 * 全部在 main.tsx 里包。追问：“为什么不在 App 里包 Provider？”——
 * 因为要用 useNavigate/useLocation 的组件【必须】在 BrowserRouter 内部，
 * Provider 若放在 AppRouter 内部反而会把自己挡在路由上下文之外。
 */
function App() {
  return <AppRouter />
}

export default App
