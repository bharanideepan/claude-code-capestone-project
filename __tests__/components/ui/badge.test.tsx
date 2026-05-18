// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>SUCCESS</Badge>)
    expect(screen.getByText('SUCCESS')).toBeInTheDocument()
  })

  it('applies success variant', () => {
    render(<Badge variant="success">SUCCESS</Badge>)
    expect(screen.getByText('SUCCESS')).toHaveClass('bg-green-100')
  })

  it('applies failed variant', () => {
    render(<Badge variant="failed">FAILED</Badge>)
    expect(screen.getByText('FAILED')).toHaveClass('bg-red-100')
  })

  it('applies pending variant', () => {
    render(<Badge variant="pending">PENDING</Badge>)
    expect(screen.getByText('PENDING')).toHaveClass('bg-yellow-100')
  })
})
