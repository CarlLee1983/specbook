// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runExport } from '../../src/cli/export'

describe('runExport', () => {
  let tmp: string | undefined

  afterAll(async () => {
    if (tmp) await rm(tmp, { recursive: true, force: true })
  })

  it('writes client-facing markdown and html files to the export directory', async () => {
    tmp = await mkdtemp(resolve(tmpdir(), 'specbook-export-'))
    await cp(resolve(__dirname, '../fixtures/taskflow'), tmp, { recursive: true })

    await runExport({
      root: tmp,
      outDir: resolve(tmp, 'dist/client-spec'),
      formats: ['md', 'html'],
    })

    const md = await readFile(resolve(tmp, 'dist/client-spec/system-spec.md'), 'utf-8')
    const html = await readFile(resolve(tmp, 'dist/client-spec/system-spec.html'), 'utf-8')

    expect(md).toContain('# TaskFlow 系統規格書')
    expect(md).toContain('## 功能需求')
    expect(html).toContain('<main class="document">')
    expect(html).toContain('data-section="acceptance"')
  }, 120_000)
})
