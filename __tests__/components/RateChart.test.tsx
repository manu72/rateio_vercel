import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

jest.mock('@/lib/storage', () => ({
  loadActiveValue: jest.fn(() => '100'),
  saveActiveValue: jest.fn(),
}))

import { loadActiveValue, saveActiveValue } from '@/lib/storage'
import RateChart from '@/components/RateChart'

const mockLoadActiveValue = loadActiveValue as jest.MockedFunction<typeof loadActiveValue>
const mockSaveActiveValue = saveActiveValue as jest.MockedFunction<typeof saveActiveValue>

beforeEach(() => {
  jest.clearAllMocks()
  mockLoadActiveValue.mockReturnValue('100')
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        dates: ['2025-01-01', '2025-01-02'],
        rates: [1.08, 1.10],
      }),
    } as Response)
  )
})

describe('RateChart conversion card', () => {
  it('renders base and target inputs when currentRate is provided', async () => {
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    expect(screen.getByLabelText('Amount in EUR')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount in USD')).toBeInTheDocument()
    await screen.findByText('Period high')
  })

  it('hides conversion card when currentRate is null', async () => {
    render(<RateChart base="EUR" target="USD" currentRate={null} />)
    await screen.findByText('Period high')
    expect(screen.queryByLabelText('Amount in EUR')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Amount in USD')).not.toBeInTheDocument()
  })

  it('hydrates activeAmount from localStorage on mount', async () => {
    mockLoadActiveValue.mockReturnValue('250')
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in EUR')).toHaveValue('250')
    })
    expect(mockLoadActiveValue).toHaveBeenCalled()
  })

  it('displays correct target value as base * rate', async () => {
    mockLoadActiveValue.mockReturnValue('100')
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in EUR')).toHaveValue('100')
    })
    expect(screen.getByLabelText('Amount in USD')).toHaveValue('110.0000')
  })

  it('derives target value when focusing the target input', async () => {
    mockLoadActiveValue.mockReturnValue('100')
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in EUR')).toHaveValue('100')
    })
    fireEvent.focus(screen.getByLabelText('Amount in USD'))
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in USD')).toHaveValue('110.0000')
    })
  })

  it('derives base value when switching back from target to base', async () => {
    mockLoadActiveValue.mockReturnValue('100')
    render(<RateChart base="EUR" target="USD" currentRate={2.0} />)
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in EUR')).toHaveValue('100')
    })
    fireEvent.focus(screen.getByLabelText('Amount in USD'))
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in USD')).toHaveValue('200.0000')
    })
    fireEvent.focus(screen.getByLabelText('Amount in EUR'))
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in EUR')).toHaveValue('100.0000')
    })
  })

  it('saves base value directly when editing base input', async () => {
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in EUR')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText('Amount in EUR'), { target: { value: '50' } })
    expect(mockSaveActiveValue).toHaveBeenCalledWith('50')
  })

  it('saves converted base value when editing target input', async () => {
    render(<RateChart base="EUR" target="USD" currentRate={2.0} />)
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in EUR')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText('Amount in USD'), { target: { value: '200' } })
    expect(mockSaveActiveValue).toHaveBeenCalledWith('100.0000')
  })

  it('does not save when editing target with currentRate === 0', async () => {
    render(<RateChart base="EUR" target="USD" currentRate={0} />)
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in EUR')).toBeInTheDocument()
    })
    mockSaveActiveValue.mockClear()
    fireEvent.change(screen.getByLabelText('Amount in USD'), { target: { value: '50' } })
    expect(mockSaveActiveValue).not.toHaveBeenCalled()
  })

  it('handles currentRate === 0 without division errors', async () => {
    mockLoadActiveValue.mockReturnValue('100')
    render(<RateChart base="EUR" target="USD" currentRate={0} />)
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in EUR')).toHaveValue('100')
    })
    expect(screen.getByLabelText('Amount in USD')).toHaveValue('0.0000')
  })

  it('sanitises non-numeric input characters', async () => {
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    await waitFor(() => {
      expect(screen.getByLabelText('Amount in EUR')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText('Amount in EUR'), { target: { value: '12.34abc' } })
    expect(screen.getByLabelText('Amount in EUR')).toHaveValue('12.34')
    fireEvent.change(screen.getByLabelText('Amount in EUR'), { target: { value: '1.2.3' } })
    expect(screen.getByLabelText('Amount in EUR')).toHaveValue('1.23')
  })
})

describe('RateChart history fetch UX', () => {
  it('shows error message when history fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({ ok: false } as Response)
    )
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    await screen.findByText('Failed to load history')
    expect(screen.queryByText('Period high')).not.toBeInTheDocument()
  })

  it('shows empty-state message when history returns no data points', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ dates: [], rates: [] }),
      } as Response)
    )
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    await screen.findByText('No data available for this range.')
  })

  it('renders period high and low stats from history data', async () => {
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    await screen.findByText('Period high')
    expect(screen.getByText('1.1000')).toBeInTheDocument()
    expect(screen.getByText('Period low')).toBeInTheDocument()
    expect(screen.getByText('1.0800')).toBeInTheDocument()
  })

  it('renders date range labels from history data', async () => {
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    await screen.findByText('Period high')
    expect(screen.getByText('2025-01-01')).toBeInTheDocument()
    expect(screen.getByText('2025-01-02')).toBeInTheDocument()
  })

  it('renders all five range selector buttons', async () => {
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    for (const label of ['1 day', '1 week', '1 month', '1 year', '5 years']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    await screen.findByText('Period high')
  })

  it('re-fetches data when a different range button is clicked', async () => {
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    await screen.findByText('Period high')

    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          dates: ['2024-12-24', '2024-12-25'],
          rates: [1.03, 1.05],
        }),
      } as Response)
    )

    fireEvent.click(screen.getByRole('button', { name: '1 week' }))
    await waitFor(() => {
      expect(screen.getByText('1.0500')).toBeInTheDocument()
    })
    expect(screen.getByText('1.0300')).toBeInTheDocument()
  })

  it('renders "View live rates" link with correct href', async () => {
    render(<RateChart base="EUR" target="USD" currentRate={1.1} />)
    const link = screen.getByRole('link', { name: /view live.*rates/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('EUR'))
    expect(link).toHaveAttribute('href', expect.stringContaining('USD'))
    expect(link).toHaveAttribute('target', '_blank')
    await screen.findByText('Period high')
  })
})
