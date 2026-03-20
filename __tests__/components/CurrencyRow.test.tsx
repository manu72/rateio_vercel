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
