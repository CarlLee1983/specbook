import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scaffoldUserDocs } from '../../src/docs/scaffold'
import { parseDocKeys } from '../../src/docs/doc-keys'

let tmp: string
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'specbook-scaffold-'))
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('scaffoldUserDocs', () => {
  it('writes md + html for each locale with matching doc-keys', async () => {
    const r = await scaffoldUserDocs({
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'Example',
      tagline: 'A test project',
      githubUrl: 'https://example.com/repo',
      locales: ['en', 'zh-TW'],
      theme: 'anthropic-warm',
      coverage: 'all',
      force: false,
    })
    expect(r.ok).toBe(true)
    const mdEn = await readFile(join(tmp, 'docs/user/en/index.md'), 'utf8')
    const htmlEn = await readFile(join(tmp, 'docs/user/en/index.html'), 'utf8')
    const mdKeys = parseDocKeys(mdEn)
    const htmlKeys = parseDocKeys(htmlEn)
    expect(mdKeys).toEqual(htmlKeys)
    expect(mdKeys.length).toBe(11) // overview + 10
    expect(mdEn).toContain('Example')
    expect(htmlEn).toContain('Example')
  })

  it('substitutes project / tagline / github vars', async () => {
    await scaffoldUserDocs({
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'MyApp',
      tagline: 'tagline-text',
      githubUrl: 'https://github.com/me/myapp',
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: 'all',
      force: false,
    })
    const md = await readFile(join(tmp, 'docs/user/en/index.md'), 'utf8')
    expect(md).toContain('MyApp')
    expect(md).toContain('tagline-text')
    expect(md).toContain('https://github.com/me/myapp')
    expect(md).not.toMatch(/\{\{[A-Z_]+\}\}/)
  })

  it('strips unselected coverage blocks', async () => {
    const r = await scaffoldUserDocs({
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'X',
      tagline: '',
      githubUrl: '',
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: ['install-setup', 'discovery-read'],
      force: false,
    })
    expect(r.ok).toBe(true)
    const md = await readFile(join(tmp, 'docs/user/en/index.md'), 'utf8')
    const keys = parseDocKeys(md)
    expect(keys).toEqual(['overview', 'install-setup', 'discovery-read'])
  })

  it('refuses to overwrite when force=false and file exists', async () => {
    const opts = {
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'X',
      tagline: '',
      githubUrl: '',
      locales: ['en'] as const,
      theme: 'anthropic-warm' as const,
      coverage: 'all' as const,
      force: false,
    }
    await scaffoldUserDocs(opts)
    const second = await scaffoldUserDocs(opts)
    expect(second.ok).toBe(false)
  })

  it('overwrites when force=true', async () => {
    const opts = {
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'X',
      tagline: '',
      githubUrl: '',
      locales: ['en'] as const,
      theme: 'anthropic-warm' as const,
      coverage: 'all' as const,
      force: true,
    }
    await scaffoldUserDocs(opts)
    const second = await scaffoldUserDocs(opts)
    expect(second.ok).toBe(true)
  })

  it('embeds theme css inline in html', async () => {
    await scaffoldUserDocs({
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'X',
      tagline: '',
      githubUrl: '',
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: 'all',
      force: false,
    })
    const html = await readFile(join(tmp, 'docs/user/en/index.html'), 'utf8')
    expect(html).toContain('<style>')
    expect(html).toContain('--accent')
  })
})
