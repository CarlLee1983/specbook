import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { loadTechStack } from '../../src/content/load-tech-stack'
import { loadUserStories } from '../../src/content/load-user-stories'
import { loadRoadmap } from '../../src/content/load-roadmap'

const F = (name: string) =>
  resolve(__dirname, `../fixtures/taskflow/content/${name}`)

describe('YAML loaders', () => {
  it('loads tech-stack.yaml', async () => {
    const r = await loadTechStack(F('tech-stack.yaml'))
    expect(r[0].layer).toBe('Frontend')
    expect(r[0].items).toHaveLength(2)
  })

  it('loads user-stories.yaml', async () => {
    const r = await loadUserStories(F('user-stories.yaml'))
    expect(r).toHaveLength(2)
    expect(r[0].priority).toBe('p0')
  })

  it('loads roadmap.yaml', async () => {
    const r = await loadRoadmap(F('roadmap.yaml'))
    expect(r[0].status).toBe('done')
    expect(r[1].items).toContain('Supabase 多裝置同步')
  })

  it('reports zod error path on invalid yaml', async () => {
    await expect(
      loadTechStack(F('user-stories.yaml'))
    ).rejects.toThrow()
  })
})
