import { resolve } from 'node:path'

export interface ContentPaths {
  root: string
  config: string
  contentDir: string
  assetsDir: string
  files: {
    overview: string
    techStack: string
    architecture: string
    userStories: string
    roadmap: string
  }
}

export function resolvePaths(specbookRoot: string): ContentPaths {
  const root = resolve(specbookRoot)
  const contentDir = resolve(root, 'content')
  return {
    root,
    config: resolve(root, 'specbook.config.ts'),
    contentDir,
    assetsDir: resolve(root, 'assets'),
    files: {
      overview: resolve(contentDir, 'overview.md'),
      techStack: resolve(contentDir, 'tech-stack.yaml'),
      architecture: resolve(contentDir, 'architecture.md'),
      userStories: resolve(contentDir, 'user-stories.yaml'),
      roadmap: resolve(contentDir, 'roadmap.yaml'),
    },
  }
}

export function resolveAsset(specbookRoot: string, assetPath: string): string {
  if (assetPath.startsWith('/')) return assetPath
  return resolve(specbookRoot, assetPath)
}
