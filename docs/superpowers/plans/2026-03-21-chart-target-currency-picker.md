# Chart Target Currency Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the target currency in the chart page header clickable, opening a currency picker to switch the comparison currency.

**Architecture:** Single-file change to `app/chart/[base]/[target]/page.tsx`. The existing `CurrencyPicker` component is reused as-is. The target currency code + flag become a `<button>` that opens the picker; on selection the page navigates to the new chart URL.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, React `useState`, existing `CurrencyPicker` component

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/chart/[base]/[target]/page.tsx` | Modify | Add picker state, restructure header center, render CurrencyPicker |
| `__tests__/chart-toggle.test.tsx` | Modify | Add tests for picker open/close and navigation |

---

## Task 1: Add clickable target currency with picker

**Files:**
- Modify: `app/chart/[base]/[target]/page.tsx`
- Modify: `__tests__/chart-toggle.test.tsx`

### Current state of the file for reference

`app/chart/[base]/[target]/page.tsx` currently has these imports:
```tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import RateChart from '@/components/RateChart'
import { getCurrency } from '@/lib/currencies'
import { convert } from '@/lib/converter'
```

The header center section (inside the main return) currently looks like:
```tsx
<div className="flex items-center gap-2 flex-1 min-w-0">
  <span className="text-lg">{baseCurrency.flag}</span>
  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
    {base} → {target}
  </span>
  <span className="text-lg">{targetCurrency.flag}</span>
</div>
```

There is no `CurrencyPicker` import or render in this file currently.

---

- [ ] **Step 1: Write the failing tests**

Add three new tests to `__tests__/chart-toggle.test.tsx`. The existing file already has:
- `mockUseParams` setup
- `jest.mock('next/navigation', ...)`
- `global.fetch` mock
- `renderChart()` helper
- `beforeEach` cleanup
- 3 existing tests inside `describe('ChartPage theme toggle', ...)`

Add a new `describe` block at the end of the file:

```tsx
describe('ChartPage target currency picker', () => {
  it('renders target currency as a clickable button', () => {
    renderChart()
    expect(screen.getByRole('button', { name: /switch target currency/i })).toBeInTheDocument()
  })

  it('opens currency picker when target button is clicked', async () => {
    renderChart()
    await userEvent.click(screen.getByRole('button', { name: /switch target currency/i }))
    // CurrencyPicker renders a search input when open
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('navigates to new chart URL when a currency is selected', async () => {
    renderChart()
    await userEvent.click(screen.getByRole('button', { name: /switch target currency/i }))
    // CurrencyPicker lists currencies — click one that isn't the base (AUD)
    const usdOption = screen.getByRole('option', { name: /USD/i })
    await userEvent.click(usdOption)
    expect(mockPush).toHaveBeenCalledWith('/chart/AUD/USD')
  })
})
```

**Note on the navigation test:** The `useRouter` mock is module-level. Use a closure-captured `mockPush` so all tests share the same jest.fn() — no per-test override needed.

Update the existing `jest.mock('next/navigation', ...)` block at the top of the test file from:
```tsx
jest.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push: jest.fn() }),
}))
```
to:
```tsx
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push: mockPush }),
}))
```

And update `beforeEach` to also reset `mockPush`:
```tsx
beforeEach(() => {
  document.documentElement.classList.remove('dark')
  localStorage.clear()
  mockUseParams.mockReturnValue({ base: 'aud', target: 'eur' })
  mockPush.mockReset()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/manuhume/GIT/rateio && npm test -- --testPathPattern="chart-toggle" --no-coverage 2>&1 | tail -20
```

Expected: the 3 new tests fail — button not found.

- [ ] **Step 3: Update `app/chart/[base]/[target]/page.tsx`**

Replace the entire file with:

```tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {base} →
          </span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label={`Switch target currency, currently ${target}`}
            className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-blue-500 dark:hover:text-blue-400 hover:animate-pulse transition-colors"
          >
            {target} <span className="text-lg">{targetCurrency.flag}</span>
          </button>
        </div>
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0">
          {currentRate !== null ? `1 ${base} = ${currentRate.toFixed(4)} ${target}` : '—'}
        </span>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          suppressHydrationWarning
          className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      {/* Chart */}
      <div className="flex-1 px-4 py-4">
        <RateChart base={base} target={target} />
      </div>

      {pickerOpen && (
        <CurrencyPicker
          selected={[base]}
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/manuhume/GIT/rateio && npm test -- --testPathPattern="chart-toggle" --no-coverage 2>&1 | tail -20
```

Expected: all 6 tests pass (3 existing + 3 new).

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/manuhume/GIT/rateio && npm test -- --no-coverage 2>&1 | tail -10
```

Expected: all 53 tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/manuhume/GIT/rateio && git add "app/chart/[base]/[target]/page.tsx" __tests__/chart-toggle.test.tsx && git commit -m "feat: clickable target currency opens picker on chart page"
```
