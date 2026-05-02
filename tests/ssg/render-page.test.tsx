import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { loadAll } from '../../src/content/load-all'
import { renderPageToHtml } from '../../src/ssg/render-page'

describe('renderPageToHtml', () => {
  it('produces a complete HTML document with all 5 sections', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const html = renderPageToHtml(data, {
      cssLinks: ['/assets/main.css'],
      jsScripts: ['/assets/main.js'],
    })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="zh-TW">')
    expect(html).toContain('<title>TaskFlow</title>')
    expect(html).toContain('section id="overview"')
    expect(html).toContain('section id="roadmap"')
    expect(html).toContain('href="/assets/main.css"')
    expect(html).toContain('src="/assets/main.js"')
  })

  it('uses en lang when locale=en', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const html = renderPageToHtml(
      { ...data, config: { ...data.config, theme: { ...data.config.theme, locale: 'en' } } },
      { cssLinks: [], jsScripts: [] }
    )
    expect(html).toContain('<html lang="en">')
  })

  it('prefixes asset URLs with base when provided', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const html = renderPageToHtml(data, {
      cssLinks: ['/assets/main.css'],
      jsScripts: ['/assets/main.js'],
      base: '/repo/',
    })
    expect(html).toContain('href="/repo/assets/main.css"')
    expect(html).toContain('src="/repo/assets/main.js"')
  })
})
