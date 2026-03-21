# Chart Page Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the dark/light mode toggle button to the chart page header, matching the toggle already present in the main page header.

**Architecture:** The `ThemeProvider` already wraps the entire app. The chart page is already `'use client'`. This is a single-file edit: import `useTheme`, call it at the top of the component, add the button to the header flex row, and copy the `SunIcon`/`MoonIcon` SVG helpers inline.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, React context (`useTheme`)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/chart/[base]/[target]/page.tsx` | Modify | Add useTheme hook call and toggle button to header |
| `__tests__/chart-toggle.test.tsx` | Create | Verify toggle button renders and works on chart page |

---

## Task 1: Add toggle button to chart page header

**Files:**
- Modify: `app/chart/[base]/[target]/page.tsx`
- Create: `__tests__/chart-toggle.test.tsx`

Current header structure for reference (lines 51–70 of the chart page):
```tsx
<div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
  <button type="button" onClick={() => router.push('/')} aria-label="go back" ...>‹</button>
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <span className="text-lg">{baseCurrency.flag}</span>
    <span className="text-sm font-bold ...">{base} → {target}</span>
    <span className="text-lg">{targetCurrency.flag}</span>
  </div>
  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0">
    {currentRate !== null ? `1 ${base} = ${currentRate.toFixed(4)} ${target}` : '—'}
  </span>
  {/* toggle button goes here */}
</div>
```

- [ ] **Step 1: Write the failing test**

Create `__tests__/chart-toggle.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/ThemeProvider'

// Mock next/navigation — required for useParams and useRouter
jest.mock('next/navigation', () => ({
  useParams: () => ({ base: 'aud', target: 'eur' }),
  useRouter: () => ({ push: jest.fn() }),
}))

// Mock fetch so the rate API call doesn't fail in tests
global.fetch = jest.fn(() => Promise.resolve({ ok: false } as Response))

import ChartPage from '@/app/chart/[base]/[target]/page'

function renderChart() {
  return render(
    <ThemeProvider>
      <ChartPage />
    </ThemeProvider>
  )
}

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  localStorage.clear()
})

describe('ChartPage theme toggle', () => {
  it('renders the theme toggle button in the header', () => {
    renderChart()
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })

  it('toggles dark class on html when button is clicked', async () => {
    renderChart()
    const btn = screen.getByRole('button', { name: /toggle theme/i })
    await userEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await userEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/manuhume/GIT/rateio && npm test -- --testPathPattern="chart-toggle" --no-coverage 2>&1 | tail -15
```

Expected: both tests fail — button not found.

- [ ] **Step 3: Update `app/chart/[base]/[target]/page.tsx`**

Replace the entire file with:

```tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import RateChart from '@/components/RateChart'
import { getCurrency } from '@/lib/currencies'
import { convert } from '@/lib/converter'

export default function ChartPage() {
  const params = useParams<{ base: string; target: string }>()
  const base = params.base.toUpperCase()
  const target = params.target.toUpperCase()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
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
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          suppressHydrationWarning
          className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 transition-colors"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      {/* Chart */}
      <div className="flex-1 px-4 py-4">
        <RateChart base={base} target={target} />
      </div>
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
cd /Users/manuhume/GIT/rateio && npm test -- --testPathPattern="chart-toggle" --no-coverage 2>&1 | tail -15
```

Expected: 2/2 pass.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/manuhume/GIT/rateio && npm test -- --no-coverage 2>&1 | tail -10
```

Expected: all 52 tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/manuhume/GIT/rateio && git add app/chart/[base]/[target]/page.tsx __tests__/chart-toggle.test.tsx && git commit -m "feat: add theme toggle to chart page header"
```
