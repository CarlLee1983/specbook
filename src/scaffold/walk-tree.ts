import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const DEFAULT_IGNORES = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.turbo',
  '.specbook',
  '.superpowers',
  '.vercel',
  '.netlify',
  '.DS_Store',
])

export interface WalkOptions {
  maxDepth?: number
  ignore?: Iterable<string>
}

export function walkTree(root: string, opts: WalkOptions = {}): string[] {
  const maxDepth = opts.maxDepth ?? 3
  const ignore = new Set([...DEFAULT_IGNORES, ...(opts.ignore ?? [])])
  const out: string[] = []

  function visit(dir: string, depth: number): void {
    if (depth > maxDepth) return
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const name of entries) {
      if (ignore.has(name)) continue
      const full = join(dir, name)
      let stat
      try {
        stat = statSync(full)
      } catch {
        continue
      }
      const rel = relative(root, full).split(sep).join('/')
      if (stat.isDirectory()) {
        visit(full, depth + 1)
      } else if (stat.isFile()) {
        out.push(rel)
      }
    }
  }

  visit(root, 1)
  out.sort()
  return out
}
