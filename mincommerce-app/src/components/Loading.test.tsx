import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Loading from './Loading'

describe('Loading Component', () => {
  it('renders loading spinner with default text', () => {
    render(<Loading />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom text', () => {
    render(<Loading text="Please wait..." />)

    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Loading className="custom-class" />)

    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('custom-class')
  })

  it('renders different sizes', () => {
    const { rerender } = render(<Loading size="sm" />)
    expect(screen.getByRole('status')).toHaveClass('animate-spin')

    rerender(<Loading size="lg" />)
    expect(screen.getByRole('status')).toHaveClass('animate-spin')
  })
})
