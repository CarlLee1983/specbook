// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { specbookContentPlugin } from '../../src/plugins/content-hmr'
import react from '@vitejs/plugin-react'

describe('specbookContentPlugin', () => {
  it('resolves virtual:specbook-data and ssrLoadModule returns SpecBookData', async () => {
    const server = await createServer({
      configFile: false,
      root: resolve(__dirname, '../fixtures/taskflow'),
      plugins: [react(), specbookContentPlugin(resolve(__dirname, '../fixtures/taskflow'))],
      logLevel: 'silent',
      server: { middlewareMode: true },
    })
    try {
      const mod = await server.ssrLoadModule('virtual:specbook-data')
      expect(mod.default.config.project.name).toBe('TaskFlow')
      expect(mod.default.overview.title).toBe('TaskFlow')
    } finally {
      await server.close()
    }
  })
})
