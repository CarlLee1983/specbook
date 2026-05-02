import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runGapsCli } from '../../src/cli/gaps.js'
import { runValidate } from '../../src/cli/validate.js'

const FIXTURE = resolve(__dirname, '../fixtures/partial-specbook')

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-skill-enhance-'))
  cpSync(FIXTURE, dir, { recursive: true })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('skill enhance flow (mechanical sim)', () => {
  it('gaps → 模擬 LLM 補三個缺口 → 重新 gaps ok → validate ok', async () => {
    const before = await runGapsCli({
      root: join(dir, '.specbook'),
      json: true,
    })
    const beforeJson = JSON.parse(before.stdout)
    expect(beforeJson.ok).toBe(false)
    const sectionsBefore = beforeJson.gaps.map((g: { section: string }) => g.section)
    expect(sectionsBefore).toContain('user-stories')
    expect(sectionsBefore).toContain('roadmap')
    expect(sectionsBefore).toContain('overview')

    // Simulate LLM writing real content
    writeFileSync(
      join(dir, '.specbook/content/overview.md'),
      [
        '---',
        'tagline: 一個被部分填好的範例',
        '---',
        '',
        '# partial',
        '',
        '這是用來驗證 enhance 流程的範例專案。它示範一個',
        '已 init 但尚未補完的中間狀態。',
        '',
      ].join('\n'),
    )
    writeFileSync(
      join(dir, '.specbook/content/user-stories.yaml'),
      [
        '- as: 平台工程師',
        '  want: 在 .specbook/content 之間切換時不需要記欄位',
        '  soThat: 寫 spec 像填表，視覺與校驗即時',
        '  priority: p0',
        '- as: 主管',
        '  want: 一頁看完團隊的目標、節奏與下一步',
        '  soThat: 不必在多份文件之間拼接資訊',
        '  priority: p1',
        '',
      ].join('\n'),
    )
    writeFileSync(
      join(dir, '.specbook/content/roadmap.yaml'),
      [
        '- title: M1 — 內部發佈',
        '  quarter: 2026 Q2',
        '  status: done',
        '  items:',
        '    - 套件骨架',
        '    - 基本 5 章渲染',
        '- title: M2 — Skill 補完體驗',
        '  quarter: 2026 Q3',
        '  status: active',
        '  items:',
        '    - /specbook init',
        '    - /specbook enhance',
        '',
      ].join('\n'),
    )

    const after = await runGapsCli({
      root: join(dir, '.specbook'),
      json: true,
    })
    const afterJson = JSON.parse(after.stdout)
    expect(afterJson.ok).toBe(true)

    const v = await runValidate(join(dir, '.specbook'))
    expect(v.errors).toEqual([])
    expect(v.ok).toBe(true)
  })
})
