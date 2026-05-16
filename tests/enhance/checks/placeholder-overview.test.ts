import { describe, it, expect } from 'vitest'
import { checkPlaceholderOverview } from '../../../src/enhance/checks/placeholder-overview.js'
import type { Overview } from '../../../src/schema/overview.js'

const PROMPT =
  "Ask the user for a 1–3 paragraph project overview that explains what this project is, who it serves, and why it exists. Rewrite .specbook/content/overview.md so no placeholder phrases remain."

function makeOverview(body: string): Overview {
  return { tagline: 't', title: 'T', body } as Overview
}

describe('checkPlaceholderOverview', () => {
  it('hits when body contains 散文 placeholder', () => {
    const doc = makeOverview('在這裡寫一段 1-3 段的散文，blah blah')
    const items = checkPlaceholderOverview(doc)
    expect(items).toEqual([
      {
        id: 'placeholder.overview',
        section: 'overview',
        severity: 'warn',
        scope: 'section',
        file: '.specbook/content/overview.md',
        problem: 'Overview file still contains template placeholders.',
        prompt: PROMPT,
      },
    ])
  })

  it('hits when body contains hero placeholder', () => {
    const doc = makeOverview('foo\n這段文字會以 hero 區呈現在 SpecBook 站首屏\nbar')
    const items = checkPlaceholderOverview(doc)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('placeholder.overview')
  })

  it('returns [] when body is clean', () => {
    const doc = makeOverview('This is a real overview describing the project.')
    expect(checkPlaceholderOverview(doc)).toEqual([])
  })
})
