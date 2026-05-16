import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { runEnhanceCli } from '../../src/cli/enhance.js'

const ALL = resolve(__dirname, '../fixtures/enhance-all-placeholders/.specbook')
const ITEM = resolve(__dirname, '../fixtures/enhance-item-level/.specbook')
const CLEAN = resolve(__dirname, '../../examples/taskflow')

describe('runEnhanceCli', () => {
  it('--json on all-placeholders → exit 0 + parseable JSON with ok=false', async () => {
    const r = await runEnhanceCli({ root: ALL, json: true })
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toBe('')
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(false)
    expect(Array.isArray(parsed.items)).toBe(true)
    expect(parsed.items[0].id).toBe('placeholder.overview')
    expect(parsed.meta.schemaVersion).toBe(1)
  })

  it('--json on clean fixture → ok=true, items=[]', async () => {
    const r = await runEnhanceCli({ root: CLEAN, json: true })
    expect(r.exitCode).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(true)
    expect(parsed.items).toEqual([])
  })

  it('--json on item-level → contains item-level paths', async () => {
    const r = await runEnhanceCli({ root: ITEM, json: true })
    const parsed = JSON.parse(r.stdout)
    const paths = parsed.items.map((i: { path?: string }) => i.path)
    expect(paths).toContain('stories[0].soThat')
    expect(paths).toContain('milestones[1]')
  })

  it('no --json on clean → green check message', async () => {
    const r = await runEnhanceCli({ root: CLEAN, json: false })
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toMatch(/✅/)
    expect(r.stdout).toMatch(/Spec 已完整/)
  })

  it('no --json on non-clean → human-readable list', async () => {
    const r = await runEnhanceCli({ root: ALL, json: false })
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toMatch(/偵測到以下可補齊項/)
    expect(r.stdout).toMatch(/user-stories/)
    expect(r.stdout).toMatch(/\[warn\]/)
  })

  it('root does not exist → exit 2 + stderr message, empty stdout', async () => {
    const r = await runEnhanceCli({ root: '/tmp/specbook-does-not-exist-enhance', json: false })
    expect(r.exitCode).toBe(2)
    expect(r.stdout).toBe('')
    expect(r.stderr).toMatch(/找不到 \.specbook 目錄/)
  })
})
