import { resolve } from 'node:path'
import { runInit } from '../scaffold/run-init.js'
import type { ScaffoldKind, WriteResult } from '../scaffold/write-scaffold.js'

const VALID_KINDS: ScaffoldKind[] = [
  'config',
  'overview',
  'tech-stack',
  'architecture',
  'user-stories',
  'roadmap',
]

export interface InitCliInput {
  root?: string
  force?: boolean
  only?: ScaffoldKind[]
}

export interface InitCliOutput {
  exitCode: number
  summary: string
}

export async function runInitCli(input: InitCliInput): Promise<InitCliOutput> {
  const projectRoot = resolve(input.root ?? process.cwd())

  if (input.only) {
    const bad = input.only.filter((k) => !VALID_KINDS.includes(k))
    if (bad.length > 0) {
      return {
        exitCode: 1,
        summary: `--only 含非法 kind：${bad.join(', ')}（合法：${VALID_KINDS.join(', ')}）`,
      }
    }
  }

  const report = await runInit({
    projectRoot,
    force: input.force,
    only: input.only,
  })

  return { exitCode: 0, summary: formatSummary(report.files) }
}

function formatSummary(files: WriteResult[]): string {
  const icon = (kind: ScaffoldKind, action: WriteResult['action']): string => {
    if (kind === 'user-stories' || kind === 'roadmap') return '⚠️ '
    if (kind === 'overview' || kind === 'architecture') {
      return action === 'created' ? '📝' : '✅'
    }
    return '✅'
  }
  const note = (kind: ScaffoldKind): string => {
    if (kind === 'user-stories' || kind === 'roadmap') {
      return '（placeholder — 跑 /specbook enhance 補完）'
    }
    if (kind === 'overview' || kind === 'architecture') {
      return '（建議用 LLM 草稿覆寫）'
    }
    return ''
  }
  const lines = files.map(
    (f) =>
      `${icon(f.kind, f.action)} ${f.kind} (${f.action})${note(f.kind) ? ' ' + note(f.kind) : ''}`,
  )
  lines.push('')
  lines.push('下一步：npx specbook dev')
  return lines.join('\n')
}
