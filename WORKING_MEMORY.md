# Working Memory

## Lessons Learned

- **Guard fetch AND .json() with try-catch in API routes**: Both `fetch()` (DNS, timeout) and `.json()` (malformed/truncated body) can throw. An `if (res.ok)` guard only handles HTTP status codes. In dual-source routes, an unguarded `.json()` on source A can crash the handler before source B is processed — defeating the entire fallback strategy. Wrap the full fetch-parse-transform chain in try-catch for each source independently.
