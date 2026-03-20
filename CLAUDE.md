# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rateio** is a mobile-first currency converter web app built with Next.js. It fetches live exchange rates and historical data from the ExchangeRate API and displays them in a clean, sortable UI with historical charts.

Intended to replace the "Currency Converter Plus" Android app — optimised for mobile (max-width 430px).

## Development Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm test             # Run Jest unit tests
npm run test:watch   # Jest in watch mode
npm run test:e2e     # Playwright E2E tests (requires dev server or starts one)
npm run build        # Production build
npm run lint         # ESLint
```

For E2E tests, first install the browser (one-time):
```bash
npx playwright install chromium
```

## Environment Variables

```bash
EXCHANGERATE_API_KEY=your_key_here   # Required — get a free key at exchangerate-api.com
```

Put this in `.env.local` for local development (already gitignored).

## Architecture

### Stack
- **Next.js 16** (App Router, `'use client'` components)
- **TypeScript** with strict mode
- **Tailwind CSS v4** — configured via `@import "tailwindcss"` in `globals.css`, no `tailwind.config.ts` needed
- **Recharts** for historical rate charts (`AreaChart`)
- **dnd-kit** for drag-to-reorder currency rows
- **Jest + React Testing Library** for unit tests
- **Playwright** for E2E tests (Mobile Chrome / Pixel 5 viewport)

### Key Files

```
app/
  page.tsx                        # Main converter page
  chart/[base]/[target]/page.tsx  # Historical chart page
  api/
    rates/route.ts                # /api/rates — proxies ExchangeRate API, hourly revalidation
    history/route.ts              # /api/history — proxies historical data, daily revalidation
  layout.tsx                      # Root layout with Inter font
  globals.css                     # Tailwind v4 import + base styles

components/
  CurrencyRow.tsx      # Single currency row with input, drag handle, chart/remove buttons
  CurrencyPicker.tsx   # Modal overlay for adding currencies (search + list)
  RateChart.tsx        # Area chart with time range selector (1D/1W/1M/1Y/5Y)
  Header.tsx           # App header with last-updated timestamp
  SkeletonRow.tsx      # Loading placeholder row

lib/
  converter.ts         # Pure conversion math + number formatting
  currencies.ts        # Static list of ~170 currencies with flags
  storage.ts           # localStorage persistence for selected currencies

__tests__/             # Jest unit tests
e2e/                   # Playwright E2E tests
```

### Data Flow
1. `app/page.tsx` fetches `/api/rates` on mount → live rates cached hourly server-side
2. Each currency row converts amounts using `lib/converter.ts` (pure math, no API calls)
3. Chart page fetches `/api/history?base=X&target=Y&days=N` → daily rates from ExchangeRate API
4. Selected currencies persisted to `localStorage` via `lib/storage.ts`

### Conventions
- All currency codes are uppercased at the URL param boundary (`params.base.toUpperCase()`)
- Input sanitisation uses split-on-decimal approach (not regex replace) to avoid dropping digits
- `storageLoaded` boolean flag used (not `currencies.length === 0`) to distinguish loading state from empty
- AbortController pattern used in `useEffect` for all fetch calls to prevent race conditions
- Dark mode supported via Tailwind `dark:` variants — no config needed with Tailwind v4
