import { describe, it, expect } from 'vitest'
import { OverviewSchema } from '../../src/schema/overview'

describe('OverviewSchema', () => {
  it('accepts valid frontmatter + body', () => {
    const result = OverviewSchema.parse({
      tagline: '極簡待辦工具',
      title: 'TaskFlow',
      body: '多數待辦工具都在加功能...',
    })
    expect(result.title).toBe('TaskFlow')
    expect(result.tagline).toBe('極簡待辦工具')
  })

  it('rejects when tagline missing', () => {
    expect(() =>
      OverviewSchema.parse({ title: 'X', body: 'y' })
    ).toThrow()
  })

  it('rejects empty body', () => {
    expect(() =>
      OverviewSchema.parse({ tagline: 't', title: 'X', body: '' })
    ).toThrow()
  })
})
