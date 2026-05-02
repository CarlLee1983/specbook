import { describe, it, expect } from 'vitest'
import { TechStackSchema } from '../../src/schema/tech-stack'

describe('TechStackSchema', () => {
  it('accepts valid layered list', () => {
    const data = [
      {
        layer: 'Frontend',
        items: [
          { name: 'React', version: '19.0', role: 'UI 框架' },
          { name: 'Tailwind', role: '原子化樣式' },
        ],
      },
    ]
    const result = TechStackSchema.parse(data)
    expect(result[0].items[0].name).toBe('React')
  })

  it('requires items[].role', () => {
    expect(() =>
      TechStackSchema.parse([
        { layer: 'X', items: [{ name: 'Y' }] },
      ])
    ).toThrow()
  })

  it('rejects empty layers', () => {
    expect(() => TechStackSchema.parse([])).toThrow()
  })
})
