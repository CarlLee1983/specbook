import type { Roadmap } from '../../schema/roadmap.js'
import type { EnhanceItem } from '../types.js'

const PATTERNS: RegExp[] = [/M1\s*—\s*起手/, /第一個工作項/]

const PROMPT =
  'Ask the user for 2–4 concrete milestones (title + deliverables + status). Rewrite .specbook/content/roadmap.yaml so no placeholder phrases remain.'

export function checkPlaceholderRoadmap(roadmap: Roadmap): EnhanceItem[] {
  const text = JSON.stringify(roadmap)
  const hit = PATTERNS.some((re) => re.test(text))
  if (!hit) return []
  return [
    {
      id: 'placeholder.roadmap',
      section: 'roadmap',
      severity: 'warn',
      scope: 'section',
      file: '.specbook/content/roadmap.yaml',
      problem: 'Roadmap file still contains template placeholders.',
      prompt: PROMPT,
    },
  ]
}
