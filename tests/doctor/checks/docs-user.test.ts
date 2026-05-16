import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkDocsUser } from '../../../src/doctor/checks/docs-user.js'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'doctor-docs-user-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('checkDocsUser', () => {
  it('returns no findings when docs.user is not enabled', async () => {
    const findings = await checkDocsUser({
      projectRoot: root,
      docsUserEnabled: false,
      docsUserConfig: null,
    })
    expect(findings).toEqual([])
  })

  it('returns error findings when docs.user is enabled and validation fails', async () => {
    const findings = await checkDocsUser({
      projectRoot: root,
      docsUserEnabled: true,
      docsUserConfig: {
        enabled: true,
        locales: ['en'],
        coverage: 'all',
        theme: 'anthropic-warm',
      },
    })
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0]).toMatchObject({
      severity: 'error',
      category: 'docs-user',
    })
  })

  it('returns no findings when validation passes (minimal valid docs)', async () => {
    await mkdir(join(root, 'docs/user/en'), { recursive: true })
    const minimal = '<!-- doc-key: overview -->\n'
    await writeFile(join(root, 'docs/user/en/index.md'), minimal)
    await writeFile(join(root, 'docs/user/en/index.html'), minimal)
    const findings = await checkDocsUser({
      projectRoot: root,
      docsUserEnabled: true,
      docsUserConfig: {
        enabled: true,
        locales: ['en'],
        coverage: [],
        theme: 'anthropic-warm',
      },
    })
    expect(findings).toEqual([])
  })
})
