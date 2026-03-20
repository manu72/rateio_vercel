/**
 * Convert a value from one currency to another using USD-based rates.
 * @param value - Amount in the source currency
 * @param fromRate - Rate of source currency relative to USD
 * @param toRate - Rate of target currency relative to USD
 */
export function convert(value: number, fromRate: number, toRate: number): number {
  if (fromRate === 0 || value === 0) return 0
  return (value / fromRate) * toRate
}

/**
 * Format a number to 2 decimal places for display.
 */
export function formatAmount(value: number): string {
  return value.toFixed(2)
}
