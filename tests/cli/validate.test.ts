import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { runValidate } from '../../src/cli/validate'

describe('runValidate', () => {
  it('passes for TaskFlow fixture', async () => {
    const result = await runValidate(resolve(__dirname, '../fixtures/taskflow'))
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('reports schema errors with chapter context', async () => {
    const broken = resolve(__dirname, '../fixtures/broken-overview')
    const result = await runValidate(broken)
    expect(result.ok).toBe(false)
    expect(result.errors.join('\n')).toMatch(/overview/)
  })
})
