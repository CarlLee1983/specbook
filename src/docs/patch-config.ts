import type { DocsUserConfig } from '../schema/docs.js'

export type PatchConfigResult =
  | { kind: 'patched'; text: string }
  | { kind: 'skipped' }
  | { kind: 'unparseable'; reason: string }

export function patchConfig(
  source: string,
  _docsUser: DocsUserConfig,
): PatchConfigResult {
  const define = findDefineConfigBody(source)
  if (!define) {
    return { kind: 'unparseable', reason: 'defineConfig({...}) not found' }
  }
  const body = source.slice(define.bodyStart, define.bodyEnd)
  const docsRange = findTopLevelDocsBlock(body)
  if (docsRange) {
    if (/^ {4}user:/m.test(body.slice(docsRange.start, docsRange.end))) {
      return { kind: 'skipped' }
    }
    return {
      kind: 'unparseable',
      reason: 'existing docs block without user; will not edit nested object',
    }
  }
  return { kind: 'unparseable', reason: 'not implemented yet' }
}

interface DefineConfigBody {
  bodyStart: number
  bodyEnd: number
  closeStart: number
}

function findDefineConfigBody(source: string): DefineConfigBody | null {
  const m = source.match(/export\s+default\s+defineConfig\s*\(\s*\{/)
  if (!m || m.index === undefined) return null
  const bodyStart = m.index + m[0].length
  const closeMatch = source.slice(bodyStart).match(/\n\}\)\s*\n?\s*$/)
  if (!closeMatch || closeMatch.index === undefined) return null
  const closeStart = bodyStart + closeMatch.index + 1
  return { bodyStart, bodyEnd: closeStart, closeStart }
}

interface TopLevelKeyRange {
  start: number
  end: number
}

function findTopLevelDocsBlock(body: string): TopLevelKeyRange | null {
  const re = /^ {2}docs:\s*\{/m
  const m = body.match(re)
  if (!m || m.index === undefined) return null
  let depth = 1
  let i = m.index + m[0].length
  while (i < body.length && depth > 0) {
    const c = body[i]
    if (c === '{') depth++
    else if (c === '}') depth--
    i++
  }
  return { start: m.index, end: i }
}

export function renderDocsUserSnippet(
  locales: readonly string[],
  theme: string,
  coverage: 'all' | readonly string[],
): string {
  const localesLit = `[${locales.map((l) => `'${l}'`).join(', ')}]`
  const coverageLit =
    coverage === 'all'
      ? `'all'`
      : `[${coverage.map((k) => `'${k}'`).join(', ')}]`
  return [
    '  docs: {',
    '    user: {',
    '      enabled: true,',
    `      locales: ${localesLit},`,
    `      theme: '${theme}',`,
    `      coverage: ${coverageLit},`,
    '    },',
    '  },',
  ].join('\n')
}
