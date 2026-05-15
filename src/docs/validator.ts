import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DocsUserConfig } from '../schema/docs.js'
import { parseDocKeys, findDuplicates, ordersMatch } from './doc-keys.js'
import { resolveCoverage } from './coverage.js'

export type ValidationError =
  | { token: 'docs.user.invalidDocKey'; locale: string; file: string; key: string }
  | { token: 'docs.user.duplicateDocKey'; locale: string; file: string; key: string }
  | { token: 'docs.user.missingDocKey'; locale: string; key: string }
  | {
      token: 'docs.user.orderMismatch'
      locale: string
      position: number
      md: string | undefined
      html: string | undefined
    }
  | {
      token: 'docs.user.localeDriftDocKey'
      locale: string
      missing: readonly string[]
      extra: readonly string[]
    }
  | { token: 'docs.user.missingFile'; locale: string; path: string }

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] }

async function readMaybe(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

export async function validateUserDocs(
  rootDir: string,
  config: DocsUserConfig,
): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const coverage = resolveCoverage(config.coverage)
  if ('error' in coverage) {
    return { ok: false, errors: [] }
  }
  const requiredKeys = coverage.keys

  const perLocaleKeys: Record<string, string[]> = {}

  for (const locale of config.locales) {
    const mdPath = join(rootDir, locale, 'index.md')
    const htmlPath = join(rootDir, locale, 'index.html')

    const mdContent = await readMaybe(mdPath)
    const htmlContent = await readMaybe(htmlPath)

    if (mdContent === null) {
      errors.push({ token: 'docs.user.missingFile', locale, path: `${locale}/index.md` })
    }
    if (htmlContent === null) {
      errors.push({ token: 'docs.user.missingFile', locale, path: `${locale}/index.html` })
    }
    if (mdContent === null || htmlContent === null) continue

    const mdKeys = parseDocKeys(mdContent)
    const htmlKeys = parseDocKeys(htmlContent)

    for (const dup of findDuplicates(mdKeys)) {
      errors.push({ token: 'docs.user.duplicateDocKey', locale, file: 'index.md', key: dup })
    }
    for (const dup of findDuplicates(htmlKeys)) {
      errors.push({ token: 'docs.user.duplicateDocKey', locale, file: 'index.html', key: dup })
    }

    for (const k of requiredKeys) {
      if (!mdKeys.includes(k) || !htmlKeys.includes(k)) {
        errors.push({ token: 'docs.user.missingDocKey', locale, key: k })
      }
    }

    const order = ordersMatch(mdKeys, htmlKeys)
    if (!order.ok) {
      errors.push({
        token: 'docs.user.orderMismatch',
        locale,
        position: order.position,
        md: order.left,
        html: order.right,
      })
    }

    perLocaleKeys[locale] = mdKeys
  }

  const localeNames = Object.keys(perLocaleKeys)
  if (localeNames.length > 1) {
    const reference = new Set(perLocaleKeys[localeNames[0]!])
    for (const locale of localeNames.slice(1)) {
      const current = new Set(perLocaleKeys[locale]!)
      const missing = [...reference].filter((k) => !current.has(k))
      const extra = [...current].filter((k) => !reference.has(k))
      if (missing.length > 0 || extra.length > 0) {
        errors.push({ token: 'docs.user.localeDriftDocKey', locale, missing, extra })
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}
