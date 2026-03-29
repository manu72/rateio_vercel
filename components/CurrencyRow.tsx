'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { GripVertical, TrendingUp, X, Loader2 } from 'lucide-react'

interface CurrencyRowProps {
  code: string
  flag: string
  value: string
  isActive: boolean
  showChartIcon: boolean
  chartDisabled: boolean
  chartPending: boolean
  onFocus: () => void
  onChange: (value: string) => void
  onChartClick: () => void
  onRemove: () => void
  dragHandleProps: React.HTMLAttributes<HTMLElement>
}

export default function CurrencyRow({
  code, flag, value, isActive, showChartIcon, chartDisabled, chartPending,
  onFocus, onChange, onChartClick, onRemove, dragHandleProps,
}: CurrencyRowProps) {
  const [swiped, setSwiped] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const stripped = e.target.value.replace(/[^\d.]/g, '')
    const parts = stripped.split('.')
    const integer = parts[0] === '' && parts.length > 1 ? '0' : parts[0]
    const sanitised = parts.length > 1 ? integer + '.' + parts.slice(1).join('') : integer
    onChange(sanitised)
  }

  useEffect(() => {
    return () => { if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current) }
  }, [])

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return
    const delta = touchStartX - e.changedTouches[0].clientX
    if (delta > 60) setSwiped(true)   // swipe left reveals delete
    if (delta < -60) setSwiped(false) // swipe right hides delete
    setTouchStartX(null)
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete button revealed on swipe-left (mobile) */}
      <div
        className={`absolute inset-y-0 right-0 flex items-center transition-all duration-200 ${
          swiped ? 'w-20 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <button
          onClick={onRemove}
          aria-label="delete"
          className="h-full w-20 bg-red-500 text-white text-sm font-semibold"
        >
          Remove
        </button>
      </div>

      {/* Main row */}
      <div
        data-testid="currency-row"
        style={{ transform: swiped ? 'translateX(-80px)' : 'translateX(0)', transition: 'transform 0.2s' }}
        className={`group flex items-center gap-3 pr-3 pl-0 py-3 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-950/60 shadow-md'
            : 'bg-white dark:bg-slate-800 shadow-sm'
        }`}
      >
        {/* Drag handle — wraps flag + code to create a large touch target */}
        <div
          className="flex items-center gap-3 cursor-grab active:cursor-grabbing touch-none select-none self-stretch"
          aria-label="drag to reorder"
          {...dragHandleProps}
        >
          <GripVertical size={16} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
          <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">{flag}</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{code}</span>
        </div>

        {/* Amount input */}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onFocus={onFocus}
          onChange={handleChange}
          className={`ml-auto text-2xl font-semibold text-right flex-1 max-w-[200px] rounded-lg px-3 py-1.5 outline-none transition-colors text-slate-900 dark:text-slate-100 ${
            isActive
              ? 'bg-white dark:bg-slate-900 ring-1 ring-blue-300 dark:ring-blue-700'
              : 'bg-slate-100 dark:bg-slate-700/50'
          }`}
          aria-label={`${code} amount`}
        />

        {/* Chart icon — hidden for active currency since base-to-same chart is meaningless */}
        {showChartIcon && !isActive && !chartDisabled && (
          <button
            onClick={chartPending ? undefined : onChartClick}
            disabled={chartPending}
            aria-label={chartPending ? 'Loading chart' : 'chart'}
            className={`flex items-center justify-center w-[34px] h-[34px] rounded-[9px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#86fcc8] focus-visible:ring-offset-1 ${
              chartPending
                ? 'bg-green-100 text-green-500 dark:bg-green-900/60 dark:text-green-400'
                : 'cursor-pointer bg-green-50 text-green-600 hover:bg-[#86fcc8] hover:text-slate-900 active:scale-95 active:bg-[#6fe0b0] dark:bg-green-950 dark:text-green-400 dark:hover:bg-[#86fcc8] dark:hover:text-slate-900'
            }`}
          >
            {chartPending
              ? <Loader2 size={20} className="motion-safe:animate-spin" />
              : <TrendingUp size={20} />}
          </button>
        )}

        {showChartIcon && !isActive && chartDisabled && (
          <ChartDisabledIcon
            tooltipVisible={tooltipVisible}
            onShow={() => {
              setTooltipVisible(true)
              if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
              tooltipTimeout.current = setTimeout(() => setTooltipVisible(false), 2500)
            }}
            onHide={() => {
              if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
              setTooltipVisible(false)
            }}
          />
        )}

        {/* Remove button — hover-reveal on desktop */}
        <button
          onClick={onRemove}
          aria-label="remove currency"
          className="hidden md:flex items-center justify-center w-[30px] h-[30px] rounded-[8px] cursor-pointer opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:bg-red-500 hover:text-white active:scale-95 active:bg-red-600 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function ChartDisabledIcon({
  tooltipVisible,
  onShow,
  onHide,
}: {
  tooltipVisible: boolean
  onShow: () => void
  onHide: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  const updatePos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.top - 8, right: document.documentElement.clientWidth - rect.right })
  }, [])

  useLayoutEffect(() => {
    if (tooltipVisible) updatePos()
  }, [tooltipVisible, updatePos])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={onShow}
        onMouseEnter={onShow}
        onMouseLeave={onHide}
        aria-label="Historical data unavailable"
        className="flex items-center justify-center w-[34px] h-[34px] rounded-[9px] bg-slate-100 text-slate-300 dark:bg-slate-700 dark:text-slate-500 cursor-default"
      >
        <TrendingUp size={20} />
      </button>
      {tooltipVisible && pos && createPortal(
        <div
          role="tooltip"
          style={{ top: pos.top, right: pos.right, transform: 'translateY(-100%)' }}
          className="fixed z-50 w-48 rounded-lg bg-slate-800 dark:bg-slate-700 px-3 py-2 text-xs text-white shadow-lg"
        >
          Historical data is unavailable for this currency
        </div>,
        document.body,
      )}
    </>
  )
}
