import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { loadAll } from '../../src/content/load-all'
import { renderDocumentMarkdown } from '../../src/export/render-markdown'

describe('renderDocumentMarkdown', () => {
  it('renders a formal client spec markdown document', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const markdown = renderDocumentMarkdown(data)

    expect(markdown).toContain('# TaskFlow 系統規格書')
    expect(markdown).toContain('## 專案背景與目標')
    expect(markdown).toContain('## 功能需求')
    expect(markdown).toContain('- 優先級：P0')
    expect(markdown).toContain('## 系統架構')
    expect(markdown).toContain('## 驗收標準')
    expect(markdown.endsWith('\n')).toBe(true)
  })
})
