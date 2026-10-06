import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useDebounce,
  useThrottle,
  usePrevious,
  useInterval,
  useLocalStorage,
} from '.'

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('延迟 delay 毫秒后才更新值', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    })
    expect(result.current).toBe('a')

    rerender({ value: 'b' })
    expect(result.current).toBe('a') // 还没到时间，仍是旧值

    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('a') // 299ms 仍未更新

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('b') // 300ms 到达，更新
  })

  it('期间再次变化会重置计时', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    })
    rerender({ value: 'b' })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'c' }) // 重置计时
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('a') // 还没到
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('c')
  })
})

describe('useThrottle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('首次立即更新（leading）', () => {
    const { result, rerender } = renderHook(({ value }) => useThrottle(value, 300), {
      initialProps: { value: 0 },
    })
    rerender({ value: 1 })
    expect(result.current).toBe(1) // leading 立即更新
  })

  it('窗口内变化被节流，trailing 补上最后一帧', () => {
    const { result, rerender } = renderHook(({ value }) => useThrottle(value, 300), {
      initialProps: { value: 0 },
    })
    rerender({ value: 1 }) // leading → 1
    act(() => vi.advanceTimersByTime(100))
    rerender({ value: 2 })
    act(() => vi.advanceTimersByTime(100))
    rerender({ value: 3 })
    expect(result.current).toBe(1) // 窗口内仍是 1

    act(() => vi.advanceTimersByTime(100)) // 到达 300ms 窗口
    expect(result.current).toBe(3) // trailing 补上最后一帧 3
  })
})

describe('usePrevious', () => {
  it('返回上一次 render 的值', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 0 },
    })
    expect(result.current).toBeUndefined() // 首次没有上一次

    rerender({ value: 1 })
    expect(result.current).toBe(0)

    rerender({ value: 2 })
    expect(result.current).toBe(1)
  })
})

describe('useInterval', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('按 delay 周期执行回调', () => {
    const cb = vi.fn()
    renderHook(() => useInterval(cb, 1000))

    expect(cb).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1000))
    expect(cb).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(1000))
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('delay 为 null 时暂停', () => {
    const cb = vi.fn()
    const { rerender } = renderHook(({ delay }) => useInterval(cb, delay), {
      initialProps: { delay: 1000 as number | null },
    })
    act(() => vi.advanceTimersByTime(1000))
    expect(cb).toHaveBeenCalledTimes(1)

    rerender({ delay: null })
    act(() => vi.advanceTimersByTime(5000))
    expect(cb).toHaveBeenCalledTimes(1) // 暂停后不再调用
  })

  it('回调变化不需要重建定时器（拿到最新闭包）', () => {
    let count = 0
    const cb = vi.fn(() => count++)
    const { rerender } = renderHook(({ fn }) => useInterval(fn, 1000), {
      initialProps: { fn: cb },
    })

    const cb2 = vi.fn(() => count++)
    rerender({ fn: cb2 })
    act(() => vi.advanceTimersByTime(1000))
    expect(cb).not.toHaveBeenCalled() // 旧回调没被调用
    expect(cb2).toHaveBeenCalledTimes(1) // 新回调被调用（ref 模式生效）
  })
})

describe('useLocalStorage', () => {
  beforeEach(() => localStorage.clear())

  it('初始值来自 localStorage', () => {
    localStorage.setItem('k', JSON.stringify('hello'))
    const { result } = renderHook(() => useLocalStorage<string>('k', 'default'))
    expect(result.current[0]).toBe('hello')
  })

  it('localStorage 为空时用初始值', () => {
    const { result } = renderHook(() => useLocalStorage<string>('k', 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('setter 同时更新 state 和 localStorage', () => {
    const { result } = renderHook(() => useLocalStorage<string>('k', 'default'))
    act(() => result.current[1]('world'))
    expect(result.current[0]).toBe('world')
    expect(localStorage.getItem('k')).toBe(JSON.stringify('world'))
  })

  it('JSON 损坏时回退到初始值，不白屏', () => {
    localStorage.setItem('k', '{坏 json')
    const { result } = renderHook(() => useLocalStorage<string>('k', 'default'))
    expect(result.current[0]).toBe('default')
  })
})
