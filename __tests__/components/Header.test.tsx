import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from '@/components/Header'
import { ThemeProvider } from '@/components/ThemeProvider'

function renderHeader(updatedAt: string | null = null) {
  return render(
    <ThemeProvider>
      <Header updatedAt={updatedAt} />
    </ThemeProvider>
  )
}

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  localStorage.clear()
})

describe('Header', () => {
  it('renders the Rateio logo and title', () => {
    renderHeader()
    expect(screen.getByText('Rateio')).toBeInTheDocument()
  })

  it('renders "Loading rates..." when updatedAt is null', () => {
    renderHeader(null)
    expect(screen.getByText('Loading rates...')).toBeInTheDocument()
  })

  it('renders a theme toggle button', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })

  it('toggles dark class on html when button is clicked', async () => {
    renderHeader()
    const btn = screen.getByRole('button', { name: /toggle theme/i })
    await userEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await userEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('displays formatted timestamp when updatedAt is provided', () => {
    renderHeader('2025-03-15')
    expect(screen.queryByText('Loading rates...')).not.toBeInTheDocument()
    expect(screen.getByText(/^Updated/)).toBeInTheDocument()
  })

  it('falls back to raw string for an invalid date', () => {
    renderHeader('not-a-date')
    expect(screen.getByText('Updated not-a-date')).toBeInTheDocument()
  })
})
