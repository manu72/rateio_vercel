# Currency Converter Web App — Design Spec
**Date:** 2026-03-20
**Status:** Approved

---

## Overview

A mobile-first web app to replace the Android app *Currency Converter Plus*. Users maintain a list of up to 10 currencies; typing in any field instantly updates all others at live exchange rates. A separate chart page shows historical rate trends per currency pair.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS, dark mode via `media` strategy (follows system preference) |
| Charts | Recharts |
| Exchange rates | ExchangeRate-API (paid plan) |
| Hosting | Vercel (GitHub integration — push to `main` = deploy) |
| Version control | GitHub |

---

## Architecture

### Pages

| Route | Description |
|---|---|
| `/` | Main converter UI |
| `/chart/[base]/[target]` | Historical chart for a currency pair |

### API Routes

| Route | Purpose | Cache |
|---|---|---|
| `GET /api/rates` | Proxies ExchangeRate-API latest rates. Returns `{ rates: { [code]: number }, updatedAt: string }`. | `revalidate: 3600` (1 hour) |
| `GET /api/history?base=X&target=Y&days=N` | Proxies ExchangeRate-API historical endpoint. Returns `{ dates: string[], rates: number[] }`. `days` maps to time range buttons: 1D→1, 1W→7, 1M→30, 1Y→365, 5Y→1825. | `revalidate: 86400` (24 hours) |

API key stored in a Vercel environment variable (`EXCHANGERATE_API_KEY`), never exposed to the browser.

### File Structure

```
app/
  page.tsx                     # Converter UI
  chart/[base]/[target]/
    page.tsx                   # Chart page
  api/
    rates/route.ts             # Live rates proxy
    history/route.ts           # Historical rates proxy
  layout.tsx                   # Root layout (font, metadata, theme)
  globals.css                  # Tailwind base styles

components/
  CurrencyRow.tsx              # Flag + currency code + editable input + chart button
  CurrencyPicker.tsx           # Searchable full-screen modal to add currencies
  RateChart.tsx                # Recharts line chart with time range selector
  Header.tsx                   # App title + "Updated X ago" timestamp
  SkeletonRow.tsx              # Loading placeholder for currency rows

lib/
  currencies.ts                # Static list of all currency codes, names, flag emoji
  storage.ts                   # localStorage helpers (get/set selected currencies)
  converter.ts                 # Pure conversion math: convert(value, fromRate, toRate)

public/                        # Static assets (favicon, manifest)
```

---

## UI Design

### Screen 1 — Converter (`/`)

- Narrow centered column (max-width ~430px), full-height on mobile
- **Header**: app name left, "Updated X min ago" right
- **Currency rows**: white cards on a light grey background, rounded corners, subtle shadow
  - Each row: flag emoji · currency code · currency name · editable number input · 📈 chart icon
  - The active (last-edited) row gets a blue ring and an underline on the input
  - All rows are editable — tapping/clicking any input makes it the active base
- **Add currency** button: dashed border card at the bottom of the list, opens `CurrencyPicker`
- **CurrencyPicker**: full-screen modal with a search field, scrollable list of all ~170 currencies, checkmarks on already-selected ones. Tap to add. Max 10 currencies enforced.
- **Reorder**: drag handle on each row (long-press on mobile, visible handle on desktop). Use `dnd-kit` (`@dnd-kit/core` + `@dnd-kit/sortable`) for drag-and-drop.
- **Remove**: swipe left on mobile reveals a red delete button; on desktop a ✕ appears on hover

### Screen 2 — Chart (`/chart/[base]/[target]`)

- Back button (‹) + pair title (e.g. "EUR → USD") + current rate in header
- **Time range selector**: pill buttons — 1D · 1W · 1M · 1Y · 5Y
- **Chart**: Recharts `LineChart`, area fill below the line, tooltip on hover/touch showing exact rate and date
- **Stats**: period high (green) and period low (red) displayed below chart
- Chart pair: always **last active currency → tapped row's currency**

---

## State & Data

### In-Memory (React state, `page.tsx`)

| State | Type | Description |
|---|---|---|
| `rates` | `Record<string, number>` | All rates relative to USD base, e.g. `{ USD: 1, EUR: 0.922, GBP: 0.782 }` |
| `updatedAt` | `string` | ISO timestamp from the API response |
| `activeCurrency` | `string` | Code of the last-edited row, e.g. `"EUR"` |
| `activeValue` | `number` | The number typed in the active row |

All other displayed values are derived (no additional state):
```
displayValue = activeValue * (targetRate / activeRate)
```

### Persistent (localStorage)

| Key | Type | Default |
|---|---|---|
| `selectedCurrencies` | `string[]` | `["EUR", "USD", "GBP", "JPY"]` |

---

## Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| API fetch fails on load | Vercel's CDN serves the last cached response automatically on server errors. If the client receives an error response (e.g. 500), show an error banner. Never crash. |
| Rates not yet loaded | Skeleton placeholder rows (animated shimmer) |
| User types invalid characters | Input sanitised to digits + single decimal point only |
| Value is 0 or empty | Display `0.00` across all rows; no division by zero |
| 5Y range unavailable on plan | Fall back to maximum available range, show a note on the chart |
| localStorage unavailable (e.g. private browsing) | Catch error, silently use default currencies for the session |
| Fewer than 2 currencies selected | Hide the chart icon (no pair to chart) |

---

## Testing

- **Unit tests** (Jest): `converter.ts` math, `storage.ts` read/write, input sanitisation
- **Component tests** (React Testing Library): `CurrencyRow` renders correctly, `CurrencyPicker` search filters list
- **API route tests**: mock ExchangeRate-API responses, assert correct transformation
- **E2E** (Playwright): editing one field updates others; navigating to chart page and back; adding/removing currencies persists on reload

---

## Deployment

### Repository & CI/CD

- GitHub repo: `manuhume/rateio` (or equivalent)
- Vercel project linked to the GitHub repo via the Vercel GitHub integration
- Every push to `main` triggers a production deploy automatically
- Every pull request gets a preview deployment URL

### Environment Variables

| Variable | Where set | Description |
|---|---|---|
| `EXCHANGERATE_API_KEY` | Vercel project settings (production + preview) | ExchangeRate-API key, never committed to the repo |

### Vercel Configuration

- Framework preset: **Next.js** (auto-detected)
- Build command: `next build` (default)
- Output directory: `.next` (default)
- Node.js version: 20.x
- Region: auto (Vercel edge network)

### Local Development

```bash
# 1. Clone repo
git clone https://github.com/<user>/rateio.git && cd rateio

# 2. Install dependencies
npm install

# 3. Set local env
cp .env.example .env.local
# Add EXCHANGERATE_API_KEY to .env.local

# 4. Run dev server
npm run dev   # http://localhost:3000
```

`.env.example` committed to the repo with placeholder values. `.env.local` in `.gitignore`.

### Branching Strategy

- `main` — production. Direct pushes for solo development; PRs optional.
- Feature branches for larger changes if desired.

---

## Out of Scope

- User accounts / server-side persistence
- Push notifications for rate alerts
- Currency news or commentary
- PWA / installable app (can be added later)
