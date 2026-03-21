'use client'

import { useState } from 'react'
import { GripVertical, TrendingUp, X } from 'lucide-react'

interface CurrencyRowProps {
  code: string
  flag: string
  value: string
  isActive: boolean
  showChartIcon: boolean
  onFocus: () => void
  onChange: (value: string) => void
  onChartClick: () => void
  onRemove: () => void
  dragHandleProps: React.HTMLAttributes<HTMLElement>
}

export default function CurrencyRow({
  code, flag, value, isActive, showChartIcon,
  onFocus, onChange, onChartClick, onRemove, dragHandleProps,
}: CurrencyRowProps) {
  const [swiped, setSwiped] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const stripped = e.target.value.replace(/[^\d.]/g, '')
    const parts = stripped.split('.')
    const integer = parts[0] === '' && parts.length > 1 ? '0' : parts[0]
    const sanitised = parts.length > 1 ? integer + '.' + parts.slice(1).join('') : integer
    onChange(sanitised)
  }

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
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">{code}</span>
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

        {/* Chart icon */}
        {showChartIcon && (
          <button
            onClick={onChartClick}
            aria-label="chart"
            className="flex items-center justify-center w-[34px] h-[34px] rounded-[9px] cursor-pointer bg-green-50 text-green-600 hover:bg-[#86fcc8] hover:text-slate-900 active:scale-95 active:bg-[#6fe0b0] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#86fcc8] focus-visible:ring-offset-1 dark:bg-green-950 dark:text-green-400 dark:hover:bg-[#86fcc8] dark:hover:text-slate-900"
          >
            <TrendingUp size={20} />
          </button>
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
