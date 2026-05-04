// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mkdtemp, cp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { specbookContentPlugin } from '../../src/plugins/content-hmr'
import { createDevEntryFiles, resolvePackageRuntimePaths } from '../../src/cli/dev'

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

  it('generates a type-safe dev entry without any casts', async () => {
    const tmp = await mkdtemp(resolve(tmpdir(), 'specbook-dev-entry-'))
    try {
      await createDevEntryFiles(tmp)
      const entry = await readFile(resolve(tmp, '.dev/main.tsx'), 'utf-8')
      expect(entry).toContain("import type { SpecBookData } from 'specbook'")
      expect(entry).toContain('const data = rawData as SpecBookData')
      expect(entry).not.toContain('as any')
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it('resolves dev aliases to packaged dist files', () => {
    const paths = resolvePackageRuntimePaths(resolve(process.cwd(), 'dist/cli'))
    expect(paths.styles).toBe(resolve(process.cwd(), 'dist/styles/global.css'))
    expect(paths.components).toBe(resolve(process.cwd(), 'dist/components/SpecBookPage.js'))
  })
})
