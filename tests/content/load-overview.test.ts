import { describe, it, expect } from 'vitest'
import { loadOverview } from '../../src/content/load-overview'
import { resolve } from 'node:path'

const FIXTURE = resolve(__dirname, '../fixtures/taskflow/content/overview.md')

describe('loadOverview', () => {
  it('extracts tagline + first H1 + body', async () => {
    const r = await loadOverview(FIXTURE)
    expect(r.tagline).toBe('同步至雲端的極簡待辦工具')
    expect(r.title).toBe('TaskFlow')
    expect(r.body).toContain('多數待辦工具')
  })

  it('throws when file missing', async () => {
    await expect(loadOverview('/no/such/file.md')).rejects.toThrow()
  })
})
