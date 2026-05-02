import type { SpecBookConfig } from '../schema/config.js'

export function normalizeBase(base?: string): string {
  if (!base) return '/'
  let b = base
  if (!b.startsWith('/')) b = '/' + b
  if (!b.endsWith('/')) b = b + '/'
  return b
}

export function buildSitemap(
  config: SpecBookConfig,
  sectionIds: string[],
  base: string
): string {
  const url = config.project.url
  if (!url) return ''
  const root = url.replace(/\/$/, '') + base.replace(/\/$/, '')
  const entries = ['', ...sectionIds.map((id) => '#' + id)]
  const urls = entries
    .map((suffix) => `<url><loc>${root}/${suffix}</loc></url>`)
    .join('\n  ')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`
}
