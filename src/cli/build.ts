import { build as viteBuild } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { loadAll } from '../content/load-all.js'
import { renderPageToHtml } from '../ssg/render-page.js'
import { renderArchitectureBody } from '../ssg/mermaid-render.js'
import { buildSitemap, normalizeBase } from './build-helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface BuildOptions {
  root: string
  base?: string
}

export async function runBuild(opts: BuildOptions): Promise<void> {
  const root = opts.root
  const base = normalizeBase(opts.base)
  const outDir = resolve(root, 'dist')

  const data = await loadAll(root)
  const hasFlows = (data.architecture.flows?.length ?? 0) > 0
  const archBody = hasFlows
    ? data.architecture.body
    : await renderArchitectureBody(data.architecture.body)
  const dataPrepared = {
    ...data,
    architecture: { ...data.architecture, body: archBody },
  }

  const clientEntry = resolve(__dirname, '../ssg/client-entry.js')
  const stylesDir = resolve(__dirname, '../styles')
  await viteBuild({
    configFile: false,
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [{ find: /^\.\.\/styles\//, replacement: stylesDir + '/' }],
    },
    build: {
      outDir,
      emptyOutDir: true,
      assetsDir: 'assets',
      rollupOptions: {
        input: clientEntry,
        output: { entryFileNames: 'assets/main.[hash].js' },
      },
      manifest: true,
    },
    logLevel: 'warn',
  })

  const manifestRaw = await readFile(resolve(outDir, '.vite/manifest.json'), 'utf-8')
  const manifest = JSON.parse(manifestRaw) as Record<string, { file: string; isEntry?: boolean; css?: string[] }>
  const entryEntry = Object.values(manifest).find((m) => m.isEntry)
  if (!entryEntry) throw new Error('No entry found in Vite manifest')
  const jsScripts = ['/' + entryEntry.file]
  const cssLinks = (entryEntry.css ?? []).map((c) => '/' + c)

  const html = renderPageToHtml(dataPrepared, { cssLinks, jsScripts, base })
  await writeFile(resolve(outDir, 'index.html'), html, 'utf-8')

  const sectionIds = data.config.sections.order.filter(
    (s) => !data.config.sections.hide.includes(s)
  )
  const sitemap = buildSitemap(data.config, sectionIds, base)
  if (sitemap) {
    await writeFile(resolve(outDir, 'sitemap.xml'), sitemap, 'utf-8')
  }

  await copyAsset(root, outDir, data.config.project.favicon)
  await copyAsset(root, outDir, data.config.project.ogImage)
  if (data.architecture.diagram === 'image' && data.architecture.image) {
    await copyAsset(root, outDir, data.architecture.image)
  }

  console.log(`Built to ${outDir}`)
}

async function copyAsset(root: string, outDir: string, rel?: string) {
  if (!rel) return
  const src = resolve(root, rel)
  if (!existsSync(src)) return
  const dst = resolve(outDir, rel.replace(/^\.\//, ''))
  await mkdir(resolve(dst, '..'), { recursive: true })
  await copyFile(src, dst)
}
