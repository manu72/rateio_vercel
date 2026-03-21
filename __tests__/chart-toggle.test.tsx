import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/ThemeProvider'

// mockUseParams is accessible inside jest.mock factory because it starts with 'mock'
const mockUseParams = jest.fn(() => ({ base: 'aud', target: 'eur' }))

// Mock next/navigation — required for useParams and useRouter
jest.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
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
  mockUseParams.mockReturnValue({ base: 'aud', target: 'eur' })
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

  it('does not render toggle button in the invalid-pair error path', () => {
    mockUseParams.mockReturnValue({ base: 'ZZZ', target: 'XXX' })
    renderChart()
    expect(screen.queryByRole('button', { name: /toggle theme/i })).toBeNull()
  })
})
