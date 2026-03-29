'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Header from '@/components/Header'
import CurrencyRow from '@/components/CurrencyRow'
import SkeletonRow from '@/components/SkeletonRow'
import CurrencyPicker from '@/components/CurrencyPicker'
import { convert, formatAmount } from '@/lib/converter'
import { loadCurrencies, saveCurrencies, loadActiveValue, saveActiveValue, loadActiveCurrency, saveActiveCurrency } from '@/lib/storage'
import { getCurrency, hasHistoricalData } from '@/lib/currencies'

interface RatesData {
  rates: Record<string, number>
  updatedAt: string
}

interface SortableCurrencyRowProps {
  id: string
  code: string
  rates: Record<string, number>
  activeCurrency: string
  activeValue: string
  showChartIcon: boolean
  chartDisabled: boolean
  chartPending: boolean
  onFocus: (code: string) => void
  onChange: (code: string, value: string) => void
  onChartClick: (code: string) => void
  onRemove: (code: string) => void
}

function SortableCurrencyRow(props: SortableCurrencyRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const currency = getCurrency(props.code)
  if (!currency) return null

  const displayValue = props.code === props.activeCurrency
    ? props.activeValue
    : formatAmount(
        convert(
          parseFloat(props.activeValue) || 0,
          props.rates[props.activeCurrency] ?? 1,
          props.rates[props.code] ?? 1,
        )
      )

  return (
    <div ref={setNodeRef} style={style}>
      <CurrencyRow
        code={currency.code}
        flag={currency.flag}
        value={displayValue}
        isActive={props.code === props.activeCurrency}
        showChartIcon={props.showChartIcon}
        chartDisabled={props.chartDisabled}
        onFocus={() => props.onFocus(props.code)}
        onChange={v => props.onChange(props.code, v)}
        chartPending={props.chartPending}
        onChartClick={() => props.onChartClick(props.code)}
        onRemove={() => props.onRemove(props.code)}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [currencies, setCurrencies] = useState<string[]>([])
  const [storageLoaded, setStorageLoaded] = useState(false)
  const [ratesData, setRatesData] = useState<RatesData | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [activeCurrency, setActiveCurrency] = useState<string>('')
  const [activeValue, setActiveValue] = useState<string>('1.00')
  const [showPicker, setShowPicker] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pendingChartCode, setPendingChartCode] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  // Hydrate from localStorage after mount (browser-only API, unavailable during SSR)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadCurrencies()
    setCurrencies(saved)
    const savedCurrency = loadActiveCurrency()
    setActiveCurrency(savedCurrency && saved.includes(savedCurrency) ? savedCurrency : saved[0])
    setActiveValue(loadActiveValue())
    setStorageLoaded(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist activeValue and activeCurrency to localStorage on change
  useEffect(() => {
    if (storageLoaded) saveActiveValue(activeValue)
  }, [activeValue, storageLoaded])

  useEffect(() => {
    if (storageLoaded) saveActiveCurrency(activeCurrency)
  }, [activeCurrency, storageLoaded])

  // Fetch live rates
  useEffect(() => {
    fetch('/api/rates')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((data: RatesData) => setRatesData(data))
      .catch(() => setLoadError(true))
  }, [])

  useEffect(() => {
    if (!activeCurrency || currencies.length < 2) return
    for (const code of currencies) {
      if (code !== activeCurrency && hasHistoricalData(activeCurrency) && hasHistoricalData(code)) {
        router.prefetch(`/chart/${activeCurrency}/${code}`)
      }
    }
  }, [activeCurrency, currencies, router])

  const handleFocus = useCallback((code: string) => {
    if (code !== activeCurrency && ratesData) {
      const converted = formatAmount(
        convert(
          parseFloat(activeValue) || 0,
          ratesData.rates[activeCurrency] ?? 1,
          ratesData.rates[code] ?? 1,
        )
      )
      setActiveValue(converted)
    }
    setActiveCurrency(code)
  }, [activeCurrency, activeValue, ratesData])

  const handleChange = useCallback((code: string, value: string) => {
    setActiveCurrency(code)
    setActiveValue(value)
  }, [])

  const handleChartClick = useCallback((code: string) => {
    setPendingChartCode(code)
    startTransition(() => {
      router.push(`/chart/${activeCurrency}/${code}`)
    })
  }, [activeCurrency, router, startTransition])

  const handleAdd = useCallback((code: string) => {
    setCurrencies(prev => {
      const next = [...prev, code]
      saveCurrencies(next)
      return next
    })
    setShowPicker(false)
  }, [])

  const handleRemove = useCallback((code: string) => {
    setCurrencies(prev => {
      const next = prev.filter(c => c !== code)
      saveCurrencies(next)
      if (activeCurrency === code) setActiveCurrency(next[0] ?? '')
      return next
    })
  }, [activeCurrency])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setCurrencies(prev => {
      const oldIdx = prev.indexOf(String(active.id))
      const newIdx = prev.indexOf(String(over.id))
      const next = arrayMove(prev, oldIdx, newIdx)
      saveCurrencies(next)
      return next
    })
  }, [])

  const isLoading = !storageLoaded || !ratesData

  return (
    <main className="max-w-[430px] md:max-w-[600px] mx-auto min-h-screen flex flex-col">
      <Header updatedAt={ratesData?.updatedAt ?? null} />

      {loadError && (
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs text-center py-2 px-4">
          Could not load rates. Showing cached data.
        </div>
      )}

      <div className="flex-1 px-3 py-3 flex flex-col gap-2.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={currencies} strategy={verticalListSortingStrategy}>
              {currencies.map(code => (
                <SortableCurrencyRow
                  key={code}
                  id={code}
                  code={code}
                  rates={ratesData.rates}
                  activeCurrency={activeCurrency}
                  activeValue={activeValue}
                  showChartIcon={currencies.length >= 2}
                  chartDisabled={!hasHistoricalData(activeCurrency) || !hasHistoricalData(code)}
                  chartPending={isPending && pendingChartCode === code}
                  onFocus={handleFocus}
                  onChange={handleChange}
                  onChartClick={handleChartClick}
                  onRemove={handleRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Add currency */}
        {!isLoading && currencies.length < 10 && (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-3 text-sm text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            <span className="text-lg">＋</span> Add currency
          </button>
        )}
      </div>

      {showPicker && (
        <CurrencyPicker
          selected={currencies}
          onAdd={handleAdd}
          onClose={() => setShowPicker(false)}
        />
      )}
    </main>
  )
}
