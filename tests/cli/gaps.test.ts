import { describe, it, expect } from 'vitest'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runGapsCli } from '../../src/cli/gaps.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const PARTIAL = resolve(HERE, '../fixtures/partial-specbook/.specbook')
const CLEAN = resolve(HERE, '../fixtures/doctor/happy/.specbook')
const DEPRECATION =
  "[deprecated] 'specbook gaps' will be removed in a future release. Use 'specbook enhance' instead."

describe('runGapsCli', () => {
  it('--json 輸出可解析、含 gaps 陣列', async () => {
    const r = await runGapsCli({ root: PARTIAL, json: true })
    const parsed = JSON.parse(r.stdout)
    expect(Array.isArray(parsed.gaps)).toBe(true)
    expect(parsed.ok).toBe(false)
    const sections = parsed.gaps.map((g: { section: string }) => g.section)
    expect(sections).toContain('user-stories')
  })

  it('沒 --json 時印人類可讀格式', async () => {
    const r = await runGapsCli({ root: PARTIAL, json: false })
    expect(r.stdout).toMatch(/user-stories/)
    expect(r.stdout).toMatch(/placeholder/)
  })

  it('exitCode：有缺口 → 0（這不是錯誤，只是訊號）', async () => {
    const r = await runGapsCli({ root: PARTIAL, json: true })
    expect(r.exitCode).toBe(0)
  })

  it('找不到 .specbook 路徑 → exitCode 2 + 錯誤訊息進 stderr', async () => {
    const r = await runGapsCli({ root: '/tmp/does-not-exist-specbook', json: false })
    expect(r.exitCode).toBe(2)
    expect(r.stderr.length).toBeGreaterThan(0)
  })

  it('clean root --json → stderr 第一行是 [deprecated]、stdout JSON 仍可解析', async () => {
    const r = await runGapsCli({ root: CLEAN, json: true })
    expect(r.exitCode).toBe(0)
    expect(r.stderr.split('\n')[0]).toBe(DEPRECATION)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(true)
    expect(parsed.gaps).toEqual([])
  })

  it('root missing → stderr 第一行是 [deprecated]、其後接原本錯誤訊息', async () => {
    const r = await runGapsCli({ root: '/tmp/does-not-exist-specbook', json: false })
    expect(r.exitCode).toBe(2)
    const lines = r.stderr.split('\n')
    expect(lines[0]).toBe(DEPRECATION)
    expect(lines.slice(1).join('\n')).toMatch(/找不到 \.specbook 目錄/)
  })
})
