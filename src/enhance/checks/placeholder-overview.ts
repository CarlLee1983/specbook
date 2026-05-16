import type { Overview } from '../../schema/overview.js'
import type { EnhanceItem } from '../types.js'

const PATTERNS: RegExp[] = [
  /在這裡寫一段 1-3 段的散文/,
  /這段文字會以 hero 區呈現在 SpecBook 站首屏/,
]

const PROMPT =
  "Ask the user for a 1–3 paragraph project overview that explains what this project is, who it serves, and why it exists. Rewrite .specbook/content/overview.md so no placeholder phrases remain."

export function checkPlaceholderOverview(doc: Overview): EnhanceItem[] {
  const hit = PATTERNS.some((re) => re.test(doc.body))
  if (!hit) return []
  return [
    {
      id: 'placeholder.overview',
      section: 'overview',
      severity: 'warn',
      scope: 'section',
      file: '.specbook/content/overview.md',
      problem: 'Overview file still contains template placeholders.',
      prompt: PROMPT,
    },
  ]
}
