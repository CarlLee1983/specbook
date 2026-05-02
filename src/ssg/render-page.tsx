import { renderToString } from 'react-dom/server'
import { SpecBookPage } from '../components/SpecBookPage.js'
import type { SpecBookData } from '../content/load-all.js'

export interface RenderOptions {
  cssLinks: string[]
  jsScripts: string[]
  base?: string
}

export function renderPageToHtml(data: SpecBookData, opts: RenderOptions): string {
  const body = renderToString(<SpecBookPage data={data} />)
  const { config } = data
  const lang = config.theme.locale
  const accent = config.theme.accent

  const links = opts.cssLinks
    .map((h) => `<link rel="stylesheet" href="${withBase(h, opts.base)}" />`)
    .join('\n  ')
  const scripts = opts.jsScripts
    .map((h) => `<script type="module" src="${withBase(h, opts.base)}"></script>`)
    .join('\n  ')

  const ogImage = config.project.ogImage
    ? `\n  <meta property="og:image" content="${withBase(config.project.ogImage, opts.base)}" />`
    : ''
  const favicon = config.project.favicon
    ? `\n  <link rel="icon" href="${withBase(config.project.favicon, opts.base)}" />`
    : ''
  const description = config.project.description
    ? `\n  <meta name="description" content="${escapeHtml(config.project.description)}" />`
    : ''
  const canonical = config.project.url
    ? `\n  <link rel="canonical" href="${config.project.url}" />`
    : ''

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(config.project.name)}</title>${description}${favicon}${canonical}${ogImage}
  <meta property="og:title" content="${escapeHtml(config.project.name)}" />
  <meta property="og:type" content="website" />
  <style>:root { --accent: ${accent}; --accent-soft: ${accent}1a; }</style>
  ${links}
</head>
<body>
  <div id="root">${body}</div>
  <script type="application/json" id="__specbook_state">${jsonForScript(data)}</script>
  ${scripts}
</body>
</html>`
}

function withBase(href: string, base?: string): string {
  if (!base || href.startsWith('http')) return href
  if (href.startsWith('/')) return base.replace(/\/$/, '') + href
  return href
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function jsonForScript(data: SpecBookData): string {
  // 序列化為 client hydration 用，去掉 paths（含本機絕對路徑）
  const { paths: _paths, ...safe } = data
  return JSON.stringify(safe).replace(/</g, '\\u003c')
}
