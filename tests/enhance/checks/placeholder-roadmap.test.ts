import { describe, it, expect } from 'vitest'
import { checkPlaceholderRoadmap } from '../../../src/enhance/checks/placeholder-roadmap.js'
import type { Roadmap } from '../../../src/schema/roadmap.js'

const PROMPT =
  'Ask the user for 2–4 concrete milestones (title + deliverables + status). Rewrite .specbook/content/roadmap.yaml so no placeholder phrases remain.'

describe('checkPlaceholderRoadmap', () => {
  it('hits when title is M1 — 起手', () => {
    const roadmap: Roadmap = [
      { title: 'M1 — 起手', status: 'active', items: ['x'] },
    ]
    expect(checkPlaceholderRoadmap(roadmap)).toEqual([
      {
        id: 'placeholder.roadmap',
        section: 'roadmap',
        severity: 'warn',
        scope: 'section',
        file: '.specbook/content/roadmap.yaml',
        problem: 'Roadmap file still contains template placeholders.',
        prompt: PROMPT,
      },
    ])
  })

  it('hits when an item equals 第一個工作項', () => {
    const roadmap: Roadmap = [
      { title: 'Real Milestone', status: 'active', items: ['第一個工作項'] },
    ]
    expect(checkPlaceholderRoadmap(roadmap)).toHaveLength(1)
  })

  it('returns [] for a real roadmap', () => {
    const roadmap: Roadmap = [
      { title: 'M1 — Local MVP', status: 'done', items: ['real deliverable'] },
    ]
    expect(checkPlaceholderRoadmap(roadmap)).toEqual([])
  })
})
