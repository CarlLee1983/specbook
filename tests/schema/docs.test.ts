import { describe, it, expect } from 'vitest'
import { DocsUserSchema, DocsSchema, THEMES } from '../../src/schema/docs'

describe('DocsUserSchema', () => {
  it('accepts minimal valid input', () => {
    const r = DocsUserSchema.parse({
      enabled: true,
      locales: ['zh-TW', 'en'],
      theme: 'anthropic-warm',
      coverage: 'all',
    })
    expect(r.locales).toEqual(['zh-TW', 'en'])
    expect(r.theme).toBe('anthropic-warm')
    expect(r.coverage).toBe('all')
  })

  it('defaults enabled=false, theme=anthropic-warm, coverage=all', () => {
    const r = DocsUserSchema.parse({ locales: ['zh-TW'] })
    expect(r.enabled).toBe(false)
    expect(r.theme).toBe('anthropic-warm')
    expect(r.coverage).toBe('all')
  })

  it('accepts coverage as kebab-case string array', () => {
    const r = DocsUserSchema.parse({
      locales: ['zh-TW'],
      coverage: ['install-setup', 'discovery-read'],
    })
    expect(r.coverage).toEqual(['install-setup', 'discovery-read'])
  })

  it('rejects empty locales', () => {
    expect(() => DocsUserSchema.parse({ locales: [] })).toThrow(/locale/i)
  })

  it('rejects invalid locale tags', () => {
    expect(() => DocsUserSchema.parse({ locales: ['ZH_TW'] })).toThrow()
  })

  it('rejects unknown theme', () => {
    expect(() =>
      DocsUserSchema.parse({ locales: ['zh-TW'], theme: 'cool-tech' })
    ).toThrow(/theme/i)
  })

  it('rejects coverage strings that are not kebab-case', () => {
    expect(() =>
      DocsUserSchema.parse({ locales: ['zh-TW'], coverage: ['Install_Setup'] })
    ).toThrow()
  })

  it('THEMES contains anthropic-warm only in V1', () => {
    expect([...THEMES]).toEqual(['anthropic-warm'])
  })
})

describe('DocsSchema', () => {
  it('user is optional', () => {
    const r = DocsSchema.parse({})
    expect(r.user).toBeUndefined()
  })

  it('wraps a valid user config', () => {
    const r = DocsSchema.parse({ user: { locales: ['en'] } })
    expect(r.user?.locales).toEqual(['en'])
  })
})
