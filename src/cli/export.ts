import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadAll } from '../content/load-all.js'
import { renderDocumentHtml } from '../export/render-html.js'
import { renderDocumentMarkdown } from '../export/render-markdown.js'

export interface ExportOptions {
  root: string
  outDir: string
  formats: Array<'md' | 'html'>
}

export async function runExport(opts: ExportOptions): Promise<void> {
  const data = await loadAll(opts.root)
  await mkdir(opts.outDir, { recursive: true })

  if (opts.formats.includes('md')) {
    await writeFile(resolve(opts.outDir, 'system-spec.md'), renderDocumentMarkdown(data), 'utf-8')
  }

  if (opts.formats.includes('html')) {
    await writeFile(resolve(opts.outDir, 'system-spec.html'), renderDocumentHtml(data), 'utf-8')
  }
}
