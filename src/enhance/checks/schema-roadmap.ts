import type { Roadmap } from '../../schema/roadmap.js'
import type { EnhanceItem } from '../types.js'

const TITLE_PLACEHOLDER = /^M\d+\s*—\s*起手$/

export function checkSchemaRoadmap(roadmap: Roadmap): EnhanceItem[] {
  const items: EnhanceItem[] = []
  for (let i = 0; i < roadmap.length; i++) {
    const m = roadmap[i]
    if (!m) continue
    if (TITLE_PLACEHOLDER.test(m.title)) {
      const path = `milestones[${i}].title`
      items.push({
        id: 'schema.roadmap.milestone-title-placeholder',
        section: 'roadmap',
        severity: 'warn',
        scope: 'item',
        file: '.specbook/content/roadmap.yaml',
        path,
        problem: `Milestone at milestones[${i}] still has a placeholder title.`,
        prompt: `Ask the user for a concrete milestone title for milestones[${i}] (a short, specific theme — not "M… — 起手"). Update ${path}.`,
      })
    }
    if (Array.isArray(m.items) && m.items.length === 0) {
      const path = `milestones[${i}]`
      items.push({
        id: 'schema.roadmap.milestone-empty',
        section: 'roadmap',
        severity: 'warn',
        scope: 'item',
        file: '.specbook/content/roadmap.yaml',
        path,
        problem: `Milestone '${m.title}' has an empty items list.`,
        prompt: `Ask the user for 2–5 concrete deliverables for milestone '${m.title}'. Update ${path}.items.`,
      })
    }
  }
  return items
}
