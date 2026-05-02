import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { runGapsCli } from '../../src/cli/gaps.js'

const PARTIAL = resolve(__dirname, '../fixtures/partial-specbook/.specbook')

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
})
