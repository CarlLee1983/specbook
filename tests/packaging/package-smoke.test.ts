// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const repoRoot = resolve(__dirname, '../..')
const cleanup: string[] = []

describe('published package smoke test', () => {
  afterEach(async () => {
    while (cleanup.length > 0) {
      const dir = cleanup.pop()
      if (dir) await rm(dir, { recursive: true, force: true })
    }
  })

  it('runs installed CLI build and export from a clean npm app', async () => {
    const tempRoot = await mkdtemp(resolve(tmpdir(), 'specbook-package-smoke-'))
    cleanup.push(tempRoot)

    const packDir = resolve(tempRoot, 'pack')
    const appDir = resolve(tempRoot, 'app')
    const specRoot = resolve(tempRoot, 'taskflow')

    await execFileAsync('mkdir', ['-p', packDir, appDir])

    const { stdout: packStdout } = await execFileAsync('npm', ['pack', '--pack-destination', packDir], {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024 * 10,
    })
    const tarballName = packStdout.trim().split('\n').at(-1)
    expect(tarballName).toMatch(/^specbook-.*\.tgz$/)

    const tarballPath = resolve(packDir, tarballName!)
    expect(existsSync(tarballPath)).toBe(true)

    await writeFile(resolve(appDir, 'package.json'), '{"type":"module","private":true}\n')
    await execFileAsync('npm', ['install', tarballPath], {
      cwd: appDir,
      maxBuffer: 1024 * 1024 * 10,
    })

    await cp(resolve(repoRoot, 'tests/fixtures/taskflow'), specRoot, { recursive: true })
    await writeFile(
      resolve(specRoot, 'content/architecture.md'),
      '---\ndiagram: none\n---\n\n三層：UI → 本機儲存 → 雲端同步。\n'
    )
    const cli = resolve(appDir, 'node_modules/.bin/specbook')

    const validate = await execFileAsync(cli, ['validate', '--root', specRoot], { cwd: appDir })
    expect(validate.stdout).toContain('All content valid.')

    await execFileAsync(cli, ['build', '--root', specRoot, '--base', '/specbook/'], {
      cwd: appDir,
      maxBuffer: 1024 * 1024 * 10,
    })
    const siteHtml = await readFile(resolve(specRoot, 'dist/index.html'), 'utf-8')
    expect(siteHtml).toContain('<title>TaskFlow</title>')
    expect(siteHtml).toMatch(/href="\/specbook\/assets\/.*\.css"/)
    expect(siteHtml).toMatch(/src="\/specbook\/assets\/.*\.js"/)

    await execFileAsync(
      cli,
      ['export', '--root', specRoot, '--out', resolve(tempRoot, 'client-spec'), '--formats', 'md,html'],
      { cwd: appDir }
    )
    const exportedMarkdown = await readFile(resolve(tempRoot, 'client-spec/system-spec.md'), 'utf-8')
    const exportedHtml = await readFile(resolve(tempRoot, 'client-spec/system-spec.html'), 'utf-8')
    expect(exportedMarkdown).toContain('# TaskFlow 系統規格書')
    expect(exportedHtml).toContain('<main class="document">')
  }, 180_000)
})
