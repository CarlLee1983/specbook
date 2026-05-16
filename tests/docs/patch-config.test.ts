import { describe, it, expect } from 'vitest'
import { patchConfig, renderDocsUserSnippet, type PatchConfigResult } from '../../src/docs/patch-config'
import type { DocsUserConfig } from '../../src/schema/docs'

const DEFAULT_DOCS_USER: DocsUserConfig = {
  enabled: true,
  locales: ['zh-TW', 'en'],
  theme: 'anthropic-warm',
  coverage: 'all',
}

describe('patchConfig', () => {
  it('returns unparseable when defineConfig is missing', () => {
    const src = `export const x = 1\n`
    const r: PatchConfigResult = patchConfig(src, DEFAULT_DOCS_USER)
    expect(r.kind).toBe('unparseable')
    if (r.kind === 'unparseable') {
      expect(r.reason).toContain('defineConfig')
    }
  })

  it('returns skipped when docs.user already exists', () => {
    const src = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X',
  },
  docs: {
    user: {
      enabled: true,
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: 'all',
    },
  },
})
`
    const r = patchConfig(src, DEFAULT_DOCS_USER)
    expect(r.kind).toBe('skipped')
  })

  it('returns unparseable when docs exists without user (conservative)', () => {
    const src = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X',
  },
  docs: {
    somethingElse: true,
  },
})
`
    const r = patchConfig(src, DEFAULT_DOCS_USER)
    expect(r.kind).toBe('unparseable')
    if (r.kind === 'unparseable') {
      expect(r.reason).toContain('without user')
    }
  })

  it('patches a template config (no trailing comma on last key)', () => {
    const src = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X'
  }
})
`
    const r = patchConfig(src, DEFAULT_DOCS_USER)
    expect(r.kind).toBe('patched')
    if (r.kind === 'patched') {
      expect(r.text).toContain("docs: {")
      expect(r.text).toContain("user: {")
      expect(r.text).toContain("enabled: true,")
      expect(r.text).toContain("locales: ['zh-TW', 'en'],")
      // Last project key got a trailing comma added before insertion
      expect(r.text).toMatch(/name: 'X',?\n\s*\},/)
    }
  })

  it('patches a config with trailing comma on last key', () => {
    const src = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X',
  },
})
`
    const r = patchConfig(src, DEFAULT_DOCS_USER)
    expect(r.kind).toBe('patched')
    if (r.kind === 'patched') {
      expect(r.text).toContain("docs: {")
      // Output ends cleanly with single })
      expect(r.text.trimEnd().endsWith('})')).toBe(true)
    }
  })

  it('honours custom locales / theme / coverage in patched output', () => {
    const src = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X',
  },
})
`
    const r = patchConfig(src, {
      enabled: true,
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: ['install-setup'],
    })
    expect(r.kind).toBe('patched')
    if (r.kind === 'patched') {
      expect(r.text).toContain("locales: ['en'],")
      expect(r.text).toContain("coverage: ['install-setup'],")
    }
  })
})

describe('renderDocsUserSnippet', () => {
  it('renders a docs.user block with given values', () => {
    const out = renderDocsUserSnippet(['en'], 'anthropic-warm', 'all')
    expect(out).toContain("docs: {")
    expect(out).toContain("user: {")
    expect(out).toContain("enabled: true")
    expect(out).toContain("locales: ['en']")
    expect(out).toContain("theme: 'anthropic-warm'")
    expect(out).toContain("coverage: 'all'")
  })
})
