// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mkdtemp, cp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { specbookContentPlugin } from '../../src/plugins/content-hmr'

describe('dev plugin smoke', () => {
  it('serves virtual:specbook-data via ssrLoadModule', async () => {
    const tmp = await mkdtemp(resolve(tmpdir(), 'specbook-dev-'))
    try {
      await cp(resolve(__dirname, '../fixtures/taskflow'), tmp, { recursive: true })
      const server = await createServer({
        configFile: false,
        root: tmp,
        plugins: [react(), specbookContentPlugin(tmp)],
        logLevel: 'silent',
        server: { middlewareMode: true },
      })
      try {
        const mod = await server.ssrLoadModule('virtual:specbook-data')
        expect(mod.default.config.project.name).toBe('TaskFlow')
      } finally {
        await server.close()
      }
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })
})
