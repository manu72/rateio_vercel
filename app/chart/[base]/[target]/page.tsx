'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTheme } from '@/components/ThemeProvider'
import RateChart from '@/components/RateChart'
import CurrencyPicker from '@/components/CurrencyPicker'
import { getCurrency } from '@/lib/currencies'
import { convert } from '@/lib/converter'

export default function ChartPage() {
  const params = useParams<{ base: string; target: string }>()
  const base = params.base.toUpperCase()
  const target = params.target.toUpperCase()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [currentRate, setCurrentRate] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

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
      <main className="max-w-[430px] md:max-w-[600px] mx-auto p-4 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Go to home page"
          className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 cursor-pointer self-start hover:opacity-70 transition-opacity"
        >
          <Image src="/favicon-32x32.png" alt="" width={24} height={24} />
          Rateio
        </button>
        <p className="text-slate-500 text-sm">Invalid currency pair.</p>
      </main>
    )
  }

  return (
    <main className="max-w-[430px] md:max-w-[600px] mx-auto min-h-screen flex flex-col">
      {/* Header — 3-column: logo (left), currency pair (center), theme toggle (right) */}
      <header className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Go to home page"
          className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 cursor-pointer justify-self-start hover:opacity-70 transition-opacity"
        >
          <Image src="/favicon-32x32.png" alt="" width={24} height={24} />
          Rateio
        </button>
        <div className="flex items-center gap-2 justify-self-center">
          <span className="text-lg">{baseCurrency.flag}</span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {base} →
          </span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label={`Switch target currency, currently ${target}`}
            className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            {target} <span className="text-lg">{targetCurrency.flag}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          suppressHydrationWarning
          className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 justify-self-end"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      {/* Chart */}
      <div className="flex-1 px-4 py-4">
        <RateChart base={base} target={target} currentRate={currentRate} />
      </div>

      {pickerOpen && (
        <CurrencyPicker
          selected={[base, target]}
          onAdd={(code) => {
            setPickerOpen(false)
            router.push(`/chart/${base}/${code}`)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </main>
  )
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
