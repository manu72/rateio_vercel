# Working Memory

## Lessons Learned

- **Wrap fallback-eligible fetch calls in try-catch**: `fetch()` can throw on network-level failures (DNS, timeout). An `if (res.ok)` guard only handles HTTP error responses. When a fetch is meant to fall through to a fallback provider on failure, it must be wrapped in try-catch to handle both failure modes. See `app/api/rates/route.ts` (`Promise.allSettled`) as the reference pattern.
