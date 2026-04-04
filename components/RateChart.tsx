'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { ExternalLink } from 'lucide-react'
import { loadActiveValue, saveActiveValue } from '@/lib/storage'
import { getCurrency } from '@/lib/currencies'
import { useHistory } from '@/hooks/use-history'

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

const MIN_HEIGHT = 120
const MAX_HEIGHT = 500
const DEFAULT_HEIGHT = 220

export default function RateChart({ base, target, currentRate }: RateChartProps) {
  const [range, setRange] = useState<Range>('1M')
  const days = RANGE_DAYS[range]
  const { data, error, isLoading: loading } = useHistory(base, target, days)
  const [chartHeight, setChartHeight] = useState(DEFAULT_HEIGHT)
  const [mounted, setMounted] = useState(false)
  const [activeSide, setActiveSide] = useState<'base' | 'target'>('base')
  const [activeAmount, setActiveAmount] = useState('1')
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

  // Hydrate activeAmount from localStorage and mark component as mounted.
  // mounted gates SWR-cached data so the first client render matches SSR (no hydration mismatch).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setActiveAmount(loadActiveValue())
    setMounted(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const high = data.length ? data.reduce((m, d) => Math.max(m, d.rate), -Infinity) : null
  const low = data.length ? data.reduce((m, d) => Math.min(m, d.rate), Infinity) : null

  const parsedActive = parseFloat(activeAmount) || 0

  const baseValue = activeSide === 'base'
    ? activeAmount
    : currentRate != null && currentRate !== 0
      ? (parsedActive / currentRate).toFixed(4)
      : ''

  const targetValue = activeSide === 'target'
    ? activeAmount
    : currentRate != null
      ? (parsedActive * currentRate).toFixed(4)
      : ''

  function handleFocus(side: 'base' | 'target') {
    if (side === activeSide || currentRate == null) return
    const derived = side === 'target'
      ? (parsedActive * currentRate).toFixed(4)
      : currentRate !== 0 ? (parsedActive / currentRate).toFixed(4) : '0'
    setActiveSide(side)
    setActiveAmount(derived)
  }

  function sanitiseNumeric(raw: string): string {
    const parts = raw.replace(/[^0-9.]/g, '').split('.')
    return parts.length > 1
      ? parts[0] + '.' + parts.slice(1).join('')
      : parts[0]
  }

  function handleInput(side: 'base' | 'target', raw: string) {
    const sanitised = sanitiseNumeric(raw)
    setActiveSide(side)
    setActiveAmount(sanitised)
    if (side === 'base') {
      saveActiveValue(sanitised)
    } else if (currentRate != null && currentRate !== 0) {
      saveActiveValue(((parseFloat(sanitised) || 0) / currentRate).toFixed(4))
    }
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
      {(!mounted || (loading && data.length === 0)) && (
        <div className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" style={{ height: chartHeight }} />
      )}
      {mounted && error && data.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs text-center py-2 px-4 rounded-lg">
          Could not refresh chart data. Showing cached data.
        </div>
      )}
      {mounted && !loading && error && data.length === 0 && (
        <p className="text-sm text-red-500 text-center py-8">{error}</p>
      )}
      {mounted && !loading && !error && data.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No data available for this range.</p>
      )}
      {mounted && data.length > 0 && (
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
          <div className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
            activeSide === 'base'
              ? 'bg-blue-50 dark:bg-blue-950/60 shadow-md'
              : 'bg-white dark:bg-slate-800 shadow-sm'
          }`}>
            <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">{getCurrency(base)?.flag}</span>
            <div className="flex flex-col min-w-0">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{base}</span>
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500 truncate">{getCurrency(base)?.name}</span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={baseValue}
              onFocus={() => handleFocus('base')}
              onChange={e => handleInput('base', e.target.value)}
              className={`ml-auto text-lg font-semibold text-right flex-1 max-w-[200px] rounded-lg px-3 py-1.5 outline-none transition-colors text-slate-900 dark:text-slate-100 ${
                activeSide === 'base'
                  ? 'bg-white dark:bg-slate-900 ring-1 ring-blue-300 dark:ring-blue-700'
                  : 'bg-slate-100 dark:bg-slate-700/50'
              }`}
              aria-label={`Amount in ${base}`}
            />
          </div>
          <div className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
            activeSide === 'target'
              ? 'bg-blue-50 dark:bg-blue-950/60 shadow-md'
              : 'bg-white dark:bg-slate-800 shadow-sm'
          }`}>
            <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">{getCurrency(target)?.flag}</span>
            <div className="flex flex-col min-w-0">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{target}</span>
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500 truncate">{getCurrency(target)?.name}</span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={targetValue}
              onFocus={() => handleFocus('target')}
              onChange={e => handleInput('target', e.target.value)}
              className={`ml-auto text-lg font-semibold text-right flex-1 max-w-[200px] rounded-lg px-3 py-1.5 outline-none transition-colors text-slate-900 dark:text-slate-100 ${
                activeSide === 'target'
                  ? 'bg-white dark:bg-slate-900 ring-1 ring-blue-300 dark:ring-blue-700'
                  : 'bg-slate-100 dark:bg-slate-700/50'
              }`}
              aria-label={`Amount in ${target}`}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      {mounted && data.length > 0 && high !== null && low !== null && (
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

      {/* View live rates on Google */}
      <a
        href={`https://www.google.com/search?q=exchange+rates+${base}+-+${target}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View live ${base} to ${target} rates (opens in a new tab)`}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-blue-500 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
      >
        View live rates
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    </div>
  )
}
