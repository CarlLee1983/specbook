import { describe, it, expect } from 'vitest'
import { DocumentMetadataSchema, SpecBookConfigSchema, defineConfig } from '../../src/schema/config'

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

  it('accepts optional document metadata for client exports', () => {
    const cfg = SpecBookConfigSchema.parse({
      project: { name: 'TaskFlow' },
      document: {
        title: 'TaskFlow 系統規格書',
        version: '1.2.0',
        audience: 'Client',
        confidentiality: 'confidential',
      },
    })

    expect(cfg.document?.title).toBe('TaskFlow 系統規格書')
    expect(cfg.document?.version).toBe('1.2.0')
    expect(cfg.document?.audience).toBe('Client')
    expect(cfg.document?.confidentiality).toBe('confidential')
  })

  it('fills default document metadata when omitted', () => {
    const cfg = SpecBookConfigSchema.parse({
      project: { name: 'TaskFlow' },
    })

    expect(cfg.document?.version).toBe('v1.0')
    expect(cfg.document?.audience).toBe('Client')
    expect(cfg.document?.confidentiality).toBe('confidential')
  })

  it('exports document metadata schema for renderer reuse', () => {
    const doc = DocumentMetadataSchema.parse({})
    expect(doc.version).toBe('v1.0')
    expect(doc.audience).toBe('Client')
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
