import { NextResponse } from 'next/server'

export const revalidate = 3600 // 1 hour

export async function GET() {
  const apiKey = process.env.EXCHANGERATE_API_KEY

  const [frankfurterResult, fallbackResult] = await Promise.allSettled([
    fetch('https://api.frankfurter.dev/v1/latest?base=USD', { next: { revalidate: 3600 } }),
    apiKey
      ? fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`, { next: { revalidate: 3600 } })
      : Promise.reject('no key'),
  ])

  let frankfurterRates: Record<string, number> = {}
  let updatedAt: string | null = null

  if (frankfurterResult.status === 'fulfilled' && frankfurterResult.value.ok) {
    const data = await frankfurterResult.value.json()
    frankfurterRates = { ...data.rates, USD: 1 }
    updatedAt = data.date ?? null // "YYYY-MM-DD" — parseable by new Date()
  }

  let fallbackRates: Record<string, number> = {}

  if (fallbackResult.status === 'fulfilled' && fallbackResult.value.ok) {
    const data = await fallbackResult.value.json()
    fallbackRates = data.conversion_rates ?? {}
    if (!updatedAt) updatedAt = data.time_last_update_utc ?? null
  }

  // Frankfurter takes precedence for its currencies; fallback fills the rest
  const rates = { ...fallbackRates, ...frankfurterRates }

  if (Object.keys(rates).length === 0) {
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 })
  }

  return NextResponse.json({ rates, updatedAt: updatedAt ?? new Date().toISOString() })
}
