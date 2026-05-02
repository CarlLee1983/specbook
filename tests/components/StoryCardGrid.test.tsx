import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StoryCardGrid } from '../../src/components/StoryCardGrid'

const stories = [
  { as: '開發者', want: '快速新增', soThat: '< 1 秒', priority: 'p0' as const },
  { as: '通勤者', want: '離線編輯', soThat: '回網自動同步', priority: 'p1' as const },
]

describe('<StoryCardGrid>', () => {
  it('renders one card per story', () => {
    const { container } = render(
      <StoryCardGrid
        stories={stories}
        chapterLabel=""
        heading="Stories"
        labels={{ as: '身為', soThat: '以便' }}
      />
    )
    expect(container.querySelectorAll('.story-card')).toHaveLength(2)
  })

  it('shows priority badge', () => {
    render(
      <StoryCardGrid
        stories={stories}
        chapterLabel=""
        heading="Stories"
        labels={{ as: '身為', soThat: '以便' }}
      />
    )
    expect(screen.getByText('P0')).toBeInTheDocument()
    expect(screen.getByText('P1')).toBeInTheDocument()
  })
})
