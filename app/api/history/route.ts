import { NextResponse } from 'next/server'

export const revalidate = 86400 // 24 hours

// Currencies supported by the Frankfurter API (ECB reference rates)
const FRANKFURTER_CURRENCIES = new Set([
  'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP',
  'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR',
  'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR',
])

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const base = searchParams.get('base')
  const target = searchParams.get('target')
  const days = parseInt(searchParams.get('days') ?? '30', 10)

  if (!base || !target) {
    return NextResponse.json({ error: 'base and target are required' }, { status: 400 })
  }

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)

  const start = toDateString(startDate)
  const end = toDateString(endDate)

  // Use Frankfurter if both currencies are supported (free, no key, no limits)
  if (FRANKFURTER_CURRENCIES.has(base) && FRANKFURTER_CURRENCIES.has(target)) {
    try {
      const res = await fetch(
        `https://api.frankfurter.dev/v1/${start}..${end}?base=${base}&symbols=${target}`,
        { next: { revalidate: 86400 } }
      )
      if (res.ok) {
        const data = await res.json()
        const ratesMap: Record<string, Record<string, number>> = data.rates
        const pairs = Object.keys(ratesMap)
          .sort()
          .map(date => ({ date, rate: ratesMap[date][target] }))
          .filter(p => p.rate != null)
        return NextResponse.json({
          dates: pairs.map(p => p.date),
          rates: pairs.map(p => p.rate),
        })
      }
    } catch {
      // Network-level failure (DNS, timeout, etc.) — fall through to fallback
    }
  }

  // Fallback: ExchangeRate-API (handles exotic currencies and Frankfurter outages)
  const apiKey = process.env.EXCHANGERATE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No historical data available for this currency pair' }, { status: 500 })
  }

  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${apiKey}/timeseries/${base}/${start}/${end}`,
    { next: { revalidate: 86400 } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }

  const data = await res.json()
  const ratesMap: Record<string, Record<string, number>> = data.rates
  const pairs = Object.keys(ratesMap)
    .sort()
    .map(date => ({ date, rate: ratesMap[date][target] }))
    .filter(p => p.rate != null)

  return NextResponse.json({
    dates: pairs.map(p => p.date),
    rates: pairs.map(p => p.rate),
  })
}
