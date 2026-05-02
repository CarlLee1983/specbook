import { describe, it, expect } from 'vitest'
import { computeActiveSection } from '../../src/ssg/scrollspy'

describe('computeActiveSection', () => {
  it('returns null when no sections in viewport', () => {
    expect(computeActiveSection([], 0)).toBeNull()
  })

  it('returns the topmost section with offsetTop ≤ scrollY + 80', () => {
    const sections = [
      { id: 'overview', offsetTop: 0, height: 600 },
      { id: 'tech-stack', offsetTop: 700, height: 500 },
      { id: 'architecture', offsetTop: 1300, height: 500 },
    ]
    expect(computeActiveSection(sections, 0)).toBe('overview')
    expect(computeActiveSection(sections, 800)).toBe('tech-stack')
    expect(computeActiveSection(sections, 1400)).toBe('architecture')
  })

  it('keeps last section active when scrolled near bottom', () => {
    const sections = [
      { id: 'a', offsetTop: 0, height: 500 },
      { id: 'b', offsetTop: 600, height: 500 },
    ]
    expect(computeActiveSection(sections, 9999)).toBe('b')
  })
})
