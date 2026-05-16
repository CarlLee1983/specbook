import type { DocsUserConfig } from '../schema/docs.js'

export type PatchConfigResult =
  | { kind: 'patched'; text: string }
  | { kind: 'skipped' }
  | { kind: 'unparseable'; reason: string }

export function patchConfig(
  source: string,
  _docsUser: DocsUserConfig,
): PatchConfigResult {
  if (!/export\s+default\s+defineConfig\s*\(\s*\{/.test(source)) {
    return { kind: 'unparseable', reason: 'defineConfig({...}) not found' }
  }
  return { kind: 'unparseable', reason: 'not implemented yet' }
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
