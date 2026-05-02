import { describe, it, expect } from 'vitest'
import { SpecBookConfigSchema, defineConfig } from '../../src/schema/config'

describe('SpecBookConfigSchema', () => {
  it('accepts minimal config (only project.name)', () => {
    const r = SpecBookConfigSchema.parse({ project: { name: 'X' } })
    expect(r.theme.accent).toBe('#4f46e5')
    expect(r.theme.locale).toBe('zh-TW')
    expect(r.sections.order).toEqual([
      'overview',
      'tech-stack',
      'architecture',
      'user-stories',
      'roadmap',
    ])
  })

  it('accepts custom accent + hide list', () => {
    const r = SpecBookConfigSchema.parse({
      project: { name: 'X' },
      theme: { accent: '#ff0066', mode: 'auto', locale: 'en' },
      sections: { hide: ['user-stories'] },
    })
    expect(r.theme.accent).toBe('#ff0066')
    expect(r.sections.hide).toEqual(['user-stories'])
  })

  it('rejects unknown section name in order', () => {
    expect(() =>
      SpecBookConfigSchema.parse({
        project: { name: 'X' },
        sections: { order: ['overview', 'made-up'] },
      })
    ).toThrow()
  })

  it('defineConfig returns the same shape', () => {
    const cfg = defineConfig({ project: { name: 'X' } })
    expect(cfg.project.name).toBe('X')
  })
})
