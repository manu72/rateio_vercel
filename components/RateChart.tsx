'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { loadActiveValue, saveActiveValue } from '@/lib/storage'
import { getCurrency } from '@/lib/currencies'
import { formatAmount } from '@/lib/converter'

interface RateChartProps {
  base: string
  target: string
  currentRate?: number | null
}

type Range = '1D' | '1W' | '1M' | '1Y' | '5Y'
const RANGE_DAYS: Record<Range, number> = { '1D': 1, '1W': 7, '1M': 30, '1Y': 365, '5Y': 1825 }
const RANGE_LABELS: Record<Range, string> = {
  '1D': '1 day', '1W': '1 week', '1M': '1 month', '1Y': '1 year', '5Y': '5 years',
}
const RANGES: Range[] = ['1D', '1W', '1M', '1Y', '5Y']
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8 }

function formatTick(value: number): string {
  if (value >= 100) return value.toFixed(1)
  if (value >= 10) return value.toFixed(2)
  return value.toFixed(4)
}

interface DataPoint {
  date: string
  rate: number
}

const MIN_HEIGHT = 120
const MAX_HEIGHT = 500
const DEFAULT_HEIGHT = 220

export default function RateChart({ base, target, currentRate }: RateChartProps) {
  const [range, setRange] = useState<Range>('1M')
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartHeight, setChartHeight] = useState(DEFAULT_HEIGHT)
  const [baseAmount, setBaseAmount] = useState('1')
  const dragStartY = useRef<number | null>(null)
  const dragStartHeight = useRef(DEFAULT_HEIGHT)

  const onDragStart = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY
    dragStartHeight.current = chartHeight
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [chartHeight])

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    const delta = e.clientY - dragStartY.current
    setChartHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.current + delta)))
  }, [])

  const onDragEnd = useCallback(() => {
    dragStartY.current = null
  }, [])

  const gradientId = `rateGradient-${base}-${target}`

  // Hydrate baseAmount from localStorage (browser-only API, unavailable during SSR)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setBaseAmount(loadActiveValue())
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset loading/error synchronously when deps change, then fetch
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const days = RANGE_DAYS[range]
    fetch(`/api/history?base=${base}&target=${target}&days=${days}`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load history')
        return r.json()
      })
      .then(({ dates, rates }: { dates: string[]; rates: number[] }) => {
        setData(dates.map((date, i) => ({ date, rate: rates[i] })))
      })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [base, target, range])
  /* eslint-enable react-hooks/set-state-in-effect */

  const high = data.length ? data.reduce((m, d) => Math.max(m, d.rate), -Infinity) : null
  const low = data.length ? data.reduce((m, d) => Math.min(m, d.rate), Infinity) : null

  const parsedBase = parseFloat(baseAmount) || 0
  const convertedAmount = currentRate != null ? (parsedBase * currentRate) : null

  function handleBaseInput(raw: string) {
    const parts = raw.replace(/[^0-9.]/g, '').split('.')
    const sanitised = parts.length > 1
      ? parts[0] + '.' + parts.slice(1).join('')
      : parts[0]
    setBaseAmount(sanitised)
    saveActiveValue(sanitised)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Range selector */}
      <div className="flex gap-2">
        {RANGES.map(r => (
          <button
            key={r}
            type="button"
            aria-label={RANGE_LABELS[r]}
            onClick={() => setRange(r)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-150 active:scale-95 ${
              range === r
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm hover:bg-blue-500 hover:text-white'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading && (
        <div className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" style={{ height: chartHeight }} />
      )}
      {error && (
        <p className="text-sm text-red-500 text-center py-8">{error}</p>
      )}
      {!loading && !error && data.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No data available for this range.</p>
      )}
      {!loading && !error && data.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm select-none">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis
                domain={['auto', 'auto']}
                orientation="left"
                mirror
                width={50}
                tickCount={4}
                tickFormatter={formatTick}
                tick={{ fontSize: 10, fill: '#94a3b8', dy: -6 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [typeof v === 'number' ? v.toFixed(4) : String(v), `${base}/${target}`]}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#3b82f6"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{data[0]?.date}</span>
            <span>{data[data.length - 1]?.date}</span>
          </div>

          {/* Drag handle */}
          <div
            className="flex justify-center pt-2 pb-0.5 cursor-ns-resize touch-none"
            aria-label="Drag to resize chart"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            <div className="w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors" />
          </div>
        </div>
      )}

      {/* Conversion card */}
      {currentRate != null && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 shadow-md">
            <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">{getCurrency(base)?.flag}</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{base}</span>
            <input
              type="text"
              inputMode="decimal"
              value={baseAmount}
              onChange={e => handleBaseInput(e.target.value)}
              className="ml-auto text-lg font-semibold text-right flex-1 max-w-[200px] rounded-lg px-3 py-1.5 outline-none transition-colors text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 ring-1 ring-blue-300 dark:ring-blue-700"
              aria-label={`Amount in ${base}`}
            />
          </div>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
            <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">{getCurrency(target)?.flag}</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{target}</span>
            <span className="ml-auto text-lg font-semibold text-right flex-1 max-w-[200px] rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700/50 truncate">
              {convertedAmount != null ? formatAmount(convertedAmount) : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      {!loading && !error && high !== null && low !== null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
            <p className="text-xs text-slate-400 mb-1">Period high</p>
            <p className="text-base font-bold text-green-500">{high.toFixed(4)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
            <p className="text-xs text-slate-400 mb-1">Period low</p>
            <p className="text-base font-bold text-red-500">{low.toFixed(4)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
