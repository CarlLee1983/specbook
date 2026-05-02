import { describe, it, expect } from 'vitest'
import { UserStoriesSchema } from '../../src/schema/user-stories'

describe('UserStoriesSchema', () => {
  it('accepts valid stories with default priority p1', () => {
    const r = UserStoriesSchema.parse([
      { as: '開發者', want: '快速新增', soThat: '< 1 秒' },
    ])
    expect(r[0].priority).toBe('p1')
  })

  it('accepts explicit priorities', () => {
    const r = UserStoriesSchema.parse([
      { as: 'A', want: 'B', soThat: 'C', priority: 'p0' },
    ])
    expect(r[0].priority).toBe('p0')
  })

  it('rejects unknown priority', () => {
    expect(() =>
      UserStoriesSchema.parse([
        { as: 'A', want: 'B', soThat: 'C', priority: 'p9' },
      ])
    ).toThrow()
  })

  it('rejects empty list', () => {
    expect(() => UserStoriesSchema.parse([])).toThrow()
  })
})
