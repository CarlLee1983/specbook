import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('PaperTech CSS tokens', () => {
  const tokensCss = readFileSync(resolve(__dirname, '../../src/styles/tokens.css'), 'utf-8')
  const globalCss = readFileSync(resolve(__dirname, '../../src/styles/global.css'), 'utf-8')

  it('defines the error status token used by P0 story priority badges', () => {
    expect(globalCss).toContain('var(--color-status-error)')
    expect(tokensCss).toMatch(/--color-status-error:\s*#E64833;/)
  })
})
