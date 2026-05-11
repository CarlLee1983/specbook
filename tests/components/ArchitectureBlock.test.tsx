import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArchitectureBlock } from '../../src/components/ArchitectureBlock'

describe('<ArchitectureBlock>', () => {
  it('renders prose body when diagram=none', () => {
    render(
      <ArchitectureBlock
        chapterLabel=""
        heading="Architecture"
        architecture={{ diagram: 'none', body: '三層：A → B → C。' }}
      />
    )
    expect(screen.getByText(/三層/)).toBeInTheDocument()
  })

  it('shows image when diagram=image', () => {
    const { container } = render(
      <ArchitectureBlock
        chapterLabel=""
        heading="Architecture"
        architecture={{
          diagram: 'image',
          image: './assets/arch.png',
          body: '見上圖',
        }}
      />
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('alt')).toBe('Architecture diagram')
  })

  it('injects raw HTML when diagram=mermaid (already pre-rendered)', () => {
    const body = '<svg id="m1"><g></g></svg>'
    const { container } = render(
      <ArchitectureBlock
        chapterLabel=""
        heading="Architecture"
        architecture={{ diagram: 'mermaid', body }}
      />
    )
    expect(container.querySelector('#m1')).not.toBeNull()
  })

  it('renders structured flow cards when flows are provided', () => {
    const { container } = render(
      <ArchitectureBlock
        chapterLabel=""
        heading="Architecture"
        architecture={{
          diagram: 'none',
          body: '三層架構說明',
          flows: [
            {
              name: '任務同步',
              description: '本機與雲端的兩段式同步',
              steps: [
                { actor: '使用者', action: '開啟 App' },
                {
                  actor: 'Sync Service',
                  action: '比對 timestamp',
                  outcome: '取得 diff',
                },
              ],
            },
          ],
        }}
      />
    )

    expect(container.querySelector('.flow')).not.toBeNull()
    expect(screen.getByText('任務同步')).toBeInTheDocument()
    expect(screen.getByText('本機與雲端的兩段式同步')).toBeInTheDocument()
    expect(screen.getByText('使用者')).toBeInTheDocument()
    expect(screen.getByText('Sync Service')).toBeInTheDocument()
    expect(screen.getByText('比對 timestamp')).toBeInTheDocument()
    expect(screen.getByText('取得 diff')).toBeInTheDocument()
  })

  it('suppresses mermaid diagram when flows are provided', () => {
    const { container } = render(
      <ArchitectureBlock
        chapterLabel=""
        heading="Architecture"
        architecture={{
          diagram: 'mermaid',
          body: '<svg id="m-suppressed"></svg>',
          flows: [
            {
              name: 'F',
              steps: [{ actor: 'A', action: 'do' }],
            },
          ],
        }}
      />
    )

    expect(container.querySelector('.mermaid-host')).toBeNull()
    expect(container.querySelector('#m-suppressed')).toBeNull()
    expect(container.querySelector('.flow')).not.toBeNull()
  })
})
