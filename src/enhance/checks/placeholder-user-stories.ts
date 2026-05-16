import type { UserStories } from '../../schema/user-stories.js'
import type { EnhanceItem } from '../types.js'

const PATTERNS: RegExp[] = [/主要使用者角色/, /次要使用者/, /第三類使用者/]

const PROMPT =
  'Ask the user for the primary, secondary, and tertiary actors and what each wants to accomplish. Rewrite .specbook/content/user-stories.yaml so no placeholder phrases remain.'

export function checkPlaceholderUserStories(stories: UserStories): EnhanceItem[] {
  const text = JSON.stringify(stories)
  const hit = PATTERNS.some((re) => re.test(text))
  if (!hit) return []
  return [
    {
      id: 'placeholder.user-stories',
      section: 'user-stories',
      severity: 'warn',
      scope: 'section',
      file: '.specbook/content/user-stories.yaml',
      problem: 'User stories file still contains template placeholders.',
      prompt: PROMPT,
    },
  ]
}
