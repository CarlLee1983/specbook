import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type ScaffoldKind =
  | 'config'
  | 'overview'
  | 'tech-stack'
  | 'architecture'
  | 'user-stories'
  | 'roadmap'

export interface ScaffoldFile {
  kind: ScaffoldKind
  path: string
  content: string
}

export interface WriteOptions {
  force?: boolean
  only?: ScaffoldKind[]
}

export interface WriteResult {
  kind: ScaffoldKind
  path: string
  action: 'created' | 'overwritten' | 'kept'
}

export function writeScaffold(
  root: string,
  files: ScaffoldFile[],
  opts: WriteOptions = {},
): WriteResult[] {
  const onlySet = opts.only ? new Set(opts.only) : null
  const out: WriteResult[] = []
  for (const f of files) {
    if (onlySet && !onlySet.has(f.kind)) continue
    const full = join(root, f.path)
    const exists = existsSync(full) && safeSize(full) > 0
    let action: WriteResult['action']
    if (!exists) {
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, f.content, 'utf-8')
      action = 'created'
    } else if (opts.force) {
      writeFileSync(full, f.content, 'utf-8')
      action = 'overwritten'
    } else {
      action = 'kept'
    }
    out.push({ kind: f.kind, path: f.path, action })
  }
  return out
}

function safeSize(p: string): number {
  try {
    return statSync(p).size
  } catch {
    return 0
  }
}
