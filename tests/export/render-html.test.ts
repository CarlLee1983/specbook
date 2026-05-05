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
})
