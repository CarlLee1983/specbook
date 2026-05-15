import { describe, it, expect } from 'vitest'
import {
  ALL_CATEGORIES,
  OVERVIEW_KEY,
  resolveCoverage,
  normalizeCoverageFlag,
} from '../../src/docs/coverage'

describe('ALL_CATEGORIES', () => {
  it('lists 10 categories in skill order', () => {
    expect(ALL_CATEGORIES).toEqual([
      'install-setup',
      'connections',
      'discovery-read',
      'writes-mutations',
      'advanced-tools',
      'diagnostics-recovery',
      'engine-support',
      'ai-integration',
      'visual-surfaces',
      'documentation-maintenance',
    ])
  })
})

describe('resolveCoverage', () => {
  it('expands "all" to overview + 10 categories', () => {
    const r = resolveCoverage('all')
    expect('keys' in r).toBe(true)
    if ('keys' in r) {
      expect(r.keys[0]).toBe(OVERVIEW_KEY)
      expect(r.keys.length).toBe(11)
    }
  })

  it('accepts array subset and prepends overview', () => {
    const r = resolveCoverage(['install-setup', 'discovery-read'])
    if ('keys' in r) {
      expect(r.keys).toEqual(['overview', 'install-setup', 'discovery-read'])
    } else {
      throw new Error('expected ok result')
    }
  })

  it('rejects unknown doc-key', () => {
    const r = resolveCoverage(['not-a-real-key'])
    expect('error' in r).toBe(true)
  })
})

describe('normalizeCoverageFlag', () => {
  it('passes through "all"', () => {
    expect(normalizeCoverageFlag('all')).toBe('all')
  })

  it('converts numeric list to kebab-case array', () => {
    const r = normalizeCoverageFlag('1,3,4')
    expect(r).toEqual(['install-setup', 'discovery-read', 'writes-mutations'])
  })

  it('keeps kebab-case list as array', () => {
    const r = normalizeCoverageFlag('install-setup,discovery-read')
    expect(r).toEqual(['install-setup', 'discovery-read'])
  })

  it('errors on out-of-range index', () => {
    const r = normalizeCoverageFlag('99')
    expect(typeof r === 'object' && 'error' in r).toBe(true)
  })

  it('errors on empty input', () => {
    const r = normalizeCoverageFlag('')
    expect(typeof r === 'object' && 'error' in r).toBe(true)
  })

  it('errors on mixed numeric + kebab-case', () => {
    const r = normalizeCoverageFlag('1,install-setup')
    expect(typeof r === 'object' && 'error' in r).toBe(true)
  })
})
