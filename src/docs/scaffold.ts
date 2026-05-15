import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveCoverage } from './coverage.js'

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = resolve(MODULE_DIR, 'templates')

export type ScaffoldOptions = {
  rootDir: string
  outDir: string
  projectName: string
  tagline: string
  githubUrl: string
  locales: readonly string[]
  theme: 'anthropic-warm'
  coverage: 'all' | readonly string[]
  force: boolean
}

export type ScaffoldResult =
  | { ok: true; writtenFiles: string[] }
  | { ok: false; error: string }

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key: string) => {
    if (!(key in vars)) {
      throw new Error(`Template variable not provided: {{${key}}}`)
    }
    return vars[key]!
  })
}

function stripUnselected(template: string, selected: readonly string[]): string {
  const set = new Set(selected)
  const blockRe = /[ \t]*<!--\s*BEGIN:([a-z0-9-]+)\s*-->\n([\s\S]*?)\n[ \t]*<!--\s*END:\1\s*-->\n?/g
  let result = template.replace(blockRe, (_match, key: string, body: string) => {
    if (!set.has(key)) return ''
    return `${body}\n`
  })
  result = result.replace(/\n{3,}/g, '\n\n')
  return result
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function scaffoldUserDocs(opts: ScaffoldOptions): Promise<ScaffoldResult> {
  const coverage = resolveCoverage(opts.coverage)
  if ('error' in coverage) return { ok: false, error: coverage.error }

  const mdTmpl = await readFile(join(TEMPLATES_DIR, 'index.md.tmpl'), 'utf8')
  const htmlTmpl = await readFile(join(TEMPLATES_DIR, 'index.html.tmpl'), 'utf8')
  const themeCss = await readFile(
    join(TEMPLATES_DIR, 'themes', `${opts.theme}.css`),
    'utf8',
  )

  const written: string[] = []

  for (const locale of opts.locales) {
    const localeDir = join(opts.rootDir, opts.outDir, locale)
    const mdPath = join(localeDir, 'index.md')
    const htmlPath = join(localeDir, 'index.html')

    if (!opts.force) {
      if ((await fileExists(mdPath)) || (await fileExists(htmlPath))) {
        return {
          ok: false,
          error: `Refusing to overwrite existing files at ${localeDir} (use --force to override)`,
        }
      }
    }

    const baseVars = {
      PROJECT_NAME: opts.projectName,
      TAGLINE: opts.tagline,
      GITHUB_URL: opts.githubUrl,
      LOCALE: locale,
    }

    const mdOut = applyVars(stripUnselected(mdTmpl, coverage.keys), {
      ...baseVars,
      THEME_CSS: '',
    })
    const htmlOut = applyVars(stripUnselected(htmlTmpl, coverage.keys), {
      ...baseVars,
      THEME_CSS: themeCss,
    })

    await mkdir(localeDir, { recursive: true })
    await writeFile(mdPath, mdOut, 'utf8')
    await writeFile(htmlPath, htmlOut, 'utf8')
    written.push(mdPath, htmlPath)
  }

  return { ok: true, writtenFiles: written }
}
