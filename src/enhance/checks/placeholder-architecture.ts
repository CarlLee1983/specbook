import type { Architecture } from '../../schema/architecture.js'
import type { EnhanceItem } from '../types.js'

const PATTERNS: RegExp[] = [/在這裡描述系統的整體架構/]

const PROMPT =
  "Ask the user for the system's high-level architecture: main components, how they communicate, and key external dependencies. Rewrite .specbook/content/architecture.md so no placeholder phrases remain."

export function checkPlaceholderArchitecture(doc: Architecture): EnhanceItem[] {
  const hit = PATTERNS.some((re) => re.test(doc.body))
  if (!hit) return []
  return [
    {
      id: 'placeholder.architecture',
      section: 'architecture',
      severity: 'warn',
      scope: 'section',
      file: '.specbook/content/architecture.md',
      problem: 'Architecture file still contains template placeholders.',
      prompt: PROMPT,
    },
  ]
}
