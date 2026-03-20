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
  beforeEach(() => jest.clearAllMocks())

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

  it('drag handle has touch-action:none so mobile touch events reach dnd-kit', () => {
    render(<CurrencyRow {...defaultProps} />)
    const handle = screen.getByLabelText('drag to reorder')
    expect(handle).toHaveClass('touch-none')
  })
})
