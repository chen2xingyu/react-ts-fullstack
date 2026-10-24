/**
 * 🎯 面试考点：barrel file（聚合导出）
 *
 * 把 hacks 目录下所有 Hook 从一个统一入口 re-export，调用方写
 *   import { useDebounce } from '@/hacks'
 * 而不必关心文件散落在哪。
 * 好处：对外 API 收敛、改名/迁移只动这一处；配合 named export 利于 tree-shaking。
 * 代价：若聚合过多且不做按需引入，可能把本不需要的模块也拉进首包。
 *
 * TS→JS：这里全是纯 re-export 语句，泛型/类型不产生运行时代码；
 *   ES Module 下 tree-shaking 会在生产构建时删掉调用方没用到的导出。
 */
export { useDebounce } from './useDebounce'
export { useThrottle } from './useThrottle'
export { usePrevious } from './usePrevious'
export { useInterval } from './useInterval'
export { useTimeout } from './useTimeout'
export { useClickOutside } from './useClickOutside'
export { useLockBodyScroll } from './useLockBodyScroll'
export { useLocalStorage } from './useLocalStorage'
export { useMediaQuery } from './useMediaQuery'
export { useIntersectionObserver } from './useIntersectionObserver'
export { useFetch, type FetchState } from './useFetch'
