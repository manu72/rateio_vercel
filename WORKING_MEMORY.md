# Working Memory

**Last Updated:** 2026-03-21
**Version:** 0.1.0

## Project State

Mobile-first currency converter (max 430px viewport). Core features complete and functional:
- Converter page with drag-to-reorder, add/remove currencies, instant conversion
- Historical chart page with 1D/1W/1M/1Y/5Y time ranges
- Dual-source API: Frankfurter (primary, free ECB data) + ExchangeRate-API (fallback, exotic currencies)
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
- Dark mode via Tailwind `dark:` variants (v4, no config file)

## Recent Changes

- **Vercel Analytics** (`326d385`): Added `@vercel/analytics` to `layout.tsx`
- **Chart rate values** (`d2f23ee`): Added rate values to chart lines in `RateChart.tsx`
- **Resizable chart + logo** (`6f054fd`): Logo asset and resizable chart component
- **Fallback resilience** (`eef3e12`, `6f054fd`, `efe774b`): Fixed three progressively discovered gaps in error handling — Frankfurter fetch throw, ExchangeRate-API fetch throw, and `.json()` parse failures
- **Frankfurter integration** (`9d7f034`): Added as primary rate source to reduce ExchangeRate-API dependency
- **Favicon + manifest** (`4b6006c`): App icons and `site.webmanifest`
- **Mobile drag fix** (`d80cfed`): `touch-none` on drag handles

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
