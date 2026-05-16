import { describe, it, expect } from 'vitest'
import { checkPlaceholderArchitecture } from '../../../src/enhance/checks/placeholder-architecture.js'
import type { Architecture } from '../../../src/schema/architecture.js'

const PROMPT =
  "Ask the user for the system's high-level architecture: main components, how they communicate, and key external dependencies. Rewrite .specbook/content/architecture.md so no placeholder phrases remain."

function makeArch(body: string): Architecture {
  return { diagram: 'none', body } as Architecture
}

describe('checkPlaceholderArchitecture', () => {
  it('hits when body contains 整體架構 placeholder', () => {
    const items = checkPlaceholderArchitecture(makeArch('在這裡描述系統的整體架構：foo'))
    expect(items).toEqual([
      {
        id: 'placeholder.architecture',
        section: 'architecture',
        severity: 'warn',
        scope: 'section',
        file: '.specbook/content/architecture.md',
        problem: 'Architecture file still contains template placeholders.',
        prompt: PROMPT,
      },
    ])
  })

  it('returns [] when body is clean', () => {
    expect(checkPlaceholderArchitecture(makeArch('We use a three-tier architecture.'))).toEqual([])
  })
})
