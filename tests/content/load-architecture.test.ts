import { describe, it, expect } from 'vitest'
import { loadArchitecture } from '../../src/content/load-architecture'
import { resolve } from 'node:path'

const FIXTURE = resolve(__dirname, '../fixtures/taskflow/content/architecture.md')

describe('loadArchitecture', () => {
  it('parses frontmatter diagram + body', async () => {
    const r = await loadArchitecture(FIXTURE)
    expect(r.diagram).toBe('mermaid')
    expect(r.body).toContain('graph TD')
  })
})
