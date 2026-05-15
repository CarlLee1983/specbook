import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { loadAll } from '../../src/content/load-all'
import { renderDocumentHtml } from '../../src/export/render-html'

describe('renderDocumentHtml', () => {
  it('renders a print-friendly client spec page', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const html = renderDocumentHtml(data)

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<main class="document">')
    expect(html).toContain('data-section="requirements"')
    expect(html).toContain('data-section="acceptance"')
    expect(html).toContain('TaskFlow 系統規格書')
  })

  it('uses the configured locale for the document lang attribute', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const html = renderDocumentHtml({
      ...data,
      config: {
        ...data.config,
        theme: { ...data.config.theme, locale: 'en' },
      },
    })

    expect(html).toContain('<html lang="en">')
    expect(html).not.toContain('<html lang="zh-TW">')
  })

  it('strips mermaid fenced blocks from architecture body', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const html = renderDocumentHtml(data)

    expect(html).not.toContain('```mermaid')
    expect(html).not.toContain('graph TD')
  })

  it('renders structured flow cards with actor tags and outcomes', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const html = renderDocumentHtml(data)

    expect(html).toContain('<article class="flow">')
    expect(html).toContain('任務同步')
    expect(html).toContain('class="flow-actor">使用者</span>')
    expect(html).toContain('class="flow-actor">Sync Service</span>')
    expect(html).toContain('class="flow-action">開啟 App</p>')
    expect(html).toContain('class="flow-outcome">立即顯示離線可見內容</p>')
  })

  it('renders flow steps without optional actors', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const html = renderDocumentHtml({
      ...data,
      architecture: {
        ...data.architecture,
        flows: [
          {
            name: '免登入瀏覽',
            steps: [{ action: '訪客開啟公開規格頁' }],
          },
        ],
      },
    })

    expect(html).toContain('<article class="flow">')
    expect(html).toContain('免登入瀏覽')
    expect(html).toContain('class="flow-action">訪客開啟公開規格頁</p>')
    expect(html).not.toContain('class="flow-actor"')
  })
})
