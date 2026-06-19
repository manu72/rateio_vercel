# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rateio** is a mobile-first currency converter web app (PWA) built with Next.js. It fetches live exchange rates and historical data from two upstream sources — the **Frankfurter API** (ECB reference rates, key-free) and the **ExchangeRate API** (key-gated) — and displays them in a clean, sortable UI with historical charts.

Intended to replace the "Currency Converter Plus" Android app — optimised for mobile (max-width 430px).

## DEVOPS RULES [CRITICAL]

- ALWAYS use sub-agents for codebase searches, documentation reviews and web search tasks, or for clear, specific independent sub-tasks
- Sub-agents should report their findings back to you the controller
- Always use superpowers when appropriate
- Always use sequential-thinking
- ALWAYS ASK before using git commands
- ALWAYS ASK before staging or committing changes
- keep commit messages concise
- NEVER use git push

## Development Commands

```bash
npm run dev          # Start dev server at http://localhost:3200
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
EXCHANGERATE_API_KEY=your_key_here   # Optional — Frankfurter provides a key-free baseline (~30 currencies);
                                     # adding this key enables ExchangeRate-API for broader coverage + history fallback.
```

Put this in `.env.local` for local development (already gitignored).

## Architecture

### Stack

- **Next.js 16** (App Router, React 19, `'use client'` components)
- **TypeScript** with strict mode
- **Tailwind CSS v4** — configured via `@import "tailwindcss"` in `globals.css`, no `tailwind.config.ts` needed
- **Recharts** for historical rate charts (`AreaChart`)
- **dnd-kit** for drag-to-reorder currency rows
- **SWR 2** for client data fetching, with a localStorage-backed cache for cross-session stale-while-revalidate
- **Service worker (PWA)** for offline navigation — registered in production only
- **Vercel Analytics**
- **Jest + React Testing Library** for unit tests
- **Playwright** for E2E tests (Mobile Chrome / Pixel 5 viewport)

### Key Files

```
app/
  page.tsx                        # Main converter page
  chart/[base]/[target]/page.tsx  # Historical chart page
  api/
    rates/route.ts                # /api/rates — Frankfurter + ExchangeRate merge, hourly revalidation
    history/route.ts              # /api/history — Frankfurter-first, ExchangeRate fallback, daily revalidation
  layout.tsx                      # Root layout: Inter font, FOUC theme script, providers
  globals.css                     # Tailwind v4 import + base styles

components/
  CurrencyRow.tsx                 # Single currency row: input, drag handle, chart/remove buttons
  CurrencyPicker.tsx              # Modal overlay for adding currencies (search + list)
  RateChart.tsx                   # Area chart with time range selector (1D/1W/1M/1Y/5Y)
  Header.tsx                      # App header with last-updated timestamp + theme toggle
  ThemeProvider.tsx               # Light/dark theme context (class-based) + useTheme hook
  SWRProvider.tsx                 # SWR config: localStorage cache provider, JSON fetcher, revalidation policy
  ServiceWorkerRegistration.tsx   # Registers /sw.js in production
  SkeletonRow.tsx                 # Loading placeholder row

hooks/
  use-rates.ts                    # SWR hook for live rates
  use-history.ts                  # SWR hook for historical series

lib/
  converter.ts                    # Pure conversion math + number formatting
  currencies.ts                   # Static list of 154 currencies + Frankfurter historical-currency set
  storage.ts                      # localStorage persistence (selected currencies, active value/currency)
  swr-cache-provider.ts           # SWR cache provider backed by localStorage

public/
  sw.js                           # Service worker (cacheFirst static/icons/fonts, networkFirst api+nav+RSC)

__tests__/             # Jest unit tests
e2e/                   # Playwright E2E tests
```

### Data Flow

1. `app/page.tsx` reads live rates via the `useRates()` SWR hook → `/api/rates` (cached hourly server-side; SWR cache persisted to `localStorage` for cross-session stale data)
2. Each currency row converts amounts using `lib/converter.ts` (pure math, no API calls)
3. `RateChart` reads history via the `useHistory()` SWR hook → `/api/history?base=X&target=Y&days=N` (Frankfurter-first, cached daily)
4. Selected currencies, active value, and active currency persisted to `localStorage` via `lib/storage.ts`
5. Service worker (`public/sw.js`, production-only) caches navigations + static assets for offline use

### Conventions

- All currency codes are uppercased at the URL param boundary (`params.base.toUpperCase()`)
- Input sanitisation uses split-on-decimal approach (not regex replace) to avoid dropping digits
- `storageLoaded` boolean flag used (not `currencies.length === 0`) to distinguish loading state from empty
- Data fetching goes through SWR hooks (`useRates`, `useHistory`) — components do not call `fetch` directly or use `AbortController`; SWR handles deduping, revalidation, and aborts
- Dark mode is **class-based**: an inline script in `layout.tsx` applies the `dark` class pre-paint (FOUC prevention), and `ThemeProvider` toggles it. Choosing a theme that matches the OS removes the `localStorage` override so OS changes re-apply. Tailwind `dark:` variants — no config needed with Tailwind v4
