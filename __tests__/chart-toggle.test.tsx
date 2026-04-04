import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/ThemeProvider'
import { SWRTestConfig } from './helpers/swr-test-config'

// mockUseParams is accessible inside jest.mock factory because it starts with 'mock'
const mockUseParams = jest.fn(() => ({ base: 'aud', target: 'eur' }))
const mockPush = jest.fn()

// Mock next/navigation — required for useParams and useRouter
jest.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push: mockPush }),
}))

// Default: fail all fetches; success-path tests override per-describe
global.fetch = jest.fn(() => Promise.resolve({ ok: false } as Response))

import ChartPage from '@/app/chart/[base]/[target]/page'

async function renderChart() {
  render(
    <ThemeProvider>
      <SWRTestConfig>
        <ChartPage />
      </SWRTestConfig>
    </ThemeProvider>
  )
  // Wait for SWR to settle after fetch error
  await waitFor(() => expect(screen.getByText(/failed to load history/i)).toBeInTheDocument())
}

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  localStorage.clear()
  mockUseParams.mockReturnValue({ base: 'aud', target: 'eur' })
  mockPush.mockReset()
})

describe('ChartPage theme toggle', () => {
  it('renders the theme toggle button in the header', async () => {
    await renderChart()
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })

  it('toggles dark class on html when button is clicked', async () => {
    await renderChart()
    const btn = screen.getByRole('button', { name: /toggle theme/i })
    await userEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await userEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('does not render toggle button in the invalid-pair error path', async () => {
    mockUseParams.mockReturnValue({ base: 'ZZZ', target: 'XXX' })
    render(
      <ThemeProvider>
        <SWRTestConfig>
          <ChartPage />
        </SWRTestConfig>
      </ThemeProvider>
    )
    await waitFor(() => expect(screen.getByText(/invalid currency pair/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /toggle theme/i })).toBeNull()
  })
})

describe('ChartPage target currency picker', () => {
  it('renders target currency as a clickable button', async () => {
    await renderChart()
    expect(screen.getByRole('button', { name: /switch target currency/i })).toBeInTheDocument()
  })

  it('opens currency picker when target button is clicked', async () => {
    await renderChart()
    await userEvent.click(screen.getByRole('button', { name: /switch target currency/i }))
    // CurrencyPicker renders a search input when open
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('navigates to new chart URL when a currency is selected', async () => {
    await renderChart()
    await userEvent.click(screen.getByRole('button', { name: /switch target currency/i }))
    // CurrencyPicker lists currencies — click one that isn't the base (AUD)
    const usdOption = screen.getByRole('option', { name: /USD/i })
    await userEvent.click(usdOption)
    expect(mockPush).toHaveBeenCalledWith('/chart/AUD/USD')
  })
})

describe('ChartPage success path', () => {
  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/api/rates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            rates: { AUD: 1.5, EUR: 0.92, USD: 1.0, GBP: 0.79, JPY: 149.5, CHF: 0.88 },
          }),
        })
      }
      if (url.startsWith('/api/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            dates: ['2025-01-01', '2025-01-02'],
            rates: [0.62, 0.63],
          }),
        })
      }
      return Promise.resolve({ ok: false } as Response)
    })
  })

  async function renderSuccessChart() {
    render(
      <ThemeProvider>
        <SWRTestConfig>
          <ChartPage />
        </SWRTestConfig>
      </ThemeProvider>
    )
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in AUD')).toBeInTheDocument()
    })
  }

  it('computes currentRate from fetched rates and shows conversion card', async () => {
    await renderSuccessChart()
    // convert(1, 1.5, 0.92) = 0.6133...
    // baseValue = '1.00', targetValue = (1 * 0.6133...).toFixed(4) = '0.6133'
    expect(screen.getByLabelText('Amount in AUD')).toHaveValue('1.00')
    expect(screen.getByLabelText('Amount in EUR')).toHaveValue('0.6133')
  })

  it('renders period high/low stats when history data loads', async () => {
    await renderSuccessChart()
    await waitFor(() => {
      expect(screen.getByText('Period high')).toBeInTheDocument()
    })
    expect(screen.getByText('0.6300')).toBeInTheDocument()
    expect(screen.getByText('0.6200')).toBeInTheDocument()
  })

  it('saves new currency to storage when picker selection is made', async () => {
    await renderSuccessChart()
    await userEvent.click(screen.getByRole('button', { name: /switch target currency/i }))
    // CHF is in HISTORICAL_CURRENCIES but NOT in DEFAULT_CURRENCIES
    await userEvent.click(screen.getByRole('option', { name: /CHF/i }))
    const saved = JSON.parse(localStorage.getItem('selectedCurrencies')!)
    expect(saved).toContain('CHF')
    expect(mockPush).toHaveBeenCalledWith('/chart/AUD/CHF')
  })
})
