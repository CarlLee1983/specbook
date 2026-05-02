import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { loadAll, type SpecBookData } from '../content/load-all.js'

const VIRTUAL_ID = 'virtual:specbook-data'
const RESOLVED = '\0' + VIRTUAL_ID

export function specbookContentPlugin(specbookRoot: string): Plugin {
  const root = resolve(specbookRoot)
  let cached: SpecBookData | null = null

  return {
    name: 'specbook:content-hmr',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED
      return null
    },
    async load(id) {
      if (id !== RESOLVED) return null
      cached = await loadAll(root)
      const { paths: _p, ...safe } = cached
      return `export default ${JSON.stringify(safe)}`
    },
    configureServer(server) {
      const watched = [
        resolve(root, 'specbook.config.ts'),
        resolve(root, 'content/overview.md'),
        resolve(root, 'content/tech-stack.yaml'),
        resolve(root, 'content/architecture.md'),
        resolve(root, 'content/user-stories.yaml'),
        resolve(root, 'content/roadmap.yaml'),
      ]
      for (const f of watched) server.watcher.add(f)
      server.watcher.on('change', (file) => {
        if (!watched.includes(file)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}
