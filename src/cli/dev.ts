import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { specbookContentPlugin } from '../plugins/content-hmr.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface DevOptions {
  root: string
  port?: number
}

export interface PackageRuntimePaths {
  styles: string
  components: string
}

export async function runDev(opts: DevOptions): Promise<void> {
  const root = opts.root
  const devDir = await createDevEntryFiles(root)
  const specbookPkg = await findSpecbookPkgRoot(__dirname)
  const runtimePaths = resolvePackageRuntimePaths(resolve(specbookPkg, 'dist/cli'))

  const server = await createServer({
    configFile: false,
    root: devDir,
    server: { port: opts.port ?? 5173 },
    plugins: [react(), tailwindcss(), specbookContentPlugin(root)],
    resolve: {
      alias: {
        'specbook/styles/global.css': runtimePaths.styles,
        'specbook/components': runtimePaths.components,
      },
    },
  })
  await server.listen()
  server.printUrls()
}

export async function createDevEntryFiles(root: string): Promise<string> {
  const devDir = resolve(root, '.dev')
  await mkdir(devDir, { recursive: true })
  const entryHtml = resolve(devDir, 'index.html')
  const entryTsx = resolve(devDir, 'main.tsx')

  if (!existsSync(entryHtml)) {
    await writeFile(entryHtml, `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>SpecBook dev</title></head>
<body><div id="root"></div><script type="module" src="./main.tsx"></script></body>
</html>`)
  }

  if (!existsSync(entryTsx)) {
    await writeFile(entryTsx, `import React from 'react'
import { createRoot } from 'react-dom/client'
import type { SpecBookData } from 'specbook'
import 'specbook/styles/global.css'
import { SpecBookPage } from 'specbook/components'
import rawData from 'virtual:specbook-data'
const data = rawData as SpecBookData
createRoot(document.getElementById('root')!).render(<SpecBookPage data={data} />)
`)
  }

  return devDir
}

export function resolvePackageRuntimePaths(cliDir: string): PackageRuntimePaths {
  return {
    styles: resolve(cliDir, '../styles/global.css'),
    components: resolve(cliDir, '../components/SpecBookPage.js'),
  }
}

async function findSpecbookPkgRoot(startDir: string): Promise<string> {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    const pkgPath = resolve(dir, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as { name?: unknown }
      if (pkg.name === 'specbook') return dir
    }
    dir = resolve(dir, '..')
  }
  return startDir
}
