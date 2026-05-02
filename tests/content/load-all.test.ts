import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { loadAll } from '../../src/content/load-all'

const ROOT = resolve(__dirname, '../fixtures/taskflow')

describe('loadAll', () => {
  it('loads full TaskFlow fixture', async () => {
    const data = await loadAll(ROOT)
    expect(data.config.project.name).toBe('TaskFlow')
    expect(data.overview.title).toBe('TaskFlow')
    expect(data.techStack[0].layer).toBe('Frontend')
    expect(data.architecture.diagram).toBe('mermaid')
    expect(data.userStories).toHaveLength(2)
    expect(data.roadmap[0].status).toBe('done')
  })
})
