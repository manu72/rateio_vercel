import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@/components/ThemeProvider'
import { SWRTestConfig } from './helpers/swr-test-config'

const mockPush = jest.fn()
const mockPrefetch = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: mockPrefetch }),
}))

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: jest.fn(),
  PointerSensor: jest.fn(),
  TouchSensor: jest.fn(),
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn(() => []),
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
  }),
  arrayMove: jest.fn((arr: string[], from: number, to: number) => {
    const result = [...arr]
    const [removed] = result.splice(from, 1)
    result.splice(to, 0, removed)
    return result
  }),
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}))

import Home from '@/app/page'

const MOCK_RATES = {
  rates: { EUR: 0.92, USD: 1.0, GBP: 0.79 },
  updatedAt: '2025-01-01T00:00:00Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  localStorage.setItem('selectedCurrencies', JSON.stringify(['EUR', 'USD', 'GBP']))
  localStorage.setItem('activeValue', '100')
  localStorage.setItem('activeCurrency', 'EUR')
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(MOCK_RATES),
    } as Response)
  )
})

async function renderHome() {
  render(
    <ThemeProvider>
      <SWRTestConfig>
        <Home />
      </SWRTestConfig>
    </ThemeProvider>
  )
  await waitFor(() => {
    expect(screen.getAllByTestId('currency-row').length).toBeGreaterThanOrEqual(3)
  })
}

describe('Home page focus-switch conversion', () => {
  it('shows converted values for non-active rows', async () => {
    await renderHome()
    expect(screen.getByLabelText('EUR amount')).toHaveValue('100')
    // convert(100, 0.92, 1.0) = (100/0.92)*1.0 ≈ 108.70
    expect(screen.getByLabelText('USD amount')).toHaveValue('108.70')
    // convert(100, 0.92, 0.79) = (100/0.92)*0.79 ≈ 85.87
    expect(screen.getByLabelText('GBP amount')).toHaveValue('85.87')
  })

  it('converts activeValue when focusing a different row', async () => {
    await renderHome()
    fireEvent.focus(screen.getByLabelText('USD amount'))
    await waitFor(() => {
      // handleFocus('USD'): formatAmount(convert(100, 0.92, 1.0)) = '108.70'
      expect(screen.getByLabelText('USD amount')).toHaveValue('108.70')
    })
    // EUR recalculated from USD: convert(108.70, 1.0, 0.92) = 100.004 → '100.00'
    expect(screen.getByLabelText('EUR amount')).toHaveValue('100.00')
  })

  it('uses fallback rate of 1 when a currency rate is missing', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          rates: { EUR: 0.92, USD: 1.0 },
          updatedAt: '2025-01-01T00:00:00Z',
        }),
      } as Response)
    )
    await renderHome()
    // GBP rate missing → falls back to 1: convert(100, 0.92, 1) ≈ 108.70
    expect(screen.getByLabelText('GBP amount')).toHaveValue('108.70')
  })
})

describe('Home page loadError banner', () => {
  it('does not show error banner when there is no cached data', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network')))
    render(
      <ThemeProvider>
        <SWRTestConfig>
          <Home />
        </SWRTestConfig>
      </ThemeProvider>
    )
    // SWR will set error; banner only shows when cached data exists
    await waitFor(() => {
      expect(screen.queryByText(/could not refresh rates/i)).not.toBeInTheDocument()
    })
  })

  it('shows cached-data banner when refresh fails but cache exists', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network')))
    render(
      <ThemeProvider>
        <SWRTestConfig fallback={{ '/api/rates': MOCK_RATES }}>
          <Home />
        </SWRTestConfig>
      </ThemeProvider>
    )
    await screen.findByText(/could not refresh rates/i)
  })

  it('does not show error banner when rate fetch succeeds', async () => {
    await renderHome()
    expect(screen.queryByText(/could not refresh rates/i)).not.toBeInTheDocument()
  })
})
