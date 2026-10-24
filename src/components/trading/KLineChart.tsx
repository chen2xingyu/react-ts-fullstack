import { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Kline } from '@/types/trading'

/**
 * 🎯 面试考点：UTCTimestamp 名义类型（nominal type）与秒级时间戳
 * lightweight-charts 要求 time 是「秒级」UTC 时间戳（前端 Date.now() 是毫秒），
 * 所以这里 /1000 再 Math.floor。它导出的不是 number，而是 UTCTimestamp —— 一个
 * 用品牌符号(brand)做的名义类型：TS→JS 后 brand 完全擦除，运行时就是普通 number，
 * 编译期却能挡住「把毫秒戳误传进去」这类错误（毫秒值会渲染成 1970 年的蜡烛）。
 * as UTCTimestamp 是边界层断言：把 number 喂给库要求的品牌类型，零运行时代码。
 */
function toTime(ts: string): UTCTimestamp {
  return Math.floor(new Date(ts).getTime() / 1000) as UTCTimestamp
}

/**
 * 🎯 面试考点：接口字符串金额 → Number 的显式转换
 * 后端常把价格/数量以字符串下发（避免 JSON 浮点精度丢失、防止大数溢出），
 * 前端展示层用 Number() 转成图需要的数值。易错点：直接用字符串做数值比较/计算会
 * 得到 NaN 或字符串拼接；真正的金额运算（撮合、结算）绝不能在前端用裸 double 做，
 * 那是后端/decimal 的职责，这里只负责「画」。TS→JS：函数返回对象的推断类型编译后
 * 全部擦除，只剩普通对象字面量。
 */
function toCandle(k: Kline) {
  return {
    time: toTime(k.ts),
    open: Number(k.open),
    high: Number(k.high),
    low: Number(k.low),
    close: Number(k.close),
  }
}

/**
 * K线图（lightweight-charts v5）
 * A股配色：红涨绿跌
 *
 * 关键点：历史 K 线接口目前返回空（Python 只发 Redis 不落 MySQL），
 * 此时 series 为空，直接 update() 画的蜡烛会落在未建立的时间轴区间里看不见。
 * 因此首根实时 kline 用 setData() 建立时间轴 + fitContent()，后续才用 update()。
 */
export default function KLineChart({
  symbol,
  kline,
  history,
}: {
  symbol?: string
  kline: Kline | null
  history: Kline[]
}) {
  /**
   * 🎯 面试考点：为什么图表实例放 ref 而不是 useState（高频）
   * createChart/addSeries 产生的是「命令式」句柄（Canvas 上下文、内部 DOM、订阅），
   * 它们不需要触发 React 重渲染——我们要的是持有它、在 effect 里命令式调用 update()。
   * 若放进 useState：每次 setChart 都会多一次渲染，且状态变化不回写图表，徒增协调成本；
   * ref.current 变异不触发渲染，正合「渲染无关的可变实例」。口诀：
   *   「要参与渲染输出 → state；只是后台账本/命令句柄 → ref」。
   * useRef<HTMLDivElement>(null) 的泛型 + null 是为了配合 TS 的 ref 回调类型安全。
   */
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  // series 是否已有数据：区分首根 bootstrap 与后续 update
  const hasDataRef = useRef(false)

  /**
   * 🎯 面试考点：Canvas 图表 vs SVG/div、空依赖挂载、ResizeObserver、副作用清理
   * (1) 为什么这类金融图表用 Canvas 而不是 SVG/DOM：K 线动辄上百根蜡烛+十字线+刻度，
   *   SVG 每个图形都是一个真实 DOM 节点，节点数随数据量线性膨胀，重排/重绘开销大；
   *   Canvas 是一块位图，所有图形画在同一画布上，框架只操作 1 个 DOM 节点，
   *   大数量级帧率高一个量级。lightweight-charts 内部即 Canvas 实现。
   *   反问「什么时候选 SVG？」——需要无障碍/事件拖拽每个图形节点、数据量小(<几十)时。
   * (2) 空依赖 [] ：图表实例只创建一次，组件存活期内复用；重复 createChart 会叠画布泄漏。
   * (3) 清晰度：高分屏(devicePixelRatio>1)下图库内部会把画布 backing store 按 dpr
   *   放大再用 CSS 缩回去，避免蜡烛发虚——这是手写 Canvas 时最常忘的一步。
   * (4) ResizeObserver：比 window.resize 精准监听容器自身宽度（含侧边栏折叠、面板拖拽），
   *   不必自己加防抖；resize 回调里只 applyOptions(width)，不重建图表。
   * (5) cleanup 必须 disconnect + chart.remove()：否则组件卸载后画布残留在容器里、
   *   定时器/观察器不释放，造成内存泄漏（面试常追问「useEffect 返回的清理函数何时执行」：
   *   下次 effect 重跑前 + 组件卸载时各一次）。
   */
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#374151',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
      },
      width: containerRef.current.clientWidth,
      height: 420,
      crosshair: { mode: 1 },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#ef5350', // A股红涨
      downColor: '#26a69a', // A股绿跌
      borderUpColor: '#ef5350',
      borderDownColor: '#26a69a',
      wickUpColor: '#ef5350',
      wickDownColor: '#26a69a',
    })

    chartRef.current = chart
    seriesRef.current = series
    hasDataRef.current = false

    // 自适应宽度
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      hasDataRef.current = false
    }
  }, [])

  /**
   * 🎯 面试考点：切换标的时的「竞态与脏数据」清理
   * 切 symbol 后，旧标的的最后一根实时 kline 可能还在半路到。若不主动清空，
   * 旧蜡烛会和新标的历史混在同一时间轴上。setData([]) 立刻清空 + hasDataRef 复位，
   * 让新标的走「首根 bootstrap → update」流程。追问：这里为什么用 effect 而不是在
   * render 期间联动？因为它是对「外部图表实例」的命令式副作用，不是派生渲染状态。
   */
  useEffect(() => {
    if (!seriesRef.current) return
    seriesRef.current.setData([])
    hasDataRef.current = false
  }, [symbol])

  /**
   * 🎯 面试考点：setData() vs update() 的语义差别（库设计必背）
   * setData(整批)：全量替换并【重建时间轴】，适合一次性灌入历史 500 根；
   * update(单根)：增量更新——time 与最后一根相同就覆盖最后一根，更晚才追加新根，
   *   性能远低于整批重建，适合逐 tick 推送。
   * fitContent() 让时间轴缩放适配全部数据。依赖 history（引用由 react-query 在
   * 数据到达时给出新引用），数据变才重灌，避免每次渲染重复 setData。
   */
  useEffect(() => {
    if (!seriesRef.current || history.length === 0) return
    seriesRef.current.setData(history.map(toCandle))
    hasDataRef.current = true
    chartRef.current?.timeScale().fitContent()
  }, [history])

  /**
   * 🎯 面试考点：实时推送下的重绘时机与「时间单调」不变量
   * 数据更新(WS 推送新 kline) → effect 跑 → 命令式 update() 触发重绘，而不是靠 React
   * 重渲染整棵组件树（图表是命令式的，React 只负责把 props 送进 effect）。
   * 同分钟：update 覆盖最后一根；跨分钟：自动追加新根并 scrollToRealTime() 跟随最新。
   * time 必须单调递增：若 WS 乱序晚到一根「更早」的蜡烛，update 会抛异常，
   * 这里 try/catch 吞掉——面试易错点：裸 catch 不记日志在生产排查时会吃亏，
   * 真实项目至少 console.warn 或上报。
   */
  useEffect(() => {
    if (!kline || !seriesRef.current) return
    const candle = toCandle(kline)
    try {
      if (!hasDataRef.current) {
        // 空图首根：用 setData 建立时间轴，否则蜡烛落在不可见区间
        seriesRef.current.setData([candle])
        hasDataRef.current = true
        chartRef.current?.timeScale().fitContent()
      } else {
        seriesRef.current.update(candle)
        chartRef.current?.timeScale().scrollToRealTime()
      }
    } catch {
      // time 不能回退，忽略异常
    }
  }, [kline])

  return <div ref={containerRef} className="w-full" />
}
