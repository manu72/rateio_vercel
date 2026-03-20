# Rateio

A mobile-first currency converter web app built with Next.js. Fetches live exchange rates from the [Frankfurter API](https://frankfurter.dev/) (ECB data, free) with [ExchangeRate-API](https://www.exchangerate-api.com/) as a fallback, and displays them in a clean, sortable UI with historical charts.

Built to replace the Android app *Currency Converter Plus* — optimised for a 430px mobile viewport but fully responsive.

## Features

- **Instant conversion** — type in any currency row and all others update in real time
- **170+ currencies** — covers all major and exotic currencies via dual API sources
- **Drag-to-reorder** — long-press (mobile) or grab the handle (desktop) to rearrange rows
- **Historical charts** — tap the chart icon on any row to see rate trends over 1D / 1W / 1M / 1Y / 5Y
- **Add/remove currencies** — searchable picker modal, up to 10 currencies at once
- **Dark mode** — follows system preference automatically
- **Persistent selection** — chosen currencies saved to localStorage and restored on reload
- **Skeleton loading** — animated placeholders while rates load

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts (AreaChart) |
| Drag & drop | dnd-kit |
| Unit tests | Jest + React Testing Library |
| E2E tests | Playwright (Mobile Chrome / Pixel 5 viewport) |
| Rate data | Frankfurter API (primary) + ExchangeRate-API (fallback) |

## Project Structure

```
rateio/
├── app/
│   ├── page.tsx                        # Main converter page
│   ├── layout.tsx                      # Root layout (Inter font, metadata)
│   ├── globals.css                     # Tailwind v4 imports + base styles
│   ├── api/
│   │   ├── rates/route.ts             # /api/rates — live rates, hourly revalidation
│   │   └── history/route.ts           # /api/history — historical rates, daily revalidation
│   └── chart/
│       └── [base]/[target]/
│           └── page.tsx               # Historical chart page for a currency pair
├── components/
│   ├── CurrencyRow.tsx                # Single currency row (input, drag handle, chart/remove)
│   ├── CurrencyPicker.tsx             # Full-screen modal to search and add currencies
│   ├── RateChart.tsx                  # Area chart with time range selector
│   ├── Header.tsx                     # App header with last-updated timestamp
│   └── SkeletonRow.tsx                # Loading placeholder row
├── lib/
│   ├── converter.ts                   # Pure conversion math + number formatting
│   ├── currencies.ts                  # Static metadata for ~170 currencies (code, name, flag)
│   └── storage.ts                     # localStorage persistence for selected currencies
├── __tests__/                         # Jest unit + component tests
│   ├── api/
│   │   ├── rates.test.ts
│   │   └── history.test.ts
│   ├── components/
│   │   ├── CurrencyRow.test.tsx
│   │   └── CurrencyPicker.test.tsx
│   ├── converter.test.ts
│   └── storage.test.ts
├── e2e/
│   └── converter.spec.ts             # Playwright E2E tests
├── docs/
│   └── superpowers/specs/             # Design specifications
├── package.json
├── tsconfig.json
├── jest.config.ts
├── playwright.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
└── next.config.ts
```

## Getting Started

### Prerequisites

- Node.js 20+
- An [ExchangeRate-API](https://www.exchangerate-api.com/) key (free tier available) — required for exotic currencies and as a fallback

### Installation

```bash
git clone https://github.com/manuhume/rateio.git
cd rateio
npm install
```

### Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API key:

```
EXCHANGERATE_API_KEY=your_api_key_here
```

### Development

```bash
npm run dev          # Start dev server at http://localhost:3000
```

### Testing

```bash
npm test             # Run Jest unit tests
npm run test:watch   # Jest in watch mode

# E2E tests (one-time browser install first)
npx playwright install chromium
npm run test:e2e     # Playwright E2E tests
```

### Production Build

```bash
npm run build        # Build for production
npm start            # Serve the production build
```

### Linting

```bash
npm run lint         # ESLint
```

## Architecture

### Data Flow

1. `app/page.tsx` fetches `/api/rates` on mount — live rates cached hourly via server-side revalidation
2. `/api/rates` queries the Frankfurter API first (free ECB data for ~30 currencies), then merges with ExchangeRate-API for full coverage
3. Each currency row converts amounts using `lib/converter.ts` — pure math, no additional API calls
4. Chart page fetches `/api/history?base=X&target=Y&days=N` — Frankfurter for supported pairs, ExchangeRate-API fallback for exotic ones
5. Selected currencies are persisted to `localStorage` via `lib/storage.ts`

### API Routes

| Route | Purpose | Cache |
|---|---|---|
| `GET /api/rates` | Live exchange rates (USD base) | 1 hour |
| `GET /api/history?base=X&target=Y&days=N` | Historical rates for a pair | 24 hours |

### Conventions

- Currency codes uppercased at URL param boundaries
- Input sanitisation uses a split-on-decimal approach (not regex replace)
- `storageLoaded` boolean flag distinguishes loading state from empty selection
- AbortController pattern in `useEffect` for all fetch calls to prevent race conditions
- Dark mode via Tailwind `dark:` variants (no config needed with Tailwind v4)

## Deployment

Designed for [Vercel](https://vercel.com/) with automatic deploys on push to `main`. Set `EXCHANGERATE_API_KEY` in the Vercel project environment variables.

## Recent Updates

- **Frankfurter API integration** — added as the primary rate source (free, no API key required for ~30 ECB currencies), with ExchangeRate-API as fallback for exotic currencies and outages
- **Fallback resilience** — Frankfurter fetch in the history route wrapped in try-catch to ensure network-level failures (DNS, timeout) correctly fall through to the ExchangeRate-API fallback
- **Favicon and web manifest** — added app metadata and icons
- **Mobile drag support** — fixed `touch-none` on drag handles for proper mobile touch behaviour
- **E2E test suite** — Playwright tests covering the core converter flow on a Pixel 5 viewport
