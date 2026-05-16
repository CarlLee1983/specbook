import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DoctorFinding, ExecutionContext } from '../types.js'

export interface MermaidDeps {
  tryImportPlaywright: () => Promise<boolean>
}

async function defaultTryImportPlaywright(): Promise<boolean> {
  try {
    await import('playwright')
    return true
  } catch {
    return false
  }
}

async function hasMermaidBlock(contentDir: string): Promise<boolean> {
  let entries: string[]
  try {
    entries = await readdir(contentDir)
  } catch {
    return false
  }
  for (const name of entries) {
    if (!name.endsWith('.md')) continue
    const text = await readFile(join(contentDir, name), 'utf8').catch(() => '')
    if (/```mermaid\b/.test(text)) return true
  }
  return false
}

export async function checkMermaidPlaywright(
  ctx: Pick<ExecutionContext, 'specbookRoot'>,
  deps: MermaidDeps = { tryImportPlaywright: defaultTryImportPlaywright },
): Promise<DoctorFinding[]> {
  const contentDir = join(ctx.specbookRoot, 'content')
  const mermaidPresent = await hasMermaidBlock(contentDir)
  if (!mermaidPresent) return []
  const playwrightInstalled = await deps.tryImportPlaywright()
  if (playwrightInstalled) return []
  return [
    {
      id: 'mermaid-playwright',
      severity: 'warn',
      category: 'optional-deps',
      title: 'Mermaid blocks detected but `playwright` is not installed',
      hint: 'Run `pnpm add -D playwright` to enable Mermaid rendering at build time.',
    },
  ]
}
