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

export async function runDev(opts: DevOptions): Promise<void> {
  const root = opts.root
  const devDir = resolve(root, '.dev')
  await mkdir(devDir, { recursive: true })
  const entryHtml = resolve(devDir, 'index.html')
  const entryTsx = resolve(devDir, 'main.tsx')
  const specbookPkg = await findSpecbookPkgRoot(__dirname)

  if (!existsSync(entryHtml)) {
    await writeFile(entryHtml, `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>SpecBook dev</title></head>
<body><div id="root"></div><script type="module" src="./main.tsx"></script></body>
</html>`)
  }

  if (!existsSync(entryTsx)) {
    await writeFile(entryTsx, `import React from 'react'
import { createRoot } from 'react-dom/client'
import 'specbook/styles/global.css'
import { SpecBookPage } from 'specbook/components'
import data from 'virtual:specbook-data'
createRoot(document.getElementById('root')!).render(<SpecBookPage data={data as any} />)
`)
  }

  const server = await createServer({
    configFile: false,
    root: devDir,
    server: { port: opts.port ?? 5173 },
    plugins: [react(), tailwindcss(), specbookContentPlugin(root)],
    resolve: {
      alias: {
        'specbook/styles/global.css': resolve(specbookPkg, 'src/styles/global.css'),
        'specbook/components': resolve(specbookPkg, 'src/components/SpecBookPage.tsx'),
      },
    },
  })
  await server.listen()
  server.printUrls()
}

async function findSpecbookPkgRoot(startDir: string): Promise<string> {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    const pkgPath = resolve(dir, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'))
      if (pkg.name === 'specbook') return dir
    }
    dir = resolve(dir, '..')
  }
  return startDir
}
