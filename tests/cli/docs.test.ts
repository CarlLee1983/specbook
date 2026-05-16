import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtemp,
  rm,
  writeFile,
  mkdir,
  readFile,
  access,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI = resolve(__dirname, '../../dist/cli/index.js')

let tmp: string
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'specbook-cli-docs-'))
  await writeFile(
    join(tmp, 'package.json'),
    JSON.stringify({ name: 'fixture-proj', version: '0.0.0' }),
  )
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

function runCli(args: string[], cwd: string) {
  return spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf8' })
}

describe('specbook docs CLI', () => {
  it('docs --help shows subcommands', () => {
    const r = runCli(['docs', '--help'], tmp)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('init')
    expect(r.stdout).toContain('validate')
    expect(r.stdout).toContain('dev')
    expect(r.stdout).toContain('build')
  })

  it('docs init scaffolds files', async () => {
    const r = runCli(
      [
        'docs',
        'init',
        '--locales',
        'en',
        '--coverage',
        'all',
        '--tagline',
        'hi',
        '--github',
        'https://x',
        '--project',
        'X',
      ],
      tmp,
    )
    expect(r.status).toBe(0)
    await access(join(tmp, 'docs/user/en/index.md'))
    await access(join(tmp, 'docs/user/en/index.html'))
  })

  it('docs validate exits 0 on scaffolded happy path with config enabled', async () => {
    runCli(
      ['docs', 'init', '--locales', 'en', '--coverage', 'all', '--project', 'X'],
      tmp,
    )
    await mkdir(join(tmp, '.specbook'), { recursive: true })
    await writeFile(
      join(tmp, '.specbook/specbook.config.ts'),
      `export default { project: { name: 'X' }, docs: { user: { enabled: true, locales: ['en'], theme: 'anthropic-warm', coverage: 'all' } } }`,
    )
    const r = runCli(['docs', 'validate'], tmp)
    expect(r.status).toBe(0)
  })

  it('docs validate exits 1 when doc-key removed from md only', async () => {
    runCli(
      ['docs', 'init', '--locales', 'en', '--coverage', 'all', '--project', 'X'],
      tmp,
    )
    await mkdir(join(tmp, '.specbook'), { recursive: true })
    await writeFile(
      join(tmp, '.specbook/specbook.config.ts'),
      `export default { project: { name: 'X' }, docs: { user: { enabled: true, locales: ['en'], theme: 'anthropic-warm', coverage: 'all' } } }`,
    )
    const mdPath = join(tmp, 'docs/user/en/index.md')
    const md = await readFile(mdPath, 'utf8')
    await writeFile(
      mdPath,
      md.replace(/<!--\s*doc-key:\s*install-setup\s*-->\n?/, ''),
    )
    const r = runCli(['docs', 'validate'], tmp)
    expect(r.status).toBe(1)
  })

  it('docs build writes dist/user/<locale>/ and chooser', async () => {
    runCli(
      [
        'docs',
        'init',
        '--locales',
        'en,zh-TW',
        '--coverage',
        'all',
        '--project',
        'X',
      ],
      tmp,
    )
    await mkdir(join(tmp, '.specbook'), { recursive: true })
    await writeFile(
      join(tmp, '.specbook/specbook.config.ts'),
      `export default { project: { name: 'X' }, docs: { user: { enabled: true, locales: ['zh-TW','en'], theme: 'anthropic-warm', coverage: 'all' } } }`,
    )
    const r = runCli(['docs', 'build'], tmp)
    expect(r.status).toBe(0)
    await access(join(tmp, 'dist/user/index.html'))
    await access(join(tmp, 'dist/user/zh-TW/index.html'))
    await access(join(tmp, 'dist/user/en/index.html'))
  })

  it('docs init --write-config patches a freshly-initialised config', async () => {
    // Use `specbook init` first to produce a real template config
    const init = spawnSync('node', [CLI, 'init'], {
      cwd: tmp,
      encoding: 'utf8',
    })
    expect(init.status).toBe(0)

    const r = runCli(
      ['docs', 'init', '--locales', 'en', '--project', 'X', '--write-config'],
      tmp,
    )
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('patched')
    expect(r.stdout).toContain('added docs.user')

    const cfgText = await readFile(
      join(tmp, '.specbook/specbook.config.ts'),
      'utf8',
    )
    expect(cfgText).toContain("docs: {")
    expect(cfgText).toContain("user: {")
    expect(cfgText).toContain("enabled: true")
    expect(cfgText).toContain("locales: ['en']")
  })

  it('docs init --write-config is idempotent when docs.user already present', async () => {
    await mkdir(join(tmp, '.specbook'), { recursive: true })
    const cfg = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X',
  },
  docs: {
    user: {
      enabled: true,
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: 'all',
    },
  },
})
`
    await writeFile(join(tmp, '.specbook/specbook.config.ts'), cfg, 'utf8')

    const r = runCli(
      ['docs', 'init', '--locales', 'en', '--project', 'X', '--write-config'],
      tmp,
    )
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('already has docs.user')

    const after = await readFile(
      join(tmp, '.specbook/specbook.config.ts'),
      'utf8',
    )
    expect(after).toBe(cfg)
  })

  it('docs init --write-config exits 1 when config is missing', async () => {
    // No .specbook/specbook.config.ts written
    const r = runCli(
      ['docs', 'init', '--locales', 'en', '--project', 'X', '--write-config'],
      tmp,
    )
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('run `specbook init` first')
  })

  it('docs init --write-config exits 1 and prints snippet when config is unparseable', async () => {
    await mkdir(join(tmp, '.specbook'), { recursive: true })
    // No defineConfig call at all → unparseable
    await writeFile(
      join(tmp, '.specbook/specbook.config.ts'),
      `export default { project: { name: 'X' } }\n`,
      'utf8',
    )
    const r = runCli(
      ['docs', 'init', '--locales', 'en', '--project', 'X', '--write-config'],
      tmp,
    )
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('could not patch')
    expect(r.stdout).toContain("docs: {")
    expect(r.stdout).toContain("user: {")
  })
})
