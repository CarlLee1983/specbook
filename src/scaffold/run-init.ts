import { join } from 'node:path'
import { stringify as yamlStringify } from 'yaml'
import { detectProject } from './detect-project.js'
import { deriveTechStack } from './derive-tech-stack.js'
import {
  renderConfigTemplate,
  renderOverviewTemplate,
  renderArchitectureTemplate,
  renderUserStoriesTemplate,
  renderRoadmapTemplate,
} from './templates.js'
import {
  writeScaffold,
  type ScaffoldFile,
  type ScaffoldKind,
  type WriteResult,
} from './write-scaffold.js'
import type { TechStack } from '../schema/tech-stack.js'

const FALLBACK_TECH_STACK: TechStack = [
  {
    layer: 'Tooling',
    items: [
      { name: 'TBD', role: '請替換為實際技術棧；可用 /specbook enhance 互動補完' },
    ],
  },
]

export interface RunInitOptions {
  projectRoot: string
  force?: boolean
  only?: ScaffoldKind[]
}

export interface InitReport {
  projectName: string
  specbookRoot: string
  files: WriteResult[]
}

export async function runInit(opts: RunInitOptions): Promise<InitReport> {
  const project = detectProject(opts.projectRoot)
  const techStack = deriveTechStack(project.packageJson ?? {})
  const techStackOut = techStack.length > 0 ? techStack : FALLBACK_TECH_STACK
  const techStackYaml = yamlStringify(techStackOut)

  const files: ScaffoldFile[] = [
    {
      kind: 'config',
      path: 'specbook.config.ts',
      content: renderConfigTemplate({
        name: project.name,
        description: project.description ?? undefined,
      }),
    },
    {
      kind: 'overview',
      path: 'content/overview.md',
      content: renderOverviewTemplate({ name: project.name }),
    },
    { kind: 'tech-stack', path: 'content/tech-stack.yaml', content: techStackYaml },
    { kind: 'architecture', path: 'content/architecture.md', content: renderArchitectureTemplate() },
    { kind: 'user-stories', path: 'content/user-stories.yaml', content: renderUserStoriesTemplate() },
    { kind: 'roadmap', path: 'content/roadmap.yaml', content: renderRoadmapTemplate() },
  ]

  const specbookRoot = join(opts.projectRoot, '.specbook')
  const results = writeScaffold(specbookRoot, files, {
    force: opts.force,
    only: opts.only,
  })

  return {
    projectName: project.name,
    specbookRoot,
    files: results,
  }
}
