import { describe, it, expect } from 'vitest'
import { TECH_STACK_MAP } from '../../src/scaffold/tech-stack-map.js'

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
