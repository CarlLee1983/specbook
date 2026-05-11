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

  it('accepts optional flows with structured steps', () => {
    const r = ArchitectureSchema.parse({
      diagram: 'none',
      body: '見下方流程',
      flows: [
        {
          name: '任務同步',
          description: '本機與雲端的兩段式同步',
          steps: [
            { actor: '使用者', action: '開啟 App' },
            { actor: 'Sync Service', action: '比對 timestamp', outcome: '取得 diff' },
          ],
        },
      ],
    })
    expect(r.flows).toHaveLength(1)
    expect(r.flows?.[0].steps[1].outcome).toBe('取得 diff')
  })

  it('rejects flow with empty steps', () => {
    expect(() =>
      ArchitectureSchema.parse({
        diagram: 'none',
        body: 'x',
        flows: [{ name: '空流程', steps: [] }],
      })
    ).toThrow()
  })

  it('rejects step without actor or action', () => {
    expect(() =>
      ArchitectureSchema.parse({
        diagram: 'none',
        body: 'x',
        flows: [{ name: 'F', steps: [{ actor: '', action: '走一步' }] }],
      })
    ).toThrow()
  })
})
