import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI = resolve(__dirname, '../../dist/cli/index.js')
const FIX = (name: string) => resolve(__dirname, '../fixtures/doctor', name)

function runCli(args: string[], cwd: string) {
  return spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf8' })
}

describe('specbook doctor CLI', () => {
  it('--help shows flags', () => {
    const r = runCli(['doctor', '--help'], FIX('happy'))
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('--json')
    expect(r.stdout).toContain('--verbose')
  })

  it('happy: exits 0, prints Summary', () => {
    const r = runCli(['doctor'], FIX('happy'))
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('Summary:')
  })

  it('no-specbook: exits 1, mentions specbook-missing', () => {
    const r = runCli(['doctor'], FIX('no-specbook'))
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('specbook-missing')
  })

  it('--json: emits valid JSON with top-level keys', () => {
    const r = runCli(['doctor', '--json'], FIX('happy'))
    expect(r.status).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(parsed).toHaveProperty('ok')
    expect(parsed).toHaveProperty('findings')
    expect(parsed).toHaveProperty('meta')
    expect(parsed.meta).toHaveProperty('nodeVersion')
    expect(parsed.meta).toHaveProperty('specbookRoot')
    expect(parsed.meta).toHaveProperty('durationMs')
  })

  it('--verbose: shows Node version line; default mode hides it', () => {
    const rDefault = runCli(['doctor'], FIX('happy'))
    const rVerbose = runCli(['doctor', '--verbose'], FIX('happy'))
    expect(rVerbose.stdout).toContain('Node version')
    expect(rDefault.stdout).not.toContain('Node version ')
  })
})
