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

  let exchangeRateApiRates: Record<string, number> = {}
  let updatedAt: string | null = null

  if (fallbackResult.status === 'fulfilled' && fallbackResult.value.ok) {
    try {
      const data = await fallbackResult.value.json()
      exchangeRateApiRates = data.conversion_rates ?? {}
      updatedAt = data.time_last_update_utc ?? null
    } catch {
      // Malformed body — skip this source
    }
  }

  let frankfurterRates: Record<string, number> = {}

  if (frankfurterResult.status === 'fulfilled' && frankfurterResult.value.ok) {
    try {
      const data = await frankfurterResult.value.json()
      frankfurterRates = { ...data.rates, USD: 1 }
      if (!updatedAt) updatedAt = data.date ?? null
    } catch {
      // Malformed body — skip this source, fall through to other
    }
  }

  // ExchangeRate-API is primary; Frankfurter fills gaps if ExchangeRate-API is missing currencies
  const rates = { ...frankfurterRates, ...exchangeRateApiRates }

  if (Object.keys(rates).length === 0) {
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 })
  }

  return NextResponse.json({ rates, updatedAt: updatedAt ?? new Date().toISOString() })
}
