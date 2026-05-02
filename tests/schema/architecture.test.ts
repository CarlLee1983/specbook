import { describe, it, expect } from 'vitest'
import { ArchitectureSchema } from '../../src/schema/architecture'

describe('ArchitectureSchema', () => {
  it('accepts diagram=mermaid without image', () => {
    const r = ArchitectureSchema.parse({
      diagram: 'mermaid',
      body: 'graph TD\n A --> B',
    })
    expect(r.diagram).toBe('mermaid')
  })

  it('accepts diagram=image with image path', () => {
    const r = ArchitectureSchema.parse({
      diagram: 'image',
      image: './assets/arch.png',
      body: '見上圖',
    })
    expect(r.image).toBe('./assets/arch.png')
  })

  it('rejects diagram=image without image path', () => {
    expect(() =>
      ArchitectureSchema.parse({ diagram: 'image', body: 'x' })
    ).toThrow(/image/)
  })

  it('accepts diagram=none', () => {
    const r = ArchitectureSchema.parse({ diagram: 'none', body: '純文字' })
    expect(r.image).toBeUndefined()
  })
})
