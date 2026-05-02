import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cpSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runInitCli } from '../../src/cli/init.js'

const FIXTURE = resolve(__dirname, '../fixtures/fresh-project')

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-init-cli-'))
  cpSync(FIXTURE, dir, { recursive: true })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('runInitCli', () => {
  it('--root 指定時將 .specbook/ 建在該專案根', async () => {
    const r = await runInitCli({ root: dir })
    expect(r.exitCode).toBe(0)
    expect(existsSync(join(dir, '.specbook/specbook.config.ts'))).toBe(true)
    expect(r.summary).toContain('tech-stack')
    expect(r.summary).toContain('overview')
    expect(r.summary).toContain('下一步')
  })

  it('--only=overview 只建 overview', async () => {
    const r = await runInitCli({ root: dir, only: ['overview'] })
    expect(r.exitCode).toBe(0)
    expect(existsSync(join(dir, '.specbook/content/overview.md'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/specbook.config.ts'))).toBe(false)
  })

  it('--only 帶非法 kind 回 exit 1', async () => {
    const r = await runInitCli({ root: dir, only: ['nope' as never] })
    expect(r.exitCode).toBe(1)
    expect(r.summary.toLowerCase()).toContain('only')
  })
})
