// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest'
import { resolve } from 'node:path'
import { mkdtemp, readFile, cp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { runBuild } from '../../src/cli/build'

describe('runBuild', () => {
  let tmp: string | undefined
  afterAll(async () => {
    if (tmp) await rm(tmp, { recursive: true, force: true })
  })

  it('produces dist/index.html with all sections', async () => {
    tmp = await mkdtemp(resolve(tmpdir(), 'specbook-build-'))
    await cp(resolve(__dirname, '../fixtures/taskflow'), tmp, { recursive: true })
    await runBuild({ root: tmp })
    const html = await readFile(resolve(tmp, 'dist/index.html'), 'utf-8')
    expect(html).toContain('<title>TaskFlow</title>')
    expect(html).toContain('section id="overview"')
    expect(html).toContain('section id="roadmap"')
    expect(html).toMatch(/href="\/assets\/.*\.css"/)
    expect(html).toMatch(/src="\/assets\/.*\.js"/)
  }, 120_000)

  it('respects --base prefix in asset urls', async () => {
    const tmp2 = await mkdtemp(resolve(tmpdir(), 'specbook-build-base-'))
    try {
      await cp(resolve(__dirname, '../fixtures/taskflow'), tmp2, { recursive: true })
      await runBuild({ root: tmp2, base: '/repo/' })
      const html = await readFile(resolve(tmp2, 'dist/index.html'), 'utf-8')
      expect(html).toMatch(/href="\/repo\/assets\/.*\.css"/)
    } finally {
      await rm(tmp2, { recursive: true, force: true })
    }
  }, 120_000)

  it('uses CSS copied into dist/styles instead of unpublished src/styles', async () => {
    const tmp3 = await mkdtemp(resolve(tmpdir(), 'specbook-build-dist-styles-'))
    try {
      await cp(resolve(__dirname, '../fixtures/taskflow'), tmp3, { recursive: true })
      await runBuild({ root: tmp3 })
      const manifest = await readFile(resolve(tmp3, 'dist/.vite/manifest.json'), 'utf-8')
      expect(manifest).toContain('client-entry')
      const html = await readFile(resolve(tmp3, 'dist/index.html'), 'utf-8')
      expect(html).toMatch(/href="\/assets\/.*\.css"/)
    } finally {
      await rm(tmp3, { recursive: true, force: true })
    }
  }, 120_000)
})
