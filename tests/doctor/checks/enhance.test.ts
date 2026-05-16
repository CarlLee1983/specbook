import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkEnhance } from '../../../src/doctor/checks/enhance.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIX = (name: string) =>
  resolve(__dirname, '../../fixtures/doctor', name, '.specbook')

describe('checkEnhance', () => {
  it('clean fixture → 1 info finding with id "enhance"', async () => {
    const findings = await checkEnhance({ specbookRoot: FIX('happy') })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      id: 'enhance',
      severity: 'info',
      category: 'content',
      title: 'No enhancement opportunities detected',
    })
  })

  it('has-gaps fixture → multiple warn findings all prefixed enhance.', async () => {
    const findings = await checkEnhance({ specbookRoot: FIX('has-gaps') })
    expect(findings.length).toBeGreaterThanOrEqual(1)
    for (const f of findings) {
      expect(f.severity).toBe('warn')
      expect(f.category).toBe('content')
      expect(f.id.startsWith('enhance.')).toBe(true)
      expect(f.hint).toBe('Run `/specbook enhance` to fill in.')
    }
    expect(findings.some((f) => f.id === 'enhance.user-stories')).toBe(true)
  })

  it('section-scope finding detail mentions only the section', async () => {
    const findings = await checkEnhance({ specbookRoot: FIX('has-gaps') })
    const sectionFinding = findings.find((f) => f.id === 'enhance.user-stories')
    expect(sectionFinding?.detail).toBe('Section: user-stories')
  })

  it('schema-error fixture → returns [] (loader failure is graceful)', async () => {
    const findings = await checkEnhance({ specbookRoot: FIX('schema-error') })
    expect(findings).toEqual([])
  })
})
