import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  cpSync,
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runInit } from '../../src/scaffold/run-init.js'
import { runValidate } from '../../src/cli/validate.js'

const FIXTURE = resolve(__dirname, '../fixtures/fresh-project')

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-init-'))
  cpSync(FIXTURE, dir, { recursive: true })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('runInit', () => {
  it('在乾淨專案上產生完整可驗證的 .specbook/', async () => {
    const report = await runInit({ projectRoot: dir })
    expect(report.specbookRoot).toBe(join(dir, '.specbook'))
    expect(existsSync(join(dir, '.specbook/specbook.config.ts'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/content/overview.md'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/content/tech-stack.yaml'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/content/architecture.md'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/content/user-stories.yaml'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/content/roadmap.yaml'))).toBe(true)

    const ts = readFileSync(join(dir, '.specbook/content/tech-stack.yaml'), 'utf-8')
    expect(ts).toContain('react')
    expect(ts).toContain('vite')

    const validation = await runValidate(join(dir, '.specbook'))
    expect(validation.errors).toEqual([])
    expect(validation.ok).toBe(true)
  })

  it('再跑一次 → 全部 kept（冪等）', async () => {
    await runInit({ projectRoot: dir })
    const second = await runInit({ projectRoot: dir })
    for (const r of second.files) expect(r.action).toBe('kept')
  })

  it('--force 覆寫既有檔案', async () => {
    await runInit({ projectRoot: dir })
    writeFileSync(join(dir, '.specbook/content/overview.md'), 'STALE')
    const r = await runInit({ projectRoot: dir, force: true })
    const ov = r.files.find((f) => f.kind === 'overview')!
    expect(ov.action).toBe('overwritten')
    expect(readFileSync(join(dir, '.specbook/content/overview.md'), 'utf-8')).not.toBe(
      'STALE',
    )
  })

  it('--only=overview 不動其他章節', async () => {
    const r = await runInit({ projectRoot: dir, only: ['overview'] })
    const kinds = r.files.map((f) => f.kind)
    expect(kinds).toEqual(['overview'])
    expect(existsSync(join(dir, '.specbook/specbook.config.ts'))).toBe(false)
  })

  it('沒有 dependencies 時 tech-stack 不為空（fallback 一筆 stub）', async () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'empty', version: '0.0.1' }),
    )
    await runInit({ projectRoot: dir })
    const yaml = readFileSync(join(dir, '.specbook/content/tech-stack.yaml'), 'utf-8')
    expect(yaml.trim().length).toBeGreaterThan(0)
    const validation = await runValidate(join(dir, '.specbook'))
    expect(validation.errors).toEqual([])
  })
})
