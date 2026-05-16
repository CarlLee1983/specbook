import { describe, it, expect } from 'vitest'
import { checkPlaceholderUserStories } from '../../../src/enhance/checks/placeholder-user-stories.js'
import type { UserStories } from '../../../src/schema/user-stories.js'

const PROMPT =
  'Ask the user for the primary, secondary, and tertiary actors and what each wants to accomplish. Rewrite .specbook/content/user-stories.yaml so no placeholder phrases remain.'

describe('checkPlaceholderUserStories', () => {
  it('hits when 主要使用者角色 appears anywhere', () => {
    const stories: UserStories = [
      { as: '主要使用者角色', want: 'x', soThat: 'y', priority: 'p1' },
    ]
    expect(checkPlaceholderUserStories(stories)).toEqual([
      {
        id: 'placeholder.user-stories',
        section: 'user-stories',
        severity: 'warn',
        scope: 'section',
        file: '.specbook/content/user-stories.yaml',
        problem: 'User stories file still contains template placeholders.',
        prompt: PROMPT,
      },
    ])
  })

  it('hits when 次要使用者 appears', () => {
    const stories: UserStories = [
      { as: '次要使用者', want: 'x', soThat: 'y', priority: 'p1' },
    ]
    expect(checkPlaceholderUserStories(stories)).toHaveLength(1)
  })

  it('hits when 第三類使用者 appears', () => {
    const stories: UserStories = [
      { as: '第三類使用者', want: 'x', soThat: 'y', priority: 'p1' },
    ]
    expect(checkPlaceholderUserStories(stories)).toHaveLength(1)
  })

  it('returns [] when all stories are real', () => {
    const stories: UserStories = [
      { as: '工程師', want: '寫程式', soThat: '解決問題', priority: 'p1' },
    ]
    expect(checkPlaceholderUserStories(stories)).toEqual([])
  })
})
