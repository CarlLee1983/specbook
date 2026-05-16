import type { UserStories } from '../../schema/user-stories.js'
import type { EnhanceItem } from '../types.js'

const PLACEHOLDERS: Record<'as' | 'want' | 'soThat', readonly string[]> = {
  as: ['主要使用者角色', '次要使用者', '第三類使用者'],
  want: ['想做什麼'],
  soThat: ['達成什麼', '達成什麼成果'],
}

const FIELDS: Array<'as' | 'want' | 'soThat'> = ['as', 'want', 'soThat']

function isPlaceholder(field: 'as' | 'want' | 'soThat', value: string): boolean {
  if (value === '') return true
  return PLACEHOLDERS[field].includes(value)
}

export function checkSchemaUserStories(stories: UserStories): EnhanceItem[] {
  const items: EnhanceItem[] = []
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i]
    if (!story) continue
    for (const field of FIELDS) {
      const value = story[field]
      if (typeof value !== 'string') continue
      if (!isPlaceholder(field, value)) continue
      const path = `stories[${i}].${field}`
      items.push({
        id: 'schema.user-stories.story-incomplete',
        section: 'user-stories',
        severity: 'warn',
        scope: 'item',
        file: '.specbook/content/user-stories.yaml',
        path,
        problem: `User story at stories[${i}] is missing a concrete '${field}' value.`,
        prompt: `Ask the user for a concrete \`${field}\` value for stories[${i}] (the actor / motivation / outcome). Update ${path}.`,
      })
    }
  }
  return items
}
