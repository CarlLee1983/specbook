import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { loadAll } from '../../src/content/load-all'
import { buildDocumentOutline } from '../../src/export/document-outline'

describe('buildDocumentOutline', () => {
  it('maps SpecBookData into a client-facing system spec outline', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const outline = buildDocumentOutline(data)

    expect(outline.cover.title).toBe('TaskFlow 系統規格書')
    expect(outline.cover.subtitle).toBe('同步至雲端的極簡待辦工具')
    expect(outline.sections.map((section) => section.heading)).toEqual([
      '專案背景與目標',
      '範圍定義',
      '功能需求',
      '非功能需求',
      '系統架構',
      '技術選型',
      '里程碑與交付',
      '驗收標準',
    ])
    expect(outline.sections[2].body).toContain('忙碌的開發者')
    expect(outline.sections[5].body).toContain('React')
    expect(outline.sections[6].body).toContain('2026 Q1')
  })

  it('attaches flows to architecture section and suppresses mermaid hint when flows exist', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const outline = buildDocumentOutline(data)
    const architecture = outline.sections.find((s) => s.id === 'architecture')

    expect(architecture).toBeDefined()
    expect(architecture?.flows).toBeDefined()
    expect(architecture?.flows?.[0].name).toBe('任務同步')
    expect(architecture?.flows?.[0].steps).toHaveLength(5)
    expect(architecture?.body).not.toContain('架構圖採 Mermaid 表達')
  })
})
