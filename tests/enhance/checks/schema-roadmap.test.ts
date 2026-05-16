import { describe, it, expect } from 'vitest'
import { checkSchemaRoadmap } from '../../../src/enhance/checks/schema-roadmap.js'
import type { Roadmap } from '../../../src/schema/roadmap.js'

describe('checkSchemaRoadmap', () => {
  it('emits milestone-title-placeholder when title matches M\\d — 起手', () => {
    const roadmap: Roadmap = [
      { title: 'M2 — 起手', status: 'active', items: ['real'] },
    ]
    const items = checkSchemaRoadmap(roadmap)
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      id: 'schema.roadmap.milestone-title-placeholder',
      section: 'roadmap',
      severity: 'warn',
      scope: 'item',
      file: '.specbook/content/roadmap.yaml',
      path: 'milestones[0].title',
      problem: "Milestone at milestones[0] still has a placeholder title.",
      prompt:
        'Ask the user for a concrete milestone title for milestones[0] (a short, specific theme — not "M… — 起手"). Update milestones[0].title.',
    })
  })

  it('emits milestone-empty when items is empty array', () => {
    const roadmap: Roadmap = [
      { title: 'Real Title', status: 'active', items: [] },
    ]
    const items = checkSchemaRoadmap(roadmap)
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      id: 'schema.roadmap.milestone-empty',
      section: 'roadmap',
      severity: 'warn',
      scope: 'item',
      file: '.specbook/content/roadmap.yaml',
      path: 'milestones[0]',
      problem: "Milestone 'Real Title' has an empty items list.",
      prompt:
        "Ask the user for 2–5 concrete deliverables for milestone 'Real Title'. Update milestones[0].items.",
    })
  })

  it('emits both rules for a milestone that triggers both', () => {
    const roadmap: Roadmap = [
      { title: 'M3 — 起手', status: 'future', items: [] },
    ]
    const items = checkSchemaRoadmap(roadmap)
    expect(items.map((i) => i.id)).toEqual([
      'schema.roadmap.milestone-title-placeholder',
      'schema.roadmap.milestone-empty',
    ])
  })

  it('returns [] for a real roadmap with non-empty items', () => {
    const roadmap: Roadmap = [
      { title: 'M1 — Local MVP', status: 'done', items: ['a'] },
    ]
    expect(checkSchemaRoadmap(roadmap)).toEqual([])
  })
})
