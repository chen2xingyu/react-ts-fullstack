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

function toTime(ts: string): UTCTimestamp {
  return Math.floor(new Date(ts).getTime() / 1000) as UTCTimestamp
}

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
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  // series 是否已有数据：区分首根 bootstrap 与后续 update
  const hasDataRef = useRef(false)

  // 初始化图表
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

  // 切标的：清空旧蜡烛，等新标的的首根 kline 重建
  useEffect(() => {
    if (!seriesRef.current) return
    seriesRef.current.setData([])
    hasDataRef.current = false
  }, [symbol])

  // 加载历史 K 线（有则用历史；无则由实时 kline bootstrap）
  useEffect(() => {
    if (!seriesRef.current || history.length === 0) return
    seriesRef.current.setData(history.map(toCandle))
    hasDataRef.current = true
    chartRef.current?.timeScale().fitContent()
  }, [history])

  // 实时更新（同分钟更新最后一根，跨分钟追加新根）
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
