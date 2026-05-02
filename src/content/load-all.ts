import { loadOverview } from './load-overview.js'
import { loadTechStack } from './load-tech-stack.js'
import { loadArchitecture } from './load-architecture.js'
import { loadUserStories } from './load-user-stories.js'
import { loadRoadmap } from './load-roadmap.js'
import { loadConfig } from './load-config.js'
import { resolvePaths, type ContentPaths } from './paths.js'
import type { Overview } from '../schema/overview.js'
import type { TechStack } from '../schema/tech-stack.js'
import type { Architecture } from '../schema/architecture.js'
import type { UserStories } from '../schema/user-stories.js'
import type { Roadmap } from '../schema/roadmap.js'
import type { SpecBookConfig } from '../schema/config.js'

export interface SpecBookData {
  config: SpecBookConfig
  overview: Overview
  techStack: TechStack
  architecture: Architecture
  userStories: UserStories
  roadmap: Roadmap
  paths: ContentPaths
}

export async function loadAll(specbookRoot: string): Promise<SpecBookData> {
  const paths = resolvePaths(specbookRoot)
  const [config, overview, techStack, architecture, userStories, roadmap] =
    await Promise.all([
      loadConfig(paths.config),
      loadOverview(paths.files.overview),
      loadTechStack(paths.files.techStack),
      loadArchitecture(paths.files.architecture),
      loadUserStories(paths.files.userStories),
      loadRoadmap(paths.files.roadmap),
    ])
  return { config, overview, techStack, architecture, userStories, roadmap, paths }
}
