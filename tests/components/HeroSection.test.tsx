import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroSection } from '../../src/components/HeroSection'

describe('<HeroSection>', () => {
  const overview = {
    tagline: '極簡待辦',
    title: 'TaskFlow',
    body: '多數待辦工具都在加功能...',
  }

  it('renders title, tagline, problem body', () => {
    render(<HeroSection overview={overview} chapterLabel="Chapter 01 / Overview" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('TaskFlow')
    expect(screen.getByText('極簡待辦')).toBeInTheDocument()
    expect(screen.getByText(/多數待辦工具/)).toBeInTheDocument()
  })

  it('uses id="overview" for anchor', () => {
    const { container } = render(
      <HeroSection overview={overview} chapterLabel="" />
    )
    expect(container.querySelector('section#overview')).not.toBeNull()
  })
})
