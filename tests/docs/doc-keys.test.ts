import { describe, it, expect } from 'vitest'
import {
  parseDocKeys,
  findDuplicates,
  isValidDocKeyFormat,
  ordersMatch,
} from '../../src/docs/doc-keys'

describe('parseDocKeys', () => {
  it('extracts doc-keys in order', () => {
    const src = `
# Title
<!-- doc-key: overview -->
## A
<!-- doc-key: install-setup -->
## B
`
    expect(parseDocKeys(src)).toEqual(['overview', 'install-setup'])
  })

  it('returns empty array for content without markers', () => {
    expect(parseDocKeys('no markers here')).toEqual([])
  })

  it('handles whitespace tolerance', () => {
    const src = `<!--   doc-key:   install-setup   -->`
    expect(parseDocKeys(src)).toEqual(['install-setup'])
  })

  it('ignores markers with capital letters (regex requires lowercase)', () => {
    expect(parseDocKeys('<!-- doc-key: Install-Setup -->')).toEqual([])
  })
})

describe('findDuplicates', () => {
  it('returns empty for unique', () => {
    expect(findDuplicates(['a', 'b', 'c'])).toEqual([])
  })

  it('returns deduped list of repeated keys', () => {
    expect(findDuplicates(['a', 'b', 'a', 'c', 'b', 'a'])).toEqual(['a', 'b'])
  })
})

describe('isValidDocKeyFormat', () => {
  it('accepts kebab-case alphanumerics', () => {
    expect(isValidDocKeyFormat('install-setup-1')).toBe(true)
  })

  it('rejects capitals', () => {
    expect(isValidDocKeyFormat('Install-Setup')).toBe(false)
  })

  it('rejects spaces', () => {
    expect(isValidDocKeyFormat('install setup')).toBe(false)
  })

  it('rejects underscores', () => {
    expect(isValidDocKeyFormat('install_setup')).toBe(false)
  })

  it('rejects empty', () => {
    expect(isValidDocKeyFormat('')).toBe(false)
  })
})

describe('ordersMatch', () => {
  it('returns ok:true when sequences are identical', () => {
    expect(ordersMatch(['a', 'b'], ['a', 'b'])).toEqual({ ok: true })
  })

  it('returns position of first divergence', () => {
    expect(ordersMatch(['a', 'b', 'c'], ['a', 'c', 'b'])).toEqual({
      ok: false,
      position: 1,
      left: 'b',
      right: 'c',
    })
  })

  it('treats length mismatch as divergence at min-length', () => {
    expect(ordersMatch(['a', 'b'], ['a'])).toEqual({
      ok: false,
      position: 1,
      left: 'b',
      right: undefined,
    })
  })
})
