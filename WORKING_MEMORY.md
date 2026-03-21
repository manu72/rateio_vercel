# Working Memory

**Last Updated:** 2026-03-21
**Version:** 0.1.0

## Project State

Mobile-first currency converter (max 430px viewport). Core features complete and functional:
- Converter page with drag-to-reorder, add/remove currencies, instant conversion
- Historical chart page with 1D/1W/1M/1Y/5Y time ranges, clickable target currency picker
- Dual-source API: Frankfurter (primary, free ECB data) + ExchangeRate-API (fallback, exotic currencies)
- Dark/light mode toggle with FOUC-prevention script and ThemeProvider context
- Lucide icons throughout (replaced emoji icons)
- Vercel Analytics integrated
- Unit tests (Jest) and E2E tests (Playwright) in place

## Architecture

### Dual-Source Rate Strategy

```
rates/route.ts:   Promise.allSettled → Frankfurter + ExchangeRate-API in parallel → merge
history/route.ts: Frankfurter first (try-catch) → ExchangeRate-API fallback (try-catch)
```

- Frankfurter covers ~30 ECB currencies (free, no key, no rate limits)
- ExchangeRate-API covers 170+ currencies (requires `EXCHANGERATE_API_KEY`)
- Both routes guard the full fetch-parse-transform chain in try-catch per source
- `rates/` merges both sources; `history/` uses sequential fallback

### Data Flow

1. `page.tsx` fetches `/api/rates` on mount (hourly revalidation)
2. Currency rows convert via `lib/converter.ts` (pure math, no API calls)
3. Chart page fetches `/api/history?base=X&target=Y&days=N` (daily revalidation)
4. Selected currencies persisted to localStorage via `lib/storage.ts`

### Key Conventions

- Currency codes uppercased at URL param boundaries
- Input sanitisation: split-on-decimal (not regex replace)
- `storageLoaded` flag distinguishes loading state from empty selection
- AbortController in useEffect for all client-side fetches
- Dark/light mode: FOUC-prevention inline script in `layout.tsx` + `ThemeProvider` context + toggle in `Header.tsx`
- Theme preference: stored in localStorage only when it differs from OS preference; removed when they match

## Recent Changes

- **Dark/light mode toggle** (`8d7661f`–`8503c5d`): ThemeProvider context, FOUC-prevention script, toggle button in Header and chart page, E2E tests
- **Lucide icons** (`75549c9`): Replaced emoji icons with `lucide-react`; bold-fill hover animations and press feedback
- **Chart page target picker** (`db36b4c`): Clickable target currency opens picker on chart page
- **Chart UX** (`2105158`, `e3c40be`): Nudge Y-axis labels above grid lines, larger back button, cursor-pointer on interactive elements
- **CurrencyPicker fix** (`3feab71`): Constrain picker to 430px, close on backdrop click
- **Vercel Analytics** (`326d385`): `@vercel/analytics` in `layout.tsx`
- **Chart rate values** (`d2f23ee`): Rate values on chart lines in `RateChart.tsx`
- **Fallback resilience** (`eef3e12`, `6f054fd`, `efe774b`): Fixed three gaps — Frankfurter fetch throw, ExchangeRate-API fetch throw, `.json()` parse failures
- **Frankfurter integration** (`9d7f034`): Primary rate source (free ECB data)

## Lessons Learned

- **Guard fetch AND .json() with try-catch in API routes**: Both `fetch()` (DNS, timeout) and `.json()` (malformed/truncated body) can throw. An `if (res.ok)` guard only handles HTTP status codes. In dual-source routes, an unguarded `.json()` on source A can crash the handler before source B is processed — defeating the entire fallback strategy. Wrap the full fetch-parse-transform chain in try-catch for each source independently.

  ```typescript
  // WRONG — .json() throw crashes handler, fallback never runs
  if (result.status === 'fulfilled' && result.value.ok) {
    const data = await result.value.json()  // can throw SyntaxError
    rates = data.rates
  }

  // RIGHT — each source independently guarded
  if (result.status === 'fulfilled' && result.value.ok) {
    try {
      const data = await result.value.json()
      rates = data.rates
    } catch {
      // skip this source
    }
  }
  ```

- **Apply error-handling patterns uniformly**: When fixing a pattern in one location, audit the entire file (and sibling files) for the same pattern. The Frankfurter try-catch fix was applied without checking the ExchangeRate-API fetch in the same file, requiring a second fix.
