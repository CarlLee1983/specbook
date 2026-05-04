import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { loadConfig } from '../../src/content/load-config'

const CONFIG = resolve(__dirname, '../fixtures/client-spec/specbook.config.ts')

describe('loadConfig', () => {
  it('loads .ts config via jiti and validates', async () => {
    const cfg = await loadConfig(CONFIG)
    expect(cfg.project.name).toBe('TaskFlow')
    expect(cfg.document?.title).toBeUndefined()
    expect(cfg.document?.version).toBe('v1.0')
  })

  it('throws on missing file', async () => {
    await expect(loadConfig('/no/such/specbook.config.ts')).rejects.toThrow()
  })
})
