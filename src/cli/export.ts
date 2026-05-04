import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadAll } from '../content/load-all.js'
import { renderDocumentHtml } from '../export/render-html.js'
import { renderDocumentMarkdown } from '../export/render-markdown.js'

export type ExportFormat = 'md' | 'html'

export interface ExportOptions {
  root: string
  outDir: string
  formats: ExportFormat[]
}

const SUPPORTED_FORMATS: ExportFormat[] = ['md', 'html']

export function parseExportFormats(input: string): ExportFormat[] {
  const formats = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (formats.length === 0) {
    throw new Error('At least one export format is required')
  }

  return formats.map(assertExportFormat)
}

function assertExportFormat(format: string): ExportFormat {
  if (SUPPORTED_FORMATS.includes(format as ExportFormat)) return format as ExportFormat
  throw new Error(`Unsupported export format: ${format}`)
}

export async function runExport(opts: ExportOptions): Promise<void> {
  const formats = opts.formats.map(assertExportFormat)
  const data = await loadAll(opts.root)
  await mkdir(opts.outDir, { recursive: true })

  if (formats.includes('md')) {
    await writeFile(resolve(opts.outDir, 'system-spec.md'), renderDocumentMarkdown(data), 'utf-8')
  }

  if (formats.includes('html')) {
    await writeFile(resolve(opts.outDir, 'system-spec.html'), renderDocumentHtml(data), 'utf-8')
  }
}
