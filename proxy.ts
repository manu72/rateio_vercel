import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Best-effort per-IP rate limit for the public upstream-proxy API routes
// (/api/rates, /api/history). These routes forward to a paid, key-gated
// upstream, so unbounded requests are a denial-of-wallet vector. Input
// validation in the routes collapses the keyspace; this caps the volume.
//
// NOTE: this counter lives in the process serving the request. On a single
// long-running instance (e.g. `next start` on a VPS) it bounds per-IP volume
// well. On serverless platforms (Vercel functions) each invocation may be a
// fresh process, so this is only a soft cap — for hard multi-instance limiting
// back the window store with Edge KV / Upstash Redis.
const WINDOW_MS = 60_000
const MAX_REQUESTS = 100

const hits = new Map<string, { count: number; resetAt: number }>()

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export function proxy(request: NextRequest) {
  const ip = clientIp(request)
  const now = Date.now()

  // Lazy eviction: once the table grows, drop expired windows so it can't
  // leak memory across long-running processes.
  if (hits.size > 4_000) {
    for (const [key, val] of hits) {
      if (now > val.resetAt) hits.delete(key)
    }
  }

  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return NextResponse.next()
  }

  entry.count += 1
  if (entry.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'retry-after': '60' } },
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/rates', '/api/history'],
}
