import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/ThemeProvider'

// mockUseParams is accessible inside jest.mock factory because it starts with 'mock'
const mockUseParams = jest.fn(() => ({ base: 'aud', target: 'eur' }))
const mockPush = jest.fn()

// Mock next/navigation — required for useParams and useRouter
jest.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push: mockPush }),
}))

// Mock fetch so the rate API call doesn't fail in tests
global.fetch = jest.fn(() => Promise.resolve({ ok: false } as Response))

import ChartPage from '@/app/chart/[base]/[target]/page'

async function renderChart() {
  render(
    <ThemeProvider>
      <ChartPage />
    </ThemeProvider>
  )
  // Wait for RateChart's fetch useEffect to settle (setLoading, setError)
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
        <ChartPage />
      </ThemeProvider>
    )
    // Invalid pair doesn't render RateChart — wait for the rates useEffect to settle
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
