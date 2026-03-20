# Currency Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first Next.js currency converter web app with live rates, localStorage persistence, and historical rate charts, deployed to Vercel.

**Architecture:** Next.js 14 App Router with two pages (`/` converter, `/chart/[base]/[target]`), two API route proxies for ExchangeRate-API (live rates cached 1h, historical cached 24h), and pure client-side conversion math derived from a single active value + rates object.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS (dark mode: media), Recharts, dnd-kit, Jest + React Testing Library, Playwright, Vercel.

---

## File Map

| File | Responsibility |
|---|---|
| `app/layout.tsx` | Root layout: font, metadata, Tailwind body class |
| `app/globals.css` | Tailwind directives + CSS variables for dark mode |
| `app/page.tsx` | Converter UI: state, derived values, orchestrates child components |
| `app/chart/[base]/[target]/page.tsx` | Chart page: fetches history, renders RateChart |
| `app/api/rates/route.ts` | Proxies ExchangeRate-API `/latest/USD`, revalidates hourly |
| `app/api/history/route.ts` | Proxies ExchangeRate-API `/history`, revalidates daily |
| `components/Header.tsx` | App title + "Updated X ago" timestamp |
| `components/SkeletonRow.tsx` | Animated shimmer placeholder for loading state |
| `components/CurrencyRow.tsx` | Single row: flag + code + name + editable input + chart icon |
| `components/CurrencyPicker.tsx` | Full-screen modal: searchable currency list, max 10 enforcement |
| `components/RateChart.tsx` | Recharts LineChart + time range pill buttons (1D/1W/1M/1Y/5Y) |
| `lib/converter.ts` | Pure function: `convert(value, fromRate, toRate) => number` |
| `lib/storage.ts` | localStorage helpers: `loadCurrencies()`, `saveCurrencies()` |
| `lib/currencies.ts` | Static array of `{ code, name, flag }` for all ~170 currencies |
| `.env.example` | Placeholder env vars committed to repo |
| `__tests__/converter.test.ts` | Unit tests for conversion math |
| `__tests__/storage.test.ts` | Unit tests for localStorage helpers |
| `__tests__/api/rates.test.ts` | API route tests with mocked fetch |
| `__tests__/api/history.test.ts` | API route tests with mocked fetch |
| `__tests__/components/CurrencyRow.test.tsx` | RTL component tests |
| `__tests__/components/CurrencyPicker.test.tsx` | RTL component tests |
| `e2e/converter.spec.ts` | Playwright E2E: edit field, currencies persist, chart navigation |

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: all root config files (`package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `.env.example`, `.gitignore`)

- [ ] **Step 1: Bootstrap the app**

Run from inside `/Users/manuhume/GIT/rateio`:
```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```
Answer any prompts: accept defaults. This creates `app/`, `components/` (empty), `public/`, `tailwind.config.ts`, `next.config.ts`, `tsconfig.json`.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install recharts @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/jest ts-jest @playwright/test
```

- [ ] **Step 3: Configure Jest for Next.js**

Create `jest.config.ts`:
```ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.(test|spec).[jt]s?(x)'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
}

export default createJestConfig(config)
```

Create `jest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

Add to `package.json` scripts:
```json
"test": "jest",
"test:watch": "jest --watch",
"test:e2e": "playwright test"
```

- [ ] **Step 4: Configure Tailwind dark mode**

Edit `tailwind.config.ts` — set `darkMode: 'media'`:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: { extend: {} },
  plugins: [],
}
export default config
```

- [ ] **Step 5: Create .env.example and update .gitignore**

Create `.env.example`:
```
EXCHANGERATE_API_KEY=your_api_key_here
```

Ensure `.gitignore` contains:
```
.env.local
.env*.local
```

- [ ] **Step 6: Delete boilerplate**

Remove the default Next.js placeholder content:
- Delete `app/page.tsx` contents (replace with `export default function Home() { return <div /> }` temporarily)
- Delete `public/vercel.svg`, `public/next.svg`

- [ ] **Step 7: Verify the dev server starts**

```bash
EXCHANGERATE_API_KEY=test npm run dev
```
Expected: server running at `http://localhost:3000` with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, Jest, and dnd-kit"
```

---

## Task 2: `lib/converter.ts` — Pure conversion math

**Files:**
- Create: `lib/converter.ts`
- Create: `__tests__/converter.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/converter.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=converter
```
Expected: FAIL — `Cannot find module '@/lib/converter'`

- [ ] **Step 3: Implement `lib/converter.ts`**

Create `lib/converter.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=converter
```
Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add lib/converter.ts __tests__/converter.test.ts
git commit -m "feat: add converter lib with pure conversion math"
```

---

## Task 3: `lib/storage.ts` — localStorage helpers

**Files:**
- Create: `lib/storage.ts`
- Create: `__tests__/storage.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/storage.test.ts`:
```ts
import { loadCurrencies, saveCurrencies, DEFAULT_CURRENCIES } from '@/lib/storage'

const STORAGE_KEY = 'selectedCurrencies'

beforeEach(() => {
  localStorage.clear()
})

describe('loadCurrencies', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadCurrencies()).toEqual(DEFAULT_CURRENCIES)
  })

  it('returns stored currencies', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['USD', 'EUR']))
    expect(loadCurrencies()).toEqual(['USD', 'EUR'])
  })

  it('returns defaults when stored value is malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(loadCurrencies()).toEqual(DEFAULT_CURRENCIES)
  })
})

describe('saveCurrencies', () => {
  it('saves currencies to localStorage', () => {
    saveCurrencies(['GBP', 'JPY'])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(['GBP', 'JPY'])
  })

  it('does not throw if localStorage is unavailable', () => {
    const original = global.localStorage
    Object.defineProperty(global, 'localStorage', {
      value: { setItem: () => { throw new Error('unavailable') } },
      configurable: true,
    })
    expect(() => saveCurrencies(['USD'])).not.toThrow()
    Object.defineProperty(global, 'localStorage', { value: original, configurable: true })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=storage
```
Expected: FAIL — `Cannot find module '@/lib/storage'`

- [ ] **Step 3: Implement `lib/storage.ts`**

Create `lib/storage.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=storage
```
Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts __tests__/storage.test.ts
git commit -m "feat: add storage lib for localStorage currency persistence"
```

---

## Task 4: `lib/currencies.ts` — Static currency metadata

**Files:**
- Create: `lib/currencies.ts`

No unit tests — this is a static data file. Correctness is verified by visual inspection and the CurrencyPicker component test.

- [ ] **Step 1: Create `lib/currencies.ts`**

Create `lib/currencies.ts` with the full list. Include at minimum these (add remaining ~160 from ExchangeRate-API's supported list):
```ts
export interface Currency {
  code: string
  name: string
  flag: string  // emoji flag
}

export const CURRENCIES: Currency[] = [
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'AFN', name: 'Afghan Afghani', flag: '🇦🇫' },
  { code: 'ALL', name: 'Albanian Lek', flag: '🇦🇱' },
  { code: 'AMD', name: 'Armenian Dram', flag: '🇦🇲' },
  { code: 'ANG', name: 'Netherlands Antillean Guilder', flag: '🇨🇼' },
  { code: 'AOA', name: 'Angolan Kwanza', flag: '🇦🇴' },
  { code: 'ARS', name: 'Argentine Peso', flag: '🇦🇷' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'AWG', name: 'Aruban Florin', flag: '🇦🇼' },
  { code: 'AZN', name: 'Azerbaijani Manat', flag: '🇦🇿' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', flag: '🇧🇦' },
  { code: 'BBD', name: 'Barbadian Dollar', flag: '🇧🇧' },
  { code: 'BDT', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'BGN', name: 'Bulgarian Lev', flag: '🇧🇬' },
  { code: 'BHD', name: 'Bahraini Dinar', flag: '🇧🇭' },
  { code: 'BIF', name: 'Burundian Franc', flag: '🇧🇮' },
  { code: 'BMD', name: 'Bermudian Dollar', flag: '🇧🇲' },
  { code: 'BND', name: 'Brunei Dollar', flag: '🇧🇳' },
  { code: 'BOB', name: 'Bolivian Boliviano', flag: '🇧🇴' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'BSD', name: 'Bahamian Dollar', flag: '🇧🇸' },
  { code: 'BTN', name: 'Bhutanese Ngultrum', flag: '🇧🇹' },
  { code: 'BWP', name: 'Botswanan Pula', flag: '🇧🇼' },
  { code: 'BYN', name: 'Belarusian Ruble', flag: '🇧🇾' },
  { code: 'BZD', name: 'Belize Dollar', flag: '🇧🇿' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CDF', name: 'Congolese Franc', flag: '🇨🇩' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CLP', name: 'Chilean Peso', flag: '🇨🇱' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'COP', name: 'Colombian Peso', flag: '🇨🇴' },
  { code: 'CRC', name: 'Costa Rican Colón', flag: '🇨🇷' },
  { code: 'CUP', name: 'Cuban Peso', flag: '🇨🇺' },
  { code: 'CVE', name: 'Cape Verdean Escudo', flag: '🇨🇻' },
  { code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
  { code: 'DJF', name: 'Djiboutian Franc', flag: '🇩🇯' },
  { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'DOP', name: 'Dominican Peso', flag: '🇩🇴' },
  { code: 'DZD', name: 'Algerian Dinar', flag: '🇩🇿' },
  { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'ERN', name: 'Eritrean Nakfa', flag: '🇪🇷' },
  { code: 'ETB', name: 'Ethiopian Birr', flag: '🇪🇹' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'FJD', name: 'Fijian Dollar', flag: '🇫🇯' },
  { code: 'FKP', name: 'Falkland Islands Pound', flag: '🇫🇰' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'GEL', name: 'Georgian Lari', flag: '🇬🇪' },
  { code: 'GHS', name: 'Ghanaian Cedi', flag: '🇬🇭' },
  { code: 'GIP', name: 'Gibraltar Pound', flag: '🇬🇮' },
  { code: 'GMD', name: 'Gambian Dalasi', flag: '🇬🇲' },
  { code: 'GNF', name: 'Guinean Franc', flag: '🇬🇳' },
  { code: 'GTQ', name: 'Guatemalan Quetzal', flag: '🇬🇹' },
  { code: 'GYD', name: 'Guyanaese Dollar', flag: '🇬🇾' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'HNL', name: 'Honduran Lempira', flag: '🇭🇳' },
  { code: 'HRK', name: 'Croatian Kuna', flag: '🇭🇷' },
  { code: 'HTG', name: 'Haitian Gourde', flag: '🇭🇹' },
  { code: 'HUF', name: 'Hungarian Forint', flag: '🇭🇺' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'ILS', name: 'Israeli New Shekel', flag: '🇮🇱' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'IQD', name: 'Iraqi Dinar', flag: '🇮🇶' },
  { code: 'IRR', name: 'Iranian Rial', flag: '🇮🇷' },
  { code: 'ISK', name: 'Icelandic Króna', flag: '🇮🇸' },
  { code: 'JMD', name: 'Jamaican Dollar', flag: '🇯🇲' },
  { code: 'JOD', name: 'Jordanian Dinar', flag: '🇯🇴' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪' },
  { code: 'KGS', name: 'Kyrgystani Som', flag: '🇰🇬' },
  { code: 'KHR', name: 'Cambodian Riel', flag: '🇰🇭' },
  { code: 'KMF', name: 'Comorian Franc', flag: '🇰🇲' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'KYD', name: 'Cayman Islands Dollar', flag: '🇰🇾' },
  { code: 'KZT', name: 'Kazakhstani Tenge', flag: '🇰🇿' },
  { code: 'LAK', name: 'Laotian Kip', flag: '🇱🇦' },
  { code: 'LBP', name: 'Lebanese Pound', flag: '🇱🇧' },
  { code: 'LKR', name: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'LRD', name: 'Liberian Dollar', flag: '🇱🇷' },
  { code: 'LSL', name: 'Lesotho Loti', flag: '🇱🇸' },
  { code: 'LYD', name: 'Libyan Dinar', flag: '🇱🇾' },
  { code: 'MAD', name: 'Moroccan Dirham', flag: '🇲🇦' },
  { code: 'MDL', name: 'Moldovan Leu', flag: '🇲🇩' },
  { code: 'MGA', name: 'Malagasy Ariary', flag: '🇲🇬' },
  { code: 'MKD', name: 'Macedonian Denar', flag: '🇲🇰' },
  { code: 'MMK', name: 'Myanmar Kyat', flag: '🇲🇲' },
  { code: 'MNT', name: 'Mongolian Tögrög', flag: '🇲🇳' },
  { code: 'MOP', name: 'Macanese Pataca', flag: '🇲🇴' },
  { code: 'MRU', name: 'Mauritanian Ouguiya', flag: '🇲🇷' },
  { code: 'MUR', name: 'Mauritian Rupee', flag: '🇲🇺' },
  { code: 'MVR', name: 'Maldivian Rufiyaa', flag: '🇲🇻' },
  { code: 'MWK', name: 'Malawian Kwacha', flag: '🇲🇼' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'MZN', name: 'Mozambican Metical', flag: '🇲🇿' },
  { code: 'NAD', name: 'Namibian Dollar', flag: '🇳🇦' },
  { code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'NIO', name: 'Nicaraguan Córdoba', flag: '🇳🇮' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'NPR', name: 'Nepalese Rupee', flag: '🇳🇵' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'OMR', name: 'Omani Rial', flag: '🇴🇲' },
  { code: 'PAB', name: 'Panamanian Balboa', flag: '🇵🇦' },
  { code: 'PEN', name: 'Peruvian Sol', flag: '🇵🇪' },
  { code: 'PGK', name: 'Papua New Guinean Kina', flag: '🇵🇬' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'PLN', name: 'Polish Złoty', flag: '🇵🇱' },
  { code: 'PYG', name: 'Paraguayan Guaraní', flag: '🇵🇾' },
  { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'RON', name: 'Romanian Leu', flag: '🇷🇴' },
  { code: 'RSD', name: 'Serbian Dinar', flag: '🇷🇸' },
  { code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺' },
  { code: 'RWF', name: 'Rwandan Franc', flag: '🇷🇼' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'SBD', name: 'Solomon Islands Dollar', flag: '🇸🇧' },
  { code: 'SCR', name: 'Seychellois Rupee', flag: '🇸🇨' },
  { code: 'SDG', name: 'Sudanese Pound', flag: '🇸🇩' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'SHP', name: 'Saint Helena Pound', flag: '🇸🇭' },
  { code: 'SLL', name: 'Sierra Leonean Leone', flag: '🇸🇱' },
  { code: 'SOS', name: 'Somali Shilling', flag: '🇸🇴' },
  { code: 'SRD', name: 'Surinamese Dollar', flag: '🇸🇷' },
  { code: 'STN', name: 'São Tomé and Príncipe Dobra', flag: '🇸🇹' },
  { code: 'SVC', name: 'Salvadoran Colón', flag: '🇸🇻' },
  { code: 'SYP', name: 'Syrian Pound', flag: '🇸🇾' },
  { code: 'SZL', name: 'Swazi Lilangeni', flag: '🇸🇿' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'TJS', name: 'Tajikistani Somoni', flag: '🇹🇯' },
  { code: 'TMT', name: 'Turkmenistani Manat', flag: '🇹🇲' },
  { code: 'TND', name: 'Tunisian Dinar', flag: '🇹🇳' },
  { code: 'TOP', name: "Tongan Paʻanga", flag: '🇹🇴' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', flag: '🇹🇹' },
  { code: 'TWD', name: 'New Taiwan Dollar', flag: '🇹🇼' },
  { code: 'TZS', name: 'Tanzanian Shilling', flag: '🇹🇿' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', flag: '🇺🇦' },
  { code: 'UGX', name: 'Ugandan Shilling', flag: '🇺🇬' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'UYU', name: 'Uruguayan Peso', flag: '🇺🇾' },
  { code: 'UZS', name: 'Uzbekistani Som', flag: '🇺🇿' },
  { code: 'VES', name: 'Venezuelan Bolívar', flag: '🇻🇪' },
  { code: 'VND', name: 'Vietnamese Dong', flag: '🇻🇳' },
  { code: 'VUV', name: 'Vanuatu Vatu', flag: '🇻🇺' },
  { code: 'WST', name: 'Samoan Tālā', flag: '🇼🇸' },
  { code: 'XAF', name: 'Central African CFA Franc', flag: '🌍' },
  { code: 'XCD', name: 'East Caribbean Dollar', flag: '🌎' },
  { code: 'XOF', name: 'West African CFA Franc', flag: '🌍' },
  { code: 'XPF', name: 'CFP Franc', flag: '🌏' },
  { code: 'YER', name: 'Yemeni Rial', flag: '🇾🇪' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'ZMW', name: 'Zambian Kwacha', flag: '🇿🇲' },
  { code: 'ZWL', name: 'Zimbabwean Dollar', flag: '🇿🇼' },
]

export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES.find(c => c.code === code)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/currencies.ts
git commit -m "feat: add static currency metadata list"
```

---

## Task 5: `app/api/rates/route.ts` — Live rates API proxy

**Files:**
- Create: `app/api/rates/route.ts`
- Create: `__tests__/api/rates.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/rates.test.ts`:
```ts
// Mock the global fetch before importing the route handler
const mockRatesResponse = {
  result: 'success',
  time_last_update_utc: 'Fri, 20 Mar 2026 00:00:00 +0000',
  conversion_rates: { USD: 1, EUR: 0.922, GBP: 0.782 },
}

global.fetch = jest.fn()

describe('GET /api/rates', () => {
  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRatesResponse,
    })
    process.env.EXCHANGERATE_API_KEY = 'test-key'
  })

  it('returns rates and updatedAt', async () => {
    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()
    const data = await response.json()

    expect(data.rates).toEqual({ USD: 1, EUR: 0.922, GBP: 0.782 })
    expect(data.updatedAt).toBe('Fri, 20 Mar 2026 00:00:00 +0000')
    expect(response.status).toBe(200)
  })

  it('returns 500 when upstream fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 })
    const { GET } = await import('@/app/api/rates/route')
    const response = await GET()
    expect(response.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="api/rates"
```
Expected: FAIL — `Cannot find module '@/app/api/rates/route'`

- [ ] **Step 3: Implement `app/api/rates/route.ts`**

Create `app/api/rates/route.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="api/rates"
```
Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add app/api/rates/route.ts __tests__/api/rates.test.ts
git commit -m "feat: add /api/rates proxy with hourly revalidation"
```

---

## Task 6: `app/api/history/route.ts` — Historical rates API proxy

**Files:**
- Create: `app/api/history/route.ts`
- Create: `__tests__/api/history.test.ts`

The ExchangeRate-API historical endpoint for a date range is:
`GET /v6/{key}/history/{base}/{YYYY-MM-DD}/{YYYY-MM-DD}`

For the 1D range, fetch intraday data if available; for longer ranges, fetch day-by-day rates. The paid plan supports `timeseries` endpoint: `GET /v6/{key}/timeseries/{base}/{start}/{end}` returning `{ rates: { "YYYY-MM-DD": { target: number } } }`.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/history.test.ts`:
```ts
global.fetch = jest.fn()

const mockTimeseriesResponse = {
  result: 'success',
  base_code: 'EUR',
  rates: {
    '2026-03-18': { USD: 1.081 },
    '2026-03-19': { USD: 1.083 },
    '2026-03-20': { USD: 1.084 },
  },
}

describe('GET /api/history', () => {
  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTimeseriesResponse,
    })
    process.env.EXCHANGERATE_API_KEY = 'test-key'
  })

  it('returns dates and rates arrays', async () => {
    const { GET } = await import('@/app/api/history/route')
    const url = 'http://localhost/api/history?base=EUR&target=USD&days=3'
    const response = await GET(new Request(url))
    const data = await response.json()

    expect(data.dates).toEqual(['2026-03-18', '2026-03-19', '2026-03-20'])
    expect(data.rates).toEqual([1.081, 1.083, 1.084])
    expect(response.status).toBe(200)
  })

  it('returns 400 when base or target is missing', async () => {
    const { GET } = await import('@/app/api/history/route')
    const url = 'http://localhost/api/history?base=EUR'
    const response = await GET(new Request(url))
    expect(response.status).toBe(400)
  })

  it('returns 500 when upstream fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })
    const { GET } = await import('@/app/api/history/route')
    const url = 'http://localhost/api/history?base=EUR&target=USD&days=7'
    const response = await GET(new Request(url))
    expect(response.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="api/history"
```
Expected: FAIL — `Cannot find module '@/app/api/history/route'`

- [ ] **Step 3: Implement `app/api/history/route.ts`**

Create `app/api/history/route.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="api/history"
```
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add app/api/history/route.ts __tests__/api/history.test.ts
git commit -m "feat: add /api/history proxy with daily revalidation"
```

---

## Task 7: `components/Header.tsx` and `components/SkeletonRow.tsx`

**Files:**
- Create: `components/Header.tsx`
- Create: `components/SkeletonRow.tsx`

Simple presentational components — no dedicated tests; covered by page-level tests.

- [ ] **Step 1: Create `components/Header.tsx`**

```tsx
interface HeaderProps {
  updatedAt: string | null  // ISO string or null while loading
}

export default function Header({ updatedAt }: HeaderProps) {
  const label = updatedAt
    ? `Updated ${formatRelative(updatedAt)}`
    : 'Loading rates...'

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      <span className="text-base font-bold text-slate-900 dark:text-slate-100">
        💱 Rateio
      </span>
      <span className="text-xs text-slate-400">{label}</span>
    </header>
  )
}

function formatRelative(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return `${Math.floor(diffHrs / 24)}d ago`
}
```

- [ ] **Step 2: Create `components/SkeletonRow.tsx`**

```tsx
export default function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm animate-pulse">
      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="flex flex-col gap-1">
        <div className="w-10 h-3 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="w-16 h-2 rounded bg-slate-100 dark:bg-slate-600" />
      </div>
      <div className="ml-auto w-20 h-6 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Header.tsx components/SkeletonRow.tsx
git commit -m "feat: add Header and SkeletonRow components"
```

---

## Task 8: `components/CurrencyRow.tsx`

**Files:**
- Create: `components/CurrencyRow.tsx`
- Create: `__tests__/components/CurrencyRow.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/CurrencyRow.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CurrencyRow from '@/components/CurrencyRow'

const defaultProps = {
  code: 'USD',
  name: 'US Dollar',
  flag: '🇺🇸',
  value: '5.42',
  isActive: false,
  showChartIcon: true,
  onFocus: jest.fn(),
  onChange: jest.fn(),
  onChartClick: jest.fn(),
  onRemove: jest.fn(),
  dragHandleProps: {},
}

describe('CurrencyRow', () => {
  it('renders currency code, name and flag', () => {
    render(<CurrencyRow {...defaultProps} />)
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('US Dollar')).toBeInTheDocument()
    expect(screen.getByText('🇺🇸')).toBeInTheDocument()
  })

  it('displays the current value in the input', () => {
    render(<CurrencyRow {...defaultProps} />)
    expect(screen.getByRole('textbox')).toHaveValue('5.42')
  })

  it('applies active styling when isActive is true', () => {
    render(<CurrencyRow {...defaultProps} isActive={true} />)
    const row = screen.getByRole('textbox').closest('div[data-testid="currency-row"]')
    expect(row).toHaveClass('ring-2')
  })

  it('calls onChange with sanitised input (digits + decimal only)', async () => {
    render(<CurrencyRow {...defaultProps} />)
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '12.34abc')
    // onChange should have been called with sanitised values only
    const calls = (defaultProps.onChange as jest.Mock).mock.calls.map(c => c[0])
    expect(calls.every((v: string) => /^[\d.]*$/.test(v))).toBe(true)
  })

  it('calls onFocus when input is focused', () => {
    render(<CurrencyRow {...defaultProps} />)
    fireEvent.focus(screen.getByRole('textbox'))
    expect(defaultProps.onFocus).toHaveBeenCalled()
  })

  it('calls onChartClick when chart button is clicked', () => {
    render(<CurrencyRow {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /chart/i }))
    expect(defaultProps.onChartClick).toHaveBeenCalled()
  })

  it('hides chart icon when showChartIcon is false', () => {
    render(<CurrencyRow {...defaultProps} showChartIcon={false} />)
    expect(screen.queryByRole('button', { name: /chart/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="CurrencyRow"
```
Expected: FAIL — `Cannot find module '@/components/CurrencyRow'`

- [ ] **Step 3: Implement `components/CurrencyRow.tsx`**

```tsx
'use client'

import { useState } from 'react'

interface CurrencyRowProps {
  code: string
  name: string
  flag: string
  value: string
  isActive: boolean
  showChartIcon: boolean
  onFocus: () => void
  onChange: (value: string) => void
  onChartClick: () => void
  onRemove: () => void
  dragHandleProps: Record<string, unknown>
}

export default function CurrencyRow({
  code, name, flag, value, isActive, showChartIcon,
  onFocus, onChange, onChartClick, onRemove, dragHandleProps,
}: CurrencyRowProps) {
  const [swiped, setSwiped] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Sanitise: digits and at most one decimal point
    const raw = e.target.value
    const sanitised = raw.replace(/[^\d.]/g, '').replace(/^(\d*\.?\d*).*/, '$1')
    onChange(sanitised)
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return
    const delta = touchStartX - e.changedTouches[0].clientX
    if (delta > 60) setSwiped(true)   // swipe left reveals delete
    if (delta < -60) setSwiped(false) // swipe right hides delete
    setTouchStartX(null)
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete button revealed on swipe-left (mobile) */}
      <div
        className={`absolute inset-y-0 right-0 flex items-center transition-all duration-200 ${
          swiped ? 'w-20 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <button
          onClick={onRemove}
          aria-label="remove currency"
          className="h-full w-20 bg-red-500 text-white text-sm font-semibold"
        >
          Remove
        </button>
      </div>

      {/* Main row */}
      <div
        data-testid="currency-row"
        style={{ transform: swiped ? 'translateX(-80px)' : 'translateX(0)', transition: 'transform 0.2s' }}
        className={`group flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-3 shadow-sm transition-shadow ${
          isActive ? 'ring-2 ring-blue-500 rounded-xl' : 'rounded-xl'
        }`}
      >
        {/* Drag handle */}
        <span
          className="cursor-grab text-slate-300 dark:text-slate-600 select-none"
          aria-label="drag to reorder"
          {...dragHandleProps}
        >
          ⠿
        </span>

        {/* Flag */}
        <span className="text-2xl leading-none" aria-hidden="true">{flag}</span>

        {/* Code + name */}
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{code}</span>
          <span className="text-xs text-slate-400 truncate">{name}</span>
        </div>

        {/* Amount input */}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onFocus={onFocus}
          onChange={handleChange}
          className={`ml-auto text-xl font-semibold text-right w-28 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 ${
            isActive ? 'border-b border-blue-500' : ''
          }`}
          aria-label={`${code} amount`}
        />

        {/* Chart icon */}
        {showChartIcon && (
          <button
            onClick={onChartClick}
            aria-label="chart"
            className="text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 transition-colors"
          >
            📈
          </button>
        )}

        {/* Remove button — hover-reveal on desktop */}
        <button
          onClick={onRemove}
          aria-label="remove currency"
          className="hidden group-hover:flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors text-base leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="CurrencyRow"
```
Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add components/CurrencyRow.tsx __tests__/components/CurrencyRow.test.tsx
git commit -m "feat: add CurrencyRow component with input sanitisation"
```

---

## Task 9: `components/CurrencyPicker.tsx`

**Files:**
- Create: `components/CurrencyPicker.tsx`
- Create: `__tests__/components/CurrencyPicker.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/CurrencyPicker.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CurrencyPicker from '@/components/CurrencyPicker'

const defaultProps = {
  selected: ['EUR', 'USD'],
  onAdd: jest.fn(),
  onClose: jest.fn(),
}

describe('CurrencyPicker', () => {
  it('renders a search input', () => {
    render(<CurrencyPicker {...defaultProps} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('filters currencies by search term', async () => {
    render(<CurrencyPicker {...defaultProps} />)
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'pound')
    expect(screen.getByText('British Pound')).toBeInTheDocument()
    expect(screen.queryByText('US Dollar')).not.toBeInTheDocument()
  })

  it('shows a checkmark for already-selected currencies', () => {
    render(<CurrencyPicker {...defaultProps} />)
    // EUR is in selected — should show a checkmark indicator
    const eurRow = screen.getByText('EUR').closest('li')
    expect(eurRow).toHaveAttribute('aria-selected', 'true')
  })

  it('calls onAdd with currency code when an unselected currency is tapped', () => {
    render(<CurrencyPicker {...defaultProps} />)
    // Find GBP (not in selected) and click it
    const gbpRow = screen.getByText('GBP').closest('li')!
    fireEvent.click(gbpRow)
    expect(defaultProps.onAdd).toHaveBeenCalledWith('GBP')
  })

  it('does not call onAdd when at 10 currencies already', () => {
    const tenCurrencies = ['EUR','USD','GBP','JPY','CNY','AUD','CAD','CHF','HKD','SGD']
    render(<CurrencyPicker {...defaultProps} selected={tenCurrencies} />)
    const mxnRow = screen.getByText('MXN').closest('li')!
    fireEvent.click(mxnRow)
    expect(defaultProps.onAdd).not.toHaveBeenCalled()
  })

  it('calls onClose when close button is clicked', () => {
    render(<CurrencyPicker {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="CurrencyPicker"
```
Expected: FAIL — `Cannot find module '@/components/CurrencyPicker'`

- [ ] **Step 3: Implement `components/CurrencyPicker.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { CURRENCIES } from '@/lib/currencies'

interface CurrencyPickerProps {
  selected: string[]
  onAdd: (code: string) => void
  onClose: () => void
}

export default function CurrencyPicker({ selected, onAdd, onClose }: CurrencyPickerProps) {
  const [query, setQuery] = useState('')
  const atMax = selected.length >= 10

  const filtered = query.trim()
    ? CURRENCIES.filter(c =>
        c.code.toLowerCase().includes(query.toLowerCase()) ||
        c.name.toLowerCase().includes(query.toLowerCase())
      )
    : CURRENCIES

  function handleSelect(code: string) {
    if (selected.includes(code)) return  // already added
    if (atMax) return                    // at limit
    onAdd(code)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <span className="flex-1 text-base font-bold text-slate-900 dark:text-slate-100">
          Add currency {atMax && <span className="text-xs font-normal text-amber-500">(max 10)</span>}
        </span>
        <button
          onClick={onClose}
          aria-label="close"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
        <input
          type="text"
          placeholder="Search currency..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full text-sm bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 outline-none text-slate-900 dark:text-slate-100"
          autoFocus
        />
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto">
        {filtered.map(currency => {
          const isSelected = selected.includes(currency.code)
          return (
            <li
              key={currency.code}
              aria-selected={isSelected}
              onClick={() => handleSelect(currency.code)}
              className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800 cursor-pointer ${
                isSelected
                  ? 'opacity-50 cursor-default'
                  : atMax
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="text-xl">{currency.flag}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 w-12">{currency.code}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{currency.name}</span>
              {isSelected && <span className="ml-auto text-blue-500 text-sm">✓</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="CurrencyPicker"
```
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add components/CurrencyPicker.tsx __tests__/components/CurrencyPicker.test.tsx
git commit -m "feat: add CurrencyPicker modal with search and max-10 enforcement"
```

---

## Task 10: `components/RateChart.tsx`

**Files:**
- Create: `components/RateChart.tsx`

No dedicated unit tests — Recharts rendering is hard to unit-test meaningfully. Covered by E2E.

- [ ] **Step 1: Create `components/RateChart.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'

interface RateChartProps {
  base: string
  target: string
}

type Range = '1D' | '1W' | '1M' | '1Y' | '5Y'
const RANGE_DAYS: Record<Range, number> = { '1D': 1, '1W': 7, '1M': 30, '1Y': 365, '5Y': 1825 }
const RANGES: Range[] = ['1D', '1W', '1M', '1Y', '5Y']

interface DataPoint {
  date: string
  rate: number
}

export default function RateChart({ base, target }: RateChartProps) {
  const [range, setRange] = useState<Range>('1M')
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const days = RANGE_DAYS[range]
    fetch(`/api/history?base=${base}&target=${target}&days=${days}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load history')
        return r.json()
      })
      .then(({ dates, rates }: { dates: string[]; rates: number[] }) => {
        setData(dates.map((date, i) => ({ date, rate: rates[i] })))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [base, target, range])

  const high = data.length ? Math.max(...data.map(d => d.rate)) : null
  const low = data.length ? Math.min(...data.map(d => d.rate)) : null

  return (
    <div className="flex flex-col gap-4">
      {/* Range selector */}
      <div className="flex gap-2">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              range === r
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading && (
        <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      )}
      {error && (
        <p className="text-sm text-red-500 text-center py-8">{error}</p>
      )}
      {!loading && !error && data.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: number) => [v.toFixed(4), `${base}/${target}`]}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#rateGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{data[0]?.date}</span>
            <span>{data[data.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      {!loading && !error && high !== null && low !== null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
            <p className="text-xs text-slate-400 mb-1">Period high</p>
            <p className="text-base font-bold text-green-500">{high.toFixed(4)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
            <p className="text-xs text-slate-400 mb-1">Period low</p>
            <p className="text-base font-bold text-red-500">{low.toFixed(4)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/RateChart.tsx
git commit -m "feat: add RateChart component with Recharts and time range selector"
```

---

## Task 11: `app/layout.tsx` and `app/globals.css`

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Update `app/layout.tsx`**

Replace default contents with:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rateio — Currency Converter',
  description: 'Live currency conversion with historical charts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-100 dark:bg-slate-950 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Update `app/globals.css`**

Replace default contents with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: configure root layout and globals"
```

---

## Task 12: `app/page.tsx` — Main converter page

**Files:**
- Modify: `app/page.tsx`

This is the main orchestrating component. It wires together all the pieces.

- [ ] **Step 1: Implement `app/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Header from '@/components/Header'
import CurrencyRow from '@/components/CurrencyRow'
import SkeletonRow from '@/components/SkeletonRow'
import CurrencyPicker from '@/components/CurrencyPicker'
import { convert, formatAmount } from '@/lib/converter'
import { loadCurrencies, saveCurrencies } from '@/lib/storage'
import { getCurrency } from '@/lib/currencies'

interface RatesData {
  rates: Record<string, number>
  updatedAt: string
}

function SortableCurrencyRow(props: {
  id: string
  code: string
  rates: Record<string, number>
  activeCurrency: string
  activeValue: string
  showChartIcon: boolean
  onFocus: (code: string) => void
  onChange: (code: string, value: string) => void
  onChartClick: (code: string) => void
  onRemove: (code: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const currency = getCurrency(props.code)
  if (!currency) return null

  const displayValue = props.code === props.activeCurrency
    ? props.activeValue
    : formatAmount(
        convert(
          parseFloat(props.activeValue) || 0,
          props.rates[props.activeCurrency] ?? 1,
          props.rates[props.code] ?? 1,
        )
      )

  return (
    <div ref={setNodeRef} style={style}>
      <CurrencyRow
        code={currency.code}
        name={currency.name}
        flag={currency.flag}
        value={displayValue}
        isActive={props.code === props.activeCurrency}
        showChartIcon={props.showChartIcon}
        onFocus={() => props.onFocus(props.code)}
        onChange={v => props.onChange(props.code, v)}
        onChartClick={() => props.onChartClick(props.code)}
        onRemove={() => props.onRemove(props.code)}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [currencies, setCurrencies] = useState<string[]>([])
  const [ratesData, setRatesData] = useState<RatesData | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [activeCurrency, setActiveCurrency] = useState<string>('')
  const [activeValue, setActiveValue] = useState<string>('1.00')
  const [showPicker, setShowPicker] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Load persisted currencies on mount
  useEffect(() => {
    const saved = loadCurrencies()
    setCurrencies(saved)
    setActiveCurrency(saved[0])
  }, [])

  // Fetch live rates
  useEffect(() => {
    fetch('/api/rates')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((data: RatesData) => setRatesData(data))
      .catch(() => setLoadError(true))
  }, [])

  const handleFocus = useCallback((code: string) => {
    setActiveCurrency(code)
  }, [])

  const handleChange = useCallback((code: string, value: string) => {
    setActiveCurrency(code)
    setActiveValue(value)
  }, [])

  const handleChartClick = useCallback((code: string) => {
    router.push(`/chart/${activeCurrency}/${code}`)
  }, [activeCurrency, router])

  const handleAdd = useCallback((code: string) => {
    setCurrencies(prev => {
      const next = [...prev, code]
      saveCurrencies(next)
      return next
    })
    setShowPicker(false)
  }, [])

  const handleRemove = useCallback((code: string) => {
    setCurrencies(prev => {
      const next = prev.filter(c => c !== code)
      saveCurrencies(next)
      if (activeCurrency === code) setActiveCurrency(next[0] ?? '')
      return next
    })
  }, [activeCurrency])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setCurrencies(prev => {
      const oldIdx = prev.indexOf(String(active.id))
      const newIdx = prev.indexOf(String(over.id))
      const next = arrayMove(prev, oldIdx, newIdx)
      saveCurrencies(next)
      return next
    })
  }

  const isLoading = currencies.length === 0 || !ratesData

  return (
    <main className="max-w-[430px] mx-auto min-h-screen flex flex-col">
      <Header updatedAt={ratesData?.updatedAt ?? null} />

      {loadError && (
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs text-center py-2 px-4">
          Could not load rates. Showing cached data.
        </div>
      )}

      <div className="flex-1 px-3 py-3 flex flex-col gap-2.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={currencies} strategy={verticalListSortingStrategy}>
              {currencies.map(code => (
                <SortableCurrencyRow
                  key={code}
                  id={code}
                  code={code}
                  rates={ratesData.rates}
                  activeCurrency={activeCurrency}
                  activeValue={activeValue}
                  showChartIcon={currencies.length >= 2}
                  onFocus={handleFocus}
                  onChange={handleChange}
                  onChartClick={handleChartClick}
                  onRemove={handleRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Add currency */}
        {currencies.length < 10 && (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-3 text-sm text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            <span className="text-lg">＋</span> Add currency
          </button>
        )}
      </div>

      {showPicker && (
        <CurrencyPicker
          selected={currencies}
          onAdd={handleAdd}
          onClose={() => setShowPicker(false)}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 2: Verify dev server renders correctly**

```bash
npm run dev
```
Open `http://localhost:3000`. You should see skeleton rows while rates load, then the converter UI. Try typing in a field — all others should update. Add/remove currencies. Check dark mode by toggling your OS theme.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: implement main converter page with dnd-kit sorting"
```

---

## Task 13: `app/chart/[base]/[target]/page.tsx` — Chart page

**Files:**
- Create: `app/chart/[base]/[target]/page.tsx`

- [ ] **Step 1: Create `app/chart/[base]/[target]/page.tsx`**

```tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RateChart from '@/components/RateChart'
import { getCurrency } from '@/lib/currencies'
import { convert } from '@/lib/converter'

export default function ChartPage() {
  const { base, target } = useParams<{ base: string; target: string }>()
  const router = useRouter()
  const [currentRate, setCurrentRate] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/rates')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const rate = convert(1, data.rates[base] ?? 1, data.rates[target] ?? 1)
        setCurrentRate(rate)
      })
      .catch(() => {})
  }, [base, target])

  const baseCurrency = getCurrency(base)
  const targetCurrency = getCurrency(target)

  if (!baseCurrency || !targetCurrency) {
    return (
      <main className="max-w-[430px] mx-auto p-4">
        <p className="text-slate-500 text-sm">Invalid currency pair.</p>
      </main>
    )
  }

  return (
    <main className="max-w-[430px] mx-auto min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => router.back()}
          aria-label="go back"
          className="text-blue-500 text-xl leading-none"
        >
          ‹
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{baseCurrency.flag}</span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {base} → {target}
          </span>
          <span className="text-lg">{targetCurrency.flag}</span>
        </div>
        {currentRate !== null && (
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            1 {base} = {currentRate.toFixed(4)} {target}
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 px-4 py-4">
        <RateChart base={base} target={target} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify chart page works**

```bash
npm run dev
```
Open `http://localhost:3000`. Tap the 📈 icon on a currency row. You should navigate to `/chart/EUR/USD` (or whatever pair), see the chart load with the time range selector, and be able to go back with the ‹ button.

- [ ] **Step 3: Commit**

```bash
git add app/chart
git commit -m "feat: add chart page for currency pair history"
```

---

## Task 14: E2E tests with Playwright

**Files:**
- Create: `e2e/converter.spec.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: { EXCHANGERATE_API_KEY: process.env.EXCHANGERATE_API_KEY ?? '' },
  },
})
```

- [ ] **Step 2: Create `e2e/converter.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for rates to load (skeleton disappears)
    await page.waitForSelector('[data-testid="currency-row"]')
  })

  test('displays currency rows after loading', async ({ page }) => {
    const rows = page.locator('[data-testid="currency-row"]')
    await expect(rows).toHaveCountGreaterThan(1)
  })

  test('editing one field updates all others', async ({ page }) => {
    const inputs = page.locator('[data-testid="currency-row"] input')
    // Clear first input and type 100
    await inputs.first().fill('100')
    await inputs.first().press('Tab')
    // Second input should now have a non-zero converted value
    const secondValue = await inputs.nth(1).inputValue()
    expect(parseFloat(secondValue)).toBeGreaterThan(0)
    expect(parseFloat(secondValue)).not.toBeCloseTo(100, 0) // different currency
  })

  test('selected currencies persist across reload', async ({ page }) => {
    // Add GBP via picker if not already there (open picker, search, click)
    const addBtn = page.getByText('Add currency')
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.getByPlaceholder(/search/i).fill('Swiss')
      await page.getByText('Swiss Franc').click()
    }
    // Reload
    await page.reload()
    await page.waitForSelector('[data-testid="currency-row"]')
    // CHF should still be visible
    await expect(page.getByText('CHF')).toBeVisible()
  })

  test('navigates to chart page and back', async ({ page }) => {
    // Click the chart icon on the second row
    const chartButtons = page.getByRole('button', { name: /chart/i })
    await chartButtons.first().click()
    // Should be on a chart page
    await expect(page).toHaveURL(/\/chart\//)
    // Time range buttons should be visible
    await expect(page.getByText('1M')).toBeVisible()
    // Go back
    await page.getByRole('button', { name: /go back/i }).click()
    await expect(page).toHaveURL('/')
  })
})
```

- [ ] **Step 3: Install Playwright browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 4: Run E2E tests**

```bash
npm run test:e2e
```
Expected: all 4 tests pass. If rates aren't loading (missing API key), set `EXCHANGERATE_API_KEY` in `.env.local` first.

- [ ] **Step 5: Commit**

```bash
git add e2e/ playwright.config.ts
git commit -m "test: add Playwright E2E tests for converter flow"
```

---

## Task 15: GitHub + Vercel deployment

**Files:**
- No code changes — deployment configuration

- [ ] **Step 1: Initialise git and push to GitHub**

```bash
git init   # if not already a git repo
gh repo create rateio --public --source=. --push
```
Or create the repo manually on GitHub and:
```bash
git remote add origin https://github.com/<your-username>/rateio.git
git push -u origin main
```

- [ ] **Step 2: Create Vercel project**

Go to [vercel.com/new](https://vercel.com/new), import the GitHub repo `rateio`. Vercel auto-detects Next.js — accept all defaults.

- [ ] **Step 3: Set environment variable in Vercel**

In the Vercel project dashboard → Settings → Environment Variables:
- Name: `EXCHANGERATE_API_KEY`
- Value: your actual API key
- Environment: Production + Preview

- [ ] **Step 4: Trigger a deploy**

```bash
git commit --allow-empty -m "chore: trigger initial Vercel deploy"
git push
```

Check the Vercel dashboard — the deploy should complete and a production URL should be assigned.

- [ ] **Step 5: Verify production**

Open the Vercel production URL on a mobile browser. Confirm:
- Rates load within a few seconds
- Editing a field updates all others
- 📈 navigates to chart page
- Dark mode follows system preference

---

## Final checklist

- [ ] `npm test` — all unit + component tests pass
- [ ] `npm run build` — production build succeeds with no type errors
- [ ] `npm run test:e2e` — all 4 Playwright tests pass
- [ ] Production URL works on mobile with dark mode
