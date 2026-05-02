import { describe, it, expect } from 'vitest'
import { getStrings } from '../src/i18n'

describe('i18n', () => {
  it('returns zh-TW strings', () => {
    const s = getStrings('zh-TW')
    expect(s.toc).toBe('目錄')
    expect(s.chapters.overview).toBe('Overview')
    expect(s.statuses.done).toBe('完成')
    expect(s.statuses.active).toBe('進行中')
  })

  it('returns en strings', () => {
    const s = getStrings('en')
    expect(s.toc).toBe('Contents')
    expect(s.statuses.done).toBe('Done')
  })
})
