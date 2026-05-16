import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runDoctor } from '../../src/doctor/run-doctor.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIX = (name: string) =>
  resolve(__dirname, '../fixtures/doctor', name, '.specbook')

describe('runDoctor', () => {
  it('happy: ok=true, no error findings', async () => {
    const report = await runDoctor({ root: FIX('happy') })
    expect(report.ok).toBe(true)
    expect(report.findings.filter((f) => f.severity === 'error')).toEqual([])
    expect(report.meta.specbookRoot).toContain('happy/.specbook')
  })

  it('no-specbook: specbook-missing error + skipped infos', async () => {
    const report = await runDoctor({ root: FIX('no-specbook') })
    expect(report.ok).toBe(false)
    const ids = report.findings.map((f) => f.id)
    expect(ids).toContain('specbook-missing')
    expect(ids).toContain('skipped.config')
    expect(ids).toContain('skipped.validate')
    expect(ids).toContain('skipped.enhance')
  })

  it('bad-config: config-loadable error + skipped infos', async () => {
    const report = await runDoctor({ root: FIX('bad-config') })
    expect(report.ok).toBe(false)
    const ids = report.findings.map((f) => f.id)
    expect(ids).toContain('config-loadable')
    expect(ids).toContain('skipped.validate')
  })

  it('schema-error: validate.overview error', async () => {
    const report = await runDoctor({ root: FIX('schema-error') })
    expect(report.ok).toBe(false)
    const errorIds = report.findings
      .filter((f) => f.severity === 'error')
      .map((f) => f.id)
    expect(errorIds.some((id) => id.startsWith('validate.'))).toBe(true)
  })

  it('has-gaps: warn but ok=true', async () => {
    const report = await runDoctor({ root: FIX('has-gaps') })
    expect(report.ok).toBe(true)
    const warnIds = report.findings
      .filter((f) => f.severity === 'warn')
      .map((f) => f.id)
    expect(warnIds.some((id) => id.startsWith('enhance.'))).toBe(true)
  })

  it('mermaid-without-playwright: warn but ok=true', async () => {
    const report = await runDoctor({
      root: FIX('mermaid-without-playwright'),
      tryImportPlaywright: async () => false,
    })
    expect(report.ok).toBe(true)
    const ids = report.findings.map((f) => f.id)
    expect(ids).toContain('mermaid-playwright')
  })
})
