import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpecBookPage } from '../../src/components/SpecBookPage'
import { resolve } from 'node:path'
import { loadAll } from '../../src/content/load-all'

describe('<SpecBookPage>', () => {
  it('renders all 5 sections from TaskFlow fixture', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const { container } = render(<SpecBookPage data={data} />)
    expect(container.querySelector('section#overview')).not.toBeNull()
    expect(container.querySelector('section#tech-stack')).not.toBeNull()
    expect(container.querySelector('section#architecture')).not.toBeNull()
    expect(container.querySelector('section#user-stories')).not.toBeNull()
    expect(container.querySelector('section#roadmap')).not.toBeNull()
  })

  it('respects sections.hide (skips hidden section)', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const hidden = {
      ...data,
      config: {
        ...data.config,
        sections: { ...data.config.sections, hide: ['user-stories' as const] },
      },
    }
    const { container } = render(<SpecBookPage data={hidden} />)
    expect(container.querySelector('section#user-stories')).toBeNull()
  })

  it('TOC labels reflect locale', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    render(<SpecBookPage data={data} />)
    expect(screen.getByText('目錄')).toBeInTheDocument()
  })
})
