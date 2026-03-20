const STORAGE_KEY = 'selectedCurrencies'
export const DEFAULT_CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY']

export function loadCurrencies(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CURRENCIES
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return DEFAULT_CURRENCIES
  } catch {
    return DEFAULT_CURRENCIES
  }
}

export function saveCurrencies(currencies: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currencies))
  } catch {
    // localStorage unavailable (e.g. private browsing) — fail silently
  }
}
