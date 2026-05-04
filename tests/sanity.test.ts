import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })

  it('mentions client export workflow in README', () => {
    const readme = readFileSync(resolve(__dirname, '../README.md'), 'utf-8')
    expect(readme).toContain('npx specbook export')
    expect(readme).toContain('system-spec.md')
    expect(readme).toContain('system-spec.html')
  })
})
