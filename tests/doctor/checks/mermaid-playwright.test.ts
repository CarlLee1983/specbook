import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkMermaidPlaywright } from '../../../src/doctor/checks/mermaid-playwright.js'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'doctor-mermaid-'))
  await mkdir(join(root, 'content'), { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const ctx = () => ({ specbookRoot: root })

describe('checkMermaidPlaywright', () => {
  it('returns no findings when no mermaid blocks exist', async () => {
    await writeFile(join(root, 'content/architecture.md'), '# No mermaid here')
    const findings = await checkMermaidPlaywright(ctx(), {
      tryImportPlaywright: async () => true,
    })
    expect(findings).toEqual([])
  })

  it('returns warn when mermaid present but playwright missing', async () => {
    await writeFile(
      join(root, 'content/architecture.md'),
      '# Hi\n\n```mermaid\ngraph TD; A-->B;\n```\n',
    )
    const findings = await checkMermaidPlaywright(ctx(), {
      tryImportPlaywright: async () => false,
    })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      id: 'mermaid-playwright',
      severity: 'warn',
      category: 'optional-deps',
    })
  })

  it('returns no findings when mermaid present and playwright installed', async () => {
    await writeFile(
      join(root, 'content/architecture.md'),
      '```mermaid\ngraph TD;\n```',
    )
    const findings = await checkMermaidPlaywright(ctx(), {
      tryImportPlaywright: async () => true,
    })
    expect(findings).toEqual([])
  })
})
