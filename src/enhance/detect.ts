import { resolvePaths } from '../content/paths.js'
import { loadOverview } from '../content/load-overview.js'
import { loadArchitecture } from '../content/load-architecture.js'
import { loadUserStories } from '../content/load-user-stories.js'
import { loadRoadmap } from '../content/load-roadmap.js'
import { checkPlaceholderOverview } from './checks/placeholder-overview.js'
import { checkPlaceholderArchitecture } from './checks/placeholder-architecture.js'
import { checkPlaceholderUserStories } from './checks/placeholder-user-stories.js'
import { checkPlaceholderRoadmap } from './checks/placeholder-roadmap.js'
import { checkSchemaUserStories } from './checks/schema-user-stories.js'
import { checkSchemaRoadmap } from './checks/schema-roadmap.js'
import type { EnhanceItem, EnhanceReport, Section } from './types.js'

const SECTION_ORDER: Section[] = ['overview', 'architecture', 'user-stories', 'roadmap']

function sortItems(items: EnhanceItem[]): EnhanceItem[] {
  const sectionIndex = (s: Section) => SECTION_ORDER.indexOf(s)
  const scopeRank = (s: 'section' | 'item') => (s === 'section' ? 0 : 1)
  return [...items].sort((a, b) => {
    const ds = sectionIndex(a.section) - sectionIndex(b.section)
    if (ds !== 0) return ds
    return scopeRank(a.scope) - scopeRank(b.scope)
  })
}

export async function detectEnhanceItems(specbookRoot: string): Promise<EnhanceReport> {
  const started = Date.now()
  const paths = resolvePaths(specbookRoot)
  const [overview, architecture, stories, roadmap] = await Promise.all([
    loadOverview(paths.files.overview),
    loadArchitecture(paths.files.architecture),
    loadUserStories(paths.files.userStories),
    loadRoadmap(paths.files.roadmap),
  ])
  const items: EnhanceItem[] = [
    ...checkPlaceholderOverview(overview),
    ...checkPlaceholderArchitecture(architecture),
    ...checkPlaceholderUserStories(stories),
    ...checkPlaceholderRoadmap(roadmap),
    ...checkSchemaUserStories(stories),
    ...checkSchemaRoadmap(roadmap),
  ]
  const sorted = sortItems(items)
  return {
    ok: sorted.length === 0,
    items: sorted,
    meta: {
      specbookRoot: paths.root,
      durationMs: Date.now() - started,
      schemaVersion: 1,
    },
  }
}
