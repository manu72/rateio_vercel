'use client'

import { useState } from 'react'

interface CurrencyRowProps {
  code: string
  name: string
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
  code, name, flag, value, isActive, showChartIcon,
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
        className={`group flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-3 shadow-sm transition-shadow ${
          isActive ? 'ring-2 ring-blue-500 rounded-xl' : 'rounded-xl'
        }`}
      >
        {/* Drag handle */}
        <span
          className="cursor-grab text-slate-300 dark:text-slate-600 select-none touch-none"
          aria-label="drag to reorder"
          {...dragHandleProps}
        >
          ⠿
        </span>

        {/* Flag */}
        <span className="text-2xl leading-none" aria-hidden="true">{flag}</span>

        {/* Code + name */}
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{code}</span>
          <span className="text-xs text-slate-400 truncate">{name}</span>
        </div>

        {/* Amount input */}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onFocus={onFocus}
          onChange={handleChange}
          className={`ml-auto text-xl font-semibold text-right w-28 bg-transparent outline-none text-slate-900 dark:text-slate-100 border-b ${
            isActive ? 'border-blue-500' : 'border-transparent'
          }`}
          aria-label={`${code} amount`}
        />

        {/* Chart icon */}
        {showChartIcon && (
          <button
            onClick={onChartClick}
            aria-label="chart"
            className="text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 transition-colors"
          >
            📈
          </button>
        )}

        {/* Remove button — hover-reveal on desktop */}
        <button
          onClick={onRemove}
          aria-label="remove currency"
          className="hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-center text-slate-300 hover:text-red-500 transition-opacity text-base leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
