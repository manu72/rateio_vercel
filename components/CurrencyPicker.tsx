'use client'

import { useMemo, useState } from 'react'
import { CURRENCIES } from '@/lib/currencies'

interface CurrencyPickerProps {
  selected: string[]
  onAdd: (code: string) => void
  onClose: () => void
}

export default function CurrencyPicker({ selected, onAdd, onClose }: CurrencyPickerProps) {
  const [query, setQuery] = useState('')
  const atMax = selected.length >= 10
  const selectedSet = useMemo(() => new Set(selected), [selected])

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      q
        ? CURRENCIES.filter(
            c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
          )
        : CURRENCIES,
    [q]
  )

  function handleSelect(code: string) {
    if (selectedSet.has(code)) return  // already added
    if (atMax) return                  // at limit
    onAdd(code)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <span className="flex-1 text-base font-bold text-slate-900 dark:text-slate-100">
          Add currency {atMax && <span className="text-xs font-normal text-amber-500">(max 10)</span>}
        </span>
        <button
          onClick={onClose}
          aria-label="close"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
        <input
          type="text"
          placeholder="Search currency..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full text-sm bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 outline-none text-slate-900 dark:text-slate-100"
          autoFocus
        />
      </div>

      {/* List */}
      <ul role="listbox" className="flex-1 overflow-y-auto">
        {filtered.map(currency => {
          const isSelected = selectedSet.has(currency.code)
          return (
            <li
              key={currency.code}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => handleSelect(currency.code)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelect(currency.code) }}
              className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800 cursor-pointer ${
                isSelected
                  ? 'opacity-50 cursor-default'
                  : atMax
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="text-xl">{currency.flag}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 w-12">{currency.code}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{currency.name}</span>
              {isSelected && <span className="ml-auto text-blue-500 text-sm">✓</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
