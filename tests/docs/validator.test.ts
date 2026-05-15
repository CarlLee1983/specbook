import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateUserDocs } from '../../src/docs/validator'
import type { DocsUserConfig } from '../../src/schema/docs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fx = (name: string) => resolve(__dirname, '../fixtures/user-docs', name)

const baseConfig: DocsUserConfig = {
  enabled: true,
  locales: ['en', 'zh-TW'],
  theme: 'anthropic-warm',
  coverage: ['install-setup'],
}

describe('validateUserDocs', () => {
  it('passes for happy fixture', async () => {
    const r = await validateUserDocs(fx('happy'), baseConfig)
    expect(r.ok).toBe(true)
  })

  it('detects md/html order mismatch', async () => {
    const r = await validateUserDocs(fx('order-mismatch'), baseConfig)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.token === 'docs.user.orderMismatch')).toBe(true)
    }
  })

  it('detects locale drift (extra key in one locale)', async () => {
    const r = await validateUserDocs(fx('locale-drift'), baseConfig)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.token === 'docs.user.localeDriftDocKey')).toBe(true)
    }
  })

  it('detects duplicate doc-key in single file', async () => {
    const r = await validateUserDocs(fx('duplicate'), baseConfig)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.token === 'docs.user.duplicateDocKey')).toBe(true)
    }
  })

  it('detects missing required doc-key', async () => {
    const r = await validateUserDocs(fx('missing-key'), baseConfig)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.token === 'docs.user.missingDocKey')).toBe(true)
    }
  })

  it('detects missing locale directory / file', async () => {
    const r = await validateUserDocs(fx('missing-file'), baseConfig)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.token === 'docs.user.missingFile')).toBe(true)
    }
  })
})
