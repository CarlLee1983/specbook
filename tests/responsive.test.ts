import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('responsive CSS', () => {
  const css = readFileSync(
    resolve(__dirname, '../src/styles/global.css'),
    'utf-8'
  )

  it('has @media (max-width: 900px) breakpoint', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*900px\)/)
  })

  it('hides .toc on mobile', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*900px\)[^}]*\{[\s\S]*?\.toc\s*\{[^}]*display:\s*none/)
  })

  it('collapses stack-grid to single column and adjusts story-card grid', () => {
    const block = css.match(/@media\s*\(max-width:\s*900px\)\s*\{([\s\S]*?)\n\}/)
    expect(block).not.toBeNull()
    expect(block![1]).toMatch(/\.stack-grid[\s\S]*grid-template-columns:\s*1fr/)
    expect(block![1]).toMatch(/\.story-card[\s\S]*grid-template-columns:\s*1fr/)
  })
})
