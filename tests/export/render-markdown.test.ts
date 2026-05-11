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

  it('renders structured flows under architecture section', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const markdown = renderDocumentMarkdown(data)

    expect(markdown).toContain('### 任務同步')
    expect(markdown).toContain('本機與雲端的兩段式同步')
    expect(markdown).toContain('1. **使用者** — 開啟 App')
    expect(markdown).toContain('2. **React UI** — 從本機 SQLite 讀取 cached tasks')
    expect(markdown).toContain('   - 結果：立即顯示離線可見內容')
  })
})
