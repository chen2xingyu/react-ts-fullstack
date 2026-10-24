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
 *
 * overflow 锁原理：
 *   body 设 overflow:hidden 后，浏览器不再为 body 生成纵向滚动条、超出内容被裁剪，
 *   于是底层页面无法随滚轮/触摸滚动；而弹层自身若 fixed/absolute 定位在独立滚动容器内，仍可滚。
 *
 * 清理时机：
 *   依赖 [locked]，locked 变 false 或组件卸载时 effect cleanup 执行，
 *   把 overflow 还原成打开前保存的 originalOverflow——状态可回退、不留脏。
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
