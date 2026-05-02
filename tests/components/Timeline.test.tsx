import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Timeline } from '../../src/components/Timeline'

const roadmap = [
  { title: 'M1', status: 'done' as const, quarter: '2026 Q1', items: ['A'] },
  { title: 'M2', status: 'active' as const, quarter: '2026 Q2', items: [] },
  { title: 'M3', status: 'future' as const, items: ['B', 'C'] },
]

describe('<Timeline>', () => {
  it('renders milestones with status class', () => {
    const { container } = render(
      <Timeline
        roadmap={roadmap}
        chapterLabel=""
        heading="Roadmap"
        statusLabels={{ done: '完成', active: '進行中', future: '規劃' }}
      />
    )
    expect(container.querySelectorAll('.milestone.done')).toHaveLength(1)
    expect(container.querySelectorAll('.milestone.active')).toHaveLength(1)
    expect(container.querySelectorAll('.milestone.future')).toHaveLength(1)
  })

  it('renders items', () => {
    render(
      <Timeline
        roadmap={roadmap}
        chapterLabel=""
        heading="Roadmap"
        statusLabels={{ done: '完成', active: '進行中', future: '規劃' }}
      />
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('shows status label text', () => {
    render(
      <Timeline
        roadmap={roadmap}
        chapterLabel=""
        heading="Roadmap"
        statusLabels={{ done: '完成', active: '進行中', future: '規劃' }}
      />
    )
    expect(screen.getByText('完成')).toBeInTheDocument()
    expect(screen.getByText('進行中')).toBeInTheDocument()
  })
})
