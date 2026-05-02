import { readFileSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { walkTree } from './walk-tree.js'

export interface DetectedProject {
  name: string
  description: string | null
  packageJson: PackageJson | null
  readme: string | null
  fileTree: string[]
  frameworks: string[]
}

export interface PackageJson {
  name?: string
  description?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const FRAMEWORK_KEYS = [
  'react',
  'next',
  'vue',
  'nuxt',
  'svelte',
  '@sveltejs/kit',
  'hono',
  'express',
  'fastify',
  '@nestjs/core',
  'astro',
]

const README_NAMES = ['README.md', 'readme.md', 'Readme.md', 'README.MD']
const MAX_README = 4096

export function detectProject(root: string): DetectedProject {
  const pkg = readJson(join(root, 'package.json'))
  const readme = readReadme(root)
  const fileTree = walkTree(root)
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) }
  const frameworks = FRAMEWORK_KEYS.filter((k) => k in deps)

  return {
    name: pkg?.name ?? basename(root),
    description: pkg?.description ?? null,
    packageJson: pkg,
    readme,
    fileTree,
    frameworks,
  }
}

function readJson(path: string): PackageJson | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as PackageJson
  } catch {
    return null
  }
}

function readReadme(root: string): string | null {
  for (const n of README_NAMES) {
    const p = join(root, n)
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf-8')
      return content.length > MAX_README ? content.slice(0, MAX_README) : content
    }
  }
  return null
}
