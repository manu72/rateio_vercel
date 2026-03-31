import { render, screen } from '@testing-library/react'
import ChartLoading from '@/app/chart/[base]/[target]/loading'

describe('ChartLoading skeleton', () => {
  it('renders a main landmark', () => {
    render(<ChartLoading />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders header, range selector placeholders, chart area, and rate card', () => {
    const { container } = render(<ChartLoading />)
    expect(container.querySelector('header')).toBeInTheDocument()
    // 5 range selector placeholders + chart + rate card skeleton elements
    const pulseElements = container.querySelectorAll('.motion-safe\\:animate-pulse')
    expect(pulseElements.length).toBeGreaterThanOrEqual(8)
  })
})
