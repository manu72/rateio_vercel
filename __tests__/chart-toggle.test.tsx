import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/ThemeProvider'

// Mock next/navigation — required for useParams and useRouter
jest.mock('next/navigation', () => ({
  useParams: () => ({ base: 'aud', target: 'eur' }),
  useRouter: () => ({ push: jest.fn() }),
}))

// Mock fetch so the rate API call doesn't fail in tests
global.fetch = jest.fn(() => Promise.resolve({ ok: false } as Response))

import ChartPage from '@/app/chart/[base]/[target]/page'

function renderChart() {
  return render(
    <ThemeProvider>
      <ChartPage />
    </ThemeProvider>
  )
}

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  localStorage.clear()
})

describe('ChartPage theme toggle', () => {
  it('renders the theme toggle button in the header', () => {
    renderChart()
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })

  it('toggles dark class on html when button is clicked', async () => {
    renderChart()
    const btn = screen.getByRole('button', { name: /toggle theme/i })
    await userEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await userEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
