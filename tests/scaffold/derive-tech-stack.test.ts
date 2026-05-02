import { describe, it, expect } from 'vitest'
import { TECH_STACK_MAP } from '../../src/scaffold/tech-stack-map.js'
import { deriveTechStack } from '../../src/scaffold/derive-tech-stack.js'
import { TechStackSchema } from '../../src/schema/tech-stack.js'

describe('TECH_STACK_MAP', () => {
  it('包含常見前端框架', () => {
    expect(TECH_STACK_MAP['react']).toEqual({
      layer: 'Frontend',
      role: 'UI 元件框架',
    })
    expect(TECH_STACK_MAP['next']).toBeDefined()
    expect(TECH_STACK_MAP['vue']).toBeDefined()
  })

  it('包含後端與資料層', () => {
    expect(TECH_STACK_MAP['express']?.layer).toBe('Backend')
    expect(TECH_STACK_MAP['prisma']?.layer).toBe('Backend & Data')
  })

  it('包含工具鏈', () => {
    expect(TECH_STACK_MAP['vite']?.layer).toBe('Tooling')
    expect(TECH_STACK_MAP['typescript']?.layer).toBe('Tooling')
  })

  it('layer 字串都不為空', () => {
    for (const [name, entry] of Object.entries(TECH_STACK_MAP)) {
      expect(entry.layer.length, name).toBeGreaterThan(0)
      expect(entry.role.length, name).toBeGreaterThan(0)
    }
  })
})

describe('deriveTechStack', () => {
  it('把已知依賴依 layer 分組', () => {
    const result = deriveTechStack({
      dependencies: { react: '^19.0.0', hono: '^4.0.0' },
      devDependencies: { vite: '^6.0.0', vitest: '^4.0.0' },
    })
    const layers = result.map((l) => l.layer)
    expect(layers).toContain('Frontend')
    expect(layers).toContain('Backend')
    expect(layers).toContain('Tooling')
    const frontend = result.find((l) => l.layer === 'Frontend')!
    expect(frontend.items.find((i) => i.name === 'react')).toBeDefined()
  })

  it('未命中的依賴被略過', () => {
    const result = deriveTechStack({
      dependencies: { 'some-unknown-pkg': '1.0.0', react: '^19.0.0' },
    })
    const all = result.flatMap((l) => l.items.map((i) => i.name))
    expect(all).toContain('react')
    expect(all).not.toContain('some-unknown-pkg')
  })

  it('保留版本字串', () => {
    const result = deriveTechStack({
      dependencies: { react: '^19.2.5' },
    })
    const item = result.flatMap((l) => l.items).find((i) => i.name === 'react')!
    expect(item.version).toBe('^19.2.5')
  })

  it('輸出符合 TechStackSchema', () => {
    const result = deriveTechStack({
      dependencies: { react: '^19.0.0' },
      devDependencies: { vite: '^6.0.0' },
    })
    expect(() => TechStackSchema.parse(result)).not.toThrow()
  })

  it('全空依賴回傳空陣列（呼叫端決定要不要 fallback）', () => {
    expect(deriveTechStack({})).toEqual([])
  })
})
