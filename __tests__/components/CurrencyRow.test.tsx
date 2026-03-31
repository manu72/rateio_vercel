import { render, screen, fireEvent, act } from '@testing-library/react'
import CurrencyRow from '@/components/CurrencyRow'

const defaultProps = {
  code: 'USD',
  flag: '🇺🇸',
  value: '5.42',
  isActive: false,
  showChartIcon: true,
  chartDisabled: false,
  chartPending: false,
  onFocus: jest.fn(),
  onChange: jest.fn(),
  onChartClick: jest.fn(),
  onRemove: jest.fn(),
  dragHandleProps: {},
}

describe('CurrencyRow', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders currency code and flag', () => {
    render(<CurrencyRow {...defaultProps} />)
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('🇺🇸')).toBeInTheDocument()
  })

  it('displays the current value in the input', () => {
    render(<CurrencyRow {...defaultProps} />)
    expect(screen.getByRole('textbox')).toHaveValue('5.42')
  })

  it('applies active styling when isActive is true', () => {
    render(<CurrencyRow {...defaultProps} isActive={true} />)
    const row = screen.getByRole('textbox').closest('div[data-testid="currency-row"]')
    expect(row).toHaveClass('bg-blue-50')
  })

  it('strips non-numeric characters and collapses multiple decimals', () => {
    render(<CurrencyRow {...defaultProps} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '12.34abc' } })
    expect(defaultProps.onChange).toHaveBeenCalledWith('12.34')
    fireEvent.change(input, { target: { value: '1.2.3' } })
    expect(defaultProps.onChange).toHaveBeenCalledWith('1.23')
    fireEvent.change(input, { target: { value: '.5' } })
    expect(defaultProps.onChange).toHaveBeenCalledWith('0.5')
  })

  it('calls onRemove when the remove button is clicked', () => {
    render(<CurrencyRow {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /remove currency/i }))
    expect(defaultProps.onRemove).toHaveBeenCalled()
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

  it('hides chart icon for the active currency (same-to-same chart is meaningless)', () => {
    render(<CurrencyRow {...defaultProps} isActive={true} showChartIcon={true} />)
    expect(screen.queryByRole('button', { name: /chart/i })).not.toBeInTheDocument()
  })

  it('drag handle has touch-action:none so mobile touch events reach dnd-kit', () => {
    render(<CurrencyRow {...defaultProps} />)
    const handle = screen.getByLabelText('drag to reorder')
    expect(handle).toHaveClass('touch-none')
  })
})

describe('CurrencyRow pending state', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows spinner with disabled button when chartPending is true', () => {
    render(<CurrencyRow {...defaultProps} chartPending={true} />)
    const btn = screen.getByRole('button', { name: /loading chart/i })
    expect(btn).toBeDisabled()
  })

  it('does not call onChartClick when pending button is clicked', () => {
    render(<CurrencyRow {...defaultProps} chartPending={true} />)
    fireEvent.click(screen.getByRole('button', { name: /loading chart/i }))
    expect(defaultProps.onChartClick).not.toHaveBeenCalled()
  })

  it('uses "chart" aria-label when not pending', () => {
    render(<CurrencyRow {...defaultProps} chartPending={false} />)
    expect(screen.getByRole('button', { name: 'chart' })).not.toBeDisabled()
  })
})

describe('CurrencyRow disabled chart state', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows disabled icon with correct aria label', () => {
    render(<CurrencyRow {...defaultProps} chartDisabled={true} />)
    expect(screen.getByRole('button', { name: /historical data unavailable/i })).toBeInTheDocument()
  })

  it('hides the normal chart button when chartDisabled is true', () => {
    render(<CurrencyRow {...defaultProps} chartDisabled={true} />)
    expect(screen.queryByRole('button', { name: 'chart' })).not.toBeInTheDocument()
  })

  it('shows tooltip on click and auto-hides after timeout', () => {
    jest.useFakeTimers()
    render(<CurrencyRow {...defaultProps} chartDisabled={true} />)
    fireEvent.click(screen.getByRole('button', { name: /historical data unavailable/i }))
    expect(screen.getByRole('tooltip')).toHaveTextContent(/historical data is unavailable/i)
    act(() => { jest.advanceTimersByTime(2500) })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  it('shows tooltip on hover and hides on mouse leave', () => {
    render(<CurrencyRow {...defaultProps} chartDisabled={true} />)
    const btn = screen.getByRole('button', { name: /historical data unavailable/i })
    fireEvent.mouseEnter(btn)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.mouseLeave(btn)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})

describe('CurrencyRow swipe gesture', () => {
  beforeEach(() => jest.clearAllMocks())

  function getContainer() {
    return screen.getByTestId('currency-row').parentElement!
  }

  it('reveals delete button on left swipe (delta > 60px)', () => {
    render(<CurrencyRow {...defaultProps} />)
    const container = getContainer()
    fireEvent.touchStart(container, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100 }] })
    expect(screen.getByTestId('currency-row')).toHaveStyle({ transform: 'translateX(-80px)' })
  })

  it('hides delete button on right swipe after revealing', () => {
    render(<CurrencyRow {...defaultProps} />)
    const container = getContainer()
    fireEvent.touchStart(container, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100 }] })
    expect(screen.getByTestId('currency-row')).toHaveStyle({ transform: 'translateX(-80px)' })
    fireEvent.touchStart(container, { touches: [{ clientX: 100 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 200 }] })
    expect(screen.getByTestId('currency-row')).toHaveStyle({ transform: 'translateX(0)' })
  })

  it('ignores small swipe gestures (delta between -60 and 60)', () => {
    render(<CurrencyRow {...defaultProps} />)
    const container = getContainer()
    fireEvent.touchStart(container, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 170 }] })
    expect(screen.getByTestId('currency-row')).toHaveStyle({ transform: 'translateX(0)' })
  })

  it('calls onRemove when revealed delete button is clicked', () => {
    render(<CurrencyRow {...defaultProps} />)
    const container = getContainer()
    fireEvent.touchStart(container, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100 }] })
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(defaultProps.onRemove).toHaveBeenCalled()
  })
})
