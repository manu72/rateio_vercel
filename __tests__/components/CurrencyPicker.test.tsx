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

  it('does not call onAdd when clicking an already-selected currency', () => {
    render(<CurrencyPicker {...defaultProps} />)
    const eurRow = screen.getByText('EUR').closest('li')!
    fireEvent.click(eurRow)
    expect(defaultProps.onAdd).not.toHaveBeenCalled()
  })

  it('shows no options when search matches nothing', async () => {
    render(<CurrencyPicker {...defaultProps} />)
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'zzzznotacurrency')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('selects a currency via Enter key', () => {
    render(<CurrencyPicker {...defaultProps} />)
    const gbpRow = screen.getByText('GBP').closest('li')!
    fireEvent.keyDown(gbpRow, { key: 'Enter' })
    expect(defaultProps.onAdd).toHaveBeenCalledWith('GBP')
  })

  it('selects a currency via Space key', () => {
    render(<CurrencyPicker {...defaultProps} />)
    const gbpRow = screen.getByText('GBP').closest('li')!
    fireEvent.keyDown(gbpRow, { key: ' ' })
    expect(defaultProps.onAdd).toHaveBeenCalledWith('GBP')
  })

  it('calls onClose when clicking the backdrop overlay', () => {
    const { container } = render(<CurrencyPicker {...defaultProps} />)
    // Backdrop is the outermost fixed div
    fireEvent.click(container.firstElementChild!)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
