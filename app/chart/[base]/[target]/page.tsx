'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RateChart from '@/components/RateChart'
import { getCurrency } from '@/lib/currencies'
import { convert } from '@/lib/converter'

export default function ChartPage() {
  const params = useParams<{ base: string; target: string }>()
  const base = params.base.toUpperCase()
  const target = params.target.toUpperCase()
  const router = useRouter()
  const [currentRate, setCurrentRate] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/rates')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const fromRate = data.rates[base]
        const toRate = data.rates[target]
        if (fromRate == null || toRate == null) return
        setCurrentRate(convert(1, fromRate, toRate))
      })
      .catch(() => {})
  }, [base, target])

  const baseCurrency = getCurrency(base)
  const targetCurrency = getCurrency(target)

  if (!baseCurrency || !targetCurrency) {
    return (
      <main className="max-w-[430px] mx-auto p-4 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="go back"
          className="self-start text-blue-500 text-xl leading-none"
        >
          ‹
        </button>
        <p className="text-slate-500 text-sm">Invalid currency pair.</p>
      </main>
    )
  }

  return (
    <main className="max-w-[430px] mx-auto min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="go back"
          className="text-blue-500 text-xl leading-none"
        >
          ‹
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{baseCurrency.flag}</span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {base} → {target}
          </span>
          <span className="text-lg">{targetCurrency.flag}</span>
        </div>
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0">
          {currentRate !== null ? `1 ${base} = ${currentRate.toFixed(4)} ${target}` : '—'}
        </span>
      </div>

      {/* Chart */}
      <div className="flex-1 px-4 py-4">
        <RateChart base={base} target={target} />
      </div>
    </main>
  )
}
