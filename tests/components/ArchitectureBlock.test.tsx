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
})
