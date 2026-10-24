/**
 * 🎯 面试考点：多 store 的组合模式 + set 的两种用法
 * Zustand 不强制「单一 store」，可按领域拆多个独立 store（这里是计数器 demo，
 * auth 在 store/auth.ts），各自独立订阅、互不影响，比 Redux 一个大 rootReducer 更解耦。
 * set 的两种传参：
 *   1) set({ count: 0 })          —— 传对象，直接浅合并；
 *   2) set(state => ({ count: state.count + 1 })) —— 传函数，基于最新前状态计算，
 *      用于「依赖旧值」的更新（increment/decrement），避免闭包拿到过期的 count。
 * 组件里订阅：const count = useCounterStore(s => s.count)，selector 精确订阅。
 */
import { create } from 'zustand'

interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}))
