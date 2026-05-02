import { describe, it, expect } from 'vitest'
import { RoadmapSchema } from '../../src/schema/roadmap'

describe('RoadmapSchema', () => {
  it('accepts milestones with done/active/future status', () => {
    const r = RoadmapSchema.parse([
      { title: 'M1', status: 'done', items: ['A'] },
      { title: 'M2', status: 'active', quarter: '2026 Q2', items: [] },
      { title: 'M3', status: 'future' },
    ])
    expect(r).toHaveLength(3)
  })

  it('rejects unknown status', () => {
    expect(() =>
      RoadmapSchema.parse([{ title: 'X', status: 'wip' }])
    ).toThrow()
  })

  it('rejects empty list', () => {
    expect(() => RoadmapSchema.parse([])).toThrow()
  })
})
