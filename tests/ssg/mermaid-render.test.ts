import { describe, it, expect } from 'vitest'
import { renderArchitectureBody } from '../../src/ssg/mermaid-render'

describe('renderArchitectureBody', () => {
  it('replaces ```mermaid blocks with inline <svg>', async () => {
    const body = '前言。\n\n```mermaid\ngraph TD\n  A-->B\n```\n\n結語。'
    const out = await renderArchitectureBody(body)
    expect(out).toContain('<svg')
    expect(out).not.toContain('```mermaid')
    expect(out).toContain('前言')
    expect(out).toContain('結語')
  })

  it('returns body unchanged when no mermaid block', async () => {
    const body = '純文字章節。'
    expect(await renderArchitectureBody(body)).toBe(body)
  })

  it('renders error block on invalid mermaid syntax', async () => {
    const body = '```mermaid\nthis is not valid\n```'
    const out = await renderArchitectureBody(body)
    expect(out).toMatch(/mermaid (error|render failed)/i)
  })
})
