import { describe, it, expect } from 'vitest'
import { checkSchemaUserStories } from '../../../src/enhance/checks/schema-user-stories.js'
import type { UserStories } from '../../../src/schema/user-stories.js'

describe('checkSchemaUserStories', () => {
  it('emits one item per offending field; multiple offenders in same story → multiple items', () => {
    const stories: UserStories = [
      { as: 'Engineer', want: '想做什麼', soThat: '達成什麼', priority: 'p1' },
    ]
    const items = checkSchemaUserStories(stories)
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.path)).toEqual(['stories[0].want', 'stories[0].soThat'])
    for (const it of items) {
      expect(it.id).toBe('schema.user-stories.story-incomplete')
      expect(it.section).toBe('user-stories')
      expect(it.severity).toBe('warn')
      expect(it.scope).toBe('item')
      expect(it.file).toBe('.specbook/content/user-stories.yaml')
    }
    expect(items[0].problem).toBe(
      "User story at stories[0] is missing a concrete 'want' value.",
    )
    expect(items[0].prompt).toBe(
      'Ask the user for a concrete `want` value for stories[0] (the actor / motivation / outcome). Update stories[0].want.',
    )
  })

  it('handles empty-string fields', () => {
    const stories: UserStories = [
      { as: '', want: 'x', soThat: 'y', priority: 'p1' },
    ]
    const items = checkSchemaUserStories(stories)
    expect(items).toHaveLength(1)
    expect(items[0].path).toBe('stories[0].as')
  })

  it('multiple stories, only offending ones emit items', () => {
    const stories: UserStories = [
      { as: 'Engineer', want: 'real want', soThat: 'real value', priority: 'p1' },
      { as: '次要使用者', want: 'real', soThat: 'real', priority: 'p1' },
      { as: '工程師', want: 'real', soThat: '達成什麼成果', priority: 'p2' },
    ]
    const items = checkSchemaUserStories(stories)
    expect(items.map((i) => i.path)).toEqual(['stories[1].as', 'stories[2].soThat'])
  })

  it('returns [] for fully real stories', () => {
    const stories: UserStories = [
      { as: 'Engineer', want: 'real', soThat: 'real', priority: 'p1' },
    ]
    expect(checkSchemaUserStories(stories)).toEqual([])
  })
})
