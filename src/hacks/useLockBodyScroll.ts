import { useEffect } from 'react'

/**
 * 🎯 面试考点：弹层打开时锁定 body 滚动
 *
 * 实现：设置 body.style.overflow = 'hidden'，卸载/锁定关闭时还原。
 * 进阶问题：多个弹层同时打开怎么避免互相干扰？
 *   - 方案 A：用模块级计数器记录锁定次数，只有归零才还原（适合多弹层场景）
 *   - 方案 B：每个弹层还原时只还原自己保存的原始值（简单但可能互相覆盖）
 *   这里用"保存原始值再还原"的简单方案，教学用；生产建议计数器。
 *
 * 另外：移动端还需处理 touchmove 事件的 preventDefault，否则仍能滚动。
 */
export function useLockBodyScroll(locked = true) {
  useEffect(() => {
    if (!locked) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [locked])
}
