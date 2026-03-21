import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '@/components/ThemeProvider'

// Helper component that renders theme state and a toggle button
function TestConsumer() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <ThemeProvider>
      <TestConsumer />
    </ThemeProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ThemeProvider', () => {
  it('reads initial theme from html class (dark)', () => {
    document.documentElement.classList.add('dark')
    renderWithProvider()
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('reads initial theme from html class (light)', () => {
    renderWithProvider()
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })

  it('toggles from light to dark', async () => {
    renderWithProvider()
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggles from dark to light', async () => {
    document.documentElement.classList.add('dark')
    renderWithProvider()
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persists dark preference to localStorage when it differs from OS', async () => {
    // jsdom matchMedia returns false (light) by default
    renderWithProvider()
    await userEvent.click(screen.getByRole('button')) // toggle to dark
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('clears localStorage when new theme matches OS preference', async () => {
    // OS is light (jsdom default); start in dark, toggle to light → matches OS → clear
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
    renderWithProvider()
    await userEvent.click(screen.getByRole('button')) // toggle to light
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('does not throw when localStorage is unavailable', async () => {
    // localStorage.setItem/removeItem throw in some private browsing contexts.
    // We verify the toggle still completes by asserting the DOM class changed —
    // the DOM manipulation happens before the localStorage call, so if the try/catch
    // is missing, the error would escape into React's event system and fail the test.
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('unavailable') })
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('unavailable') })
    renderWithProvider()
    await userEvent.click(screen.getByRole('button'))
    // DOM class changed → toggleTheme ran to completion without the error escaping
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('throws if useTheme is called outside ThemeProvider', () => {
    // Suppress the console.error React logs for this expected throw
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useTheme must be used within ThemeProvider')
    spy.mockRestore()
  })
})
