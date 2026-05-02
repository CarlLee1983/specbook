import { describe, it, expect } from 'vitest'
import { buildSitemap, normalizeBase } from '../../src/cli/build-helpers'

describe('normalizeBase', () => {
  it('returns / when undefined', () => {
    expect(normalizeBase()).toBe('/')
  })
  it('adds leading + trailing slash', () => {
    expect(normalizeBase('repo')).toBe('/repo/')
    expect(normalizeBase('/repo')).toBe('/repo/')
    expect(normalizeBase('/repo/')).toBe('/repo/')
  })
})

describe('buildSitemap', () => {
  it('returns empty string when project.url not set', () => {
    expect(buildSitemap({ project: { name: 'X' } } as any, ['overview'], '/')).toBe('')
  })

  it('builds sitemap with sections as anchor URLs', () => {
    const xml = buildSitemap(
      { project: { name: 'X', url: 'https://x.com' } } as any,
      ['overview', 'roadmap'],
      '/'
    )
    expect(xml).toContain('<loc>https://x.com/</loc>')
    expect(xml).toContain('<loc>https://x.com/#overview</loc>')
    expect(xml).toContain('<loc>https://x.com/#roadmap</loc>')
  })

  it('includes base in sitemap urls', () => {
    const xml = buildSitemap(
      { project: { name: 'X', url: 'https://x.com' } } as any,
      ['overview'],
      '/repo/'
    )
    expect(xml).toContain('<loc>https://x.com/repo/</loc>')
    expect(xml).toContain('<loc>https://x.com/repo/#overview</loc>')
  })
})
