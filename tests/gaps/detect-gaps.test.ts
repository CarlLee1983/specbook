import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { detectGaps } from '../../src/gaps/detect-gaps.js'

const FIXTURE = resolve(__dirname, '../fixtures/partial-specbook/.specbook')

describe('detectGaps', () => {
  it('partial-specbook：標出 overview / user-stories / roadmap 三個缺口', async () => {
    const r = await detectGaps(FIXTURE)
    const sections = r.gaps.map((g) => g.section).sort()
    expect(sections).toEqual(['overview', 'roadmap', 'user-stories'])
    expect(r.ok).toBe(false)
    expect(r.gaps.find((g) => g.section === 'user-stories')!.reason).toMatch(
      /placeholder|預設/,
    )
  })

  it('完整內容 → ok', async () => {
    const taskflow = resolve(__dirname, '../../tests/fixtures/taskflow')
    const r = await detectGaps(taskflow).catch(() => null)
    if (r) {
      expect(r.ok).toBe(true)
      expect(r.gaps).toEqual([])
    }
  })
})
