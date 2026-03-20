# Working Memory

## Lessons Learned

- **Wrap ALL fetch calls in try-catch (not just fallback-eligible ones)**: `fetch()` can throw on network-level failures (DNS, timeout). An `if (res.ok)` guard only handles HTTP error responses. This applies to every fetch in an API route — both primary and last-resort calls — so the client always receives a structured JSON error instead of an unhandled crash. See `app/api/rates/route.ts` (`Promise.allSettled`) as the reference pattern.
