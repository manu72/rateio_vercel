import { NextResponse } from 'next/server'

export const revalidate = 3600 // 1 hour

export async function GET() {
  const apiKey = process.env.EXCHANGERATE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
    { next: { revalidate: 3600 } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json({
    rates: data.conversion_rates as Record<string, number>,
    updatedAt: data.time_last_update_utc as string,
  })
}
