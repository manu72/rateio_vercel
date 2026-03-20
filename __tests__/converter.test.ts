import { convert, formatAmount } from '@/lib/converter'

describe('convert', () => {
  // Rates are relative to USD: EUR=0.922, GBP=0.782, JPY=151.2
  const rates = { USD: 1, EUR: 0.922, GBP: 0.782, JPY: 151.2 }

  it('converts USD to EUR', () => {
    expect(convert(10, rates['USD'], rates['EUR'])).toBeCloseTo(9.22)
  })

  it('converts EUR to GBP', () => {
    expect(convert(10, rates['EUR'], rates['GBP'])).toBeCloseTo(8.48, 1)
  })

  it('returns 0 when value is 0', () => {
    expect(convert(0, rates['USD'], rates['EUR'])).toBe(0)
  })

  it('does not divide by zero when fromRate is 0', () => {
    expect(convert(10, 0, rates['EUR'])).toBe(0)
  })

  it('same currency returns same value', () => {
    expect(convert(42, rates['EUR'], rates['EUR'])).toBeCloseTo(42)
  })
})

describe('formatAmount', () => {
  it('formats to 2 decimal places', () => {
    expect(formatAmount(1.23456)).toBe('1.23')
  })

  it('formats zero', () => {
    expect(formatAmount(0)).toBe('0.00')
  })

  it('handles large numbers', () => {
    expect(formatAmount(1234567.89)).toBe('1234567.89')
  })
})
