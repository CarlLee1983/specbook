import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildUserDocs } from '../../src/docs/build'

let tmp: string
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'specbook-build-'))
  for (const l of ['en', 'zh-TW']) {
    await mkdir(join(tmp, 'docs/user', l), { recursive: true })
    await writeFile(
      join(tmp, 'docs/user', l, 'index.md'),
      `<!-- doc-key: overview -->\nhi`,
    )
    await writeFile(
      join(tmp, 'docs/user', l, 'index.html'),
      `<!-- doc-key: overview -->\n<p>hi</p>`,
    )
  }
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('buildUserDocs', () => {
  it('copies html files to dist/user/<locale>/', async () => {
    const r = await buildUserDocs({
      rootDir: tmp,
      srcDir: 'docs/user/',
      outDir: 'dist/user/',
      locales: ['en', 'zh-TW'],
      primaryLocale: 'zh-TW',
    })
    expect(r.ok).toBe(true)
    await access(join(tmp, 'dist/user/en/index.html'))
    await access(join(tmp, 'dist/user/zh-TW/index.html'))
  })

  it('generates dist/user/index.html locale chooser', async () => {
    await buildUserDocs({
      rootDir: tmp,
      srcDir: 'docs/user/',
      outDir: 'dist/user/',
      locales: ['en', 'zh-TW'],
      primaryLocale: 'zh-TW',
    })
    const chooser = await readFile(join(tmp, 'dist/user/index.html'), 'utf8')
    expect(chooser).toContain('zh-TW/index.html')
    expect(chooser).toContain('en/index.html')
    expect(chooser).toContain('navigator.language')
  })

  it('does not copy index.md', async () => {
    await buildUserDocs({
      rootDir: tmp,
      srcDir: 'docs/user/',
      outDir: 'dist/user/',
      locales: ['en'],
      primaryLocale: 'en',
    })
    let exists = true
    try {
      await access(join(tmp, 'dist/user/en/index.md'))
    } catch {
      exists = false
    }
    expect(exists).toBe(false)
  })
})
