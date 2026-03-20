import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CurrencyPicker from '@/components/CurrencyPicker'

const defaultProps = {
  selected: ['EUR', 'USD'],
  onAdd: jest.fn(),
  onClose: jest.fn(),
}

describe('CurrencyPicker', () => {
  beforeEach(() => jest.clearAllMocks())

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
