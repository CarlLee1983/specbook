import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { detectEnhanceItems } from '../../src/enhance/detect.js'

const ALL = resolve(__dirname, '../fixtures/enhance-all-placeholders/.specbook')
const ITEM = resolve(__dirname, '../fixtures/enhance-item-level/.specbook')
const CLEAN = resolve(__dirname, '../../examples/taskflow')

describe('detectEnhanceItems', () => {
  it('all-placeholders fixture → 4 section-level items in canonical order (before item-level)', async () => {
    const r = await detectEnhanceItems(ALL)
    expect(r.ok).toBe(false)
    const sectionIds = r.items
      .filter((i) => i.scope === 'section')
      .map((i) => i.id)
    expect(sectionIds).toEqual([
      'placeholder.overview',
      'placeholder.architecture',
      'placeholder.user-stories',
      'placeholder.roadmap',
    ])
    expect(r.meta.schemaVersion).toBe(1)
    expect(r.meta.specbookRoot).toBe(ALL)
    expect(typeof r.meta.durationMs).toBe('number')
  })

  it('item-level fixture → 0 section + 2 item-level items', async () => {
    const r = await detectEnhanceItems(ITEM)
    expect(r.ok).toBe(false)
    const ids = r.items.map((i) => i.id)
    expect(ids).toEqual([
      'schema.user-stories.story-incomplete',
      'schema.roadmap.milestone-empty',
    ])
    expect(r.items[0].path).toBe('stories[0].soThat')
    expect(r.items[1].path).toBe('milestones[1]')
  })

  it('clean fixture → ok: true, no items', async () => {
    const r = await detectEnhanceItems(CLEAN)
    expect(r.ok).toBe(true)
    expect(r.items).toEqual([])
  })

  it('section-level placeholder does NOT short-circuit item-level checks', async () => {
    const r = await detectEnhanceItems(ALL)
    const itemLevel = r.items.filter((i) => i.scope === 'item')
    expect(itemLevel.length).toBeGreaterThanOrEqual(10)
  })

  it('ordering: within a section, scope=section items come before scope=item items', async () => {
    const r = await detectEnhanceItems(ALL)
    const userStoryItems = r.items.filter((i) => i.section === 'user-stories')
    expect(userStoryItems[0].scope).toBe('section')
    for (let i = 1; i < userStoryItems.length; i++) {
      expect(userStoryItems[i].scope).toBe('item')
    }
  })
})
