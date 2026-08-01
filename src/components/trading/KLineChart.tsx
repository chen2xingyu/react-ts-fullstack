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
 */
export default function KLineChart({
  kline,
  history,
}: {
  kline: Kline | null
  history: Kline[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

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
    }
  }, [])

  // 加载历史 K 线
  useEffect(() => {
    if (!seriesRef.current || history.length === 0) return
    seriesRef.current.setData(history.map(toCandle))
    chartRef.current?.timeScale().fitContent()
  }, [history])

  // 实时更新（同分钟更新最后一根，跨分钟追加新根）
  useEffect(() => {
    if (!kline || !seriesRef.current) return
    try {
      seriesRef.current.update(toCandle(kline))
    } catch {
      // time 不能回退，忽略异常
    }
  }, [kline])

  return <div ref={containerRef} className="w-full" />
}
