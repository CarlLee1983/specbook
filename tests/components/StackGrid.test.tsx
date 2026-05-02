import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StackGrid } from '../../src/components/StackGrid'

describe('<StackGrid>', () => {
  const data = [
    {
      layer: 'Frontend',
      items: [
        { name: 'React', version: '19.0', role: 'UI 框架' },
        { name: 'Tailwind', role: '原子化樣式' },
      ],
    },
    { layer: 'Backend', items: [{ name: 'Supabase', role: 'DB' }] },
  ]

  it('groups items by layer', () => {
    render(<StackGrid data={data} chapterLabel="" heading="Stack" />)
    expect(screen.getByText('Frontend')).toBeInTheDocument()
    expect(screen.getByText('Backend')).toBeInTheDocument()
  })

  it('renders item name + version + role', () => {
    render(<StackGrid data={data} chapterLabel="" heading="Stack" />)
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('19.0')).toBeInTheDocument()
    expect(screen.getByText('UI 框架')).toBeInTheDocument()
  })

  it('omits version when not provided', () => {
    render(<StackGrid data={data} chapterLabel="" heading="Stack" />)
    const tailwind = screen.getByText('Tailwind').closest('.tech-card')
    expect(tailwind?.querySelector('.version')).toBeNull()
  })
})
