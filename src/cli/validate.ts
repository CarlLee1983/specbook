import { resolvePaths } from '../content/paths.js'
import { loadConfig } from '../content/load-config.js'
import { loadOverview } from '../content/load-overview.js'
import { loadTechStack } from '../content/load-tech-stack.js'
import { loadArchitecture } from '../content/load-architecture.js'
import { loadUserStories } from '../content/load-user-stories.js'
import { loadRoadmap } from '../content/load-roadmap.js'

export interface ValidateResult {
  ok: boolean
  errors: string[]
}

export async function runValidate(specbookRoot: string): Promise<ValidateResult> {
  const paths = resolvePaths(specbookRoot)
  const errors: string[] = []
  const tasks: [string, () => Promise<unknown>][] = [
    ['config', () => loadConfig(paths.config)],
    ['overview', () => loadOverview(paths.files.overview)],
    ['tech-stack', () => loadTechStack(paths.files.techStack)],
    ['architecture', () => loadArchitecture(paths.files.architecture)],
    ['user-stories', () => loadUserStories(paths.files.userStories)],
    ['roadmap', () => loadRoadmap(paths.files.roadmap)],
  ]
  for (const [name, fn] of tasks) {
    try {
      await fn()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`[${name}] ${msg}`)
    }
  }
  return { ok: errors.length === 0, errors }
}
