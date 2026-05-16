import { describe, it, expect } from 'vitest'
import { checkNodeVersion } from '../../../src/doctor/checks/node-version.js'

describe('checkNodeVersion', () => {
  it('returns error finding for Node < 20', async () => {
    const findings = await checkNodeVersion({ nodeVersion: 'v18.20.0' })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      id: 'node-version',
      severity: 'error',
      category: 'environment',
    })
    expect(findings[0].title).toContain('20')
  })

  it('returns info finding for Node 20', async () => {
    const findings = await checkNodeVersion({ nodeVersion: 'v20.11.0' })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      id: 'node-version',
      severity: 'info',
      category: 'environment',
    })
  })

  it('returns info finding for Node 22', async () => {
    const findings = await checkNodeVersion({ nodeVersion: 'v22.5.0' })
    expect(findings[0].severity).toBe('info')
  })
})
