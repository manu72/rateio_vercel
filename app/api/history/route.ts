import { NextResponse } from 'next/server'

export const revalidate = 86400 // 24 hours

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

  const apiKey = process.env.EXCHANGERATE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)

  const start = toDateString(startDate)
  const end = toDateString(endDate)

  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${apiKey}/timeseries/${base}/${start}/${end}`,
    { next: { revalidate: 86400 } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }

  const data = await res.json()
  const ratesMap: Record<string, Record<string, number>> = data.rates

  // Keep dates and rates aligned — filter out any dates missing the target rate
  const pairs = Object.keys(ratesMap)
    .sort()
    .map(date => ({ date, rate: ratesMap[date][target] }))
    .filter(p => p.rate != null)

  return NextResponse.json({
    dates: pairs.map(p => p.date),
    rates: pairs.map(p => p.rate),
  })
}
