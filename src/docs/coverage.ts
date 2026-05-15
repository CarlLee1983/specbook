export const ALL_CATEGORIES = [
  'install-setup',
  'connections',
  'discovery-read',
  'writes-mutations',
  'advanced-tools',
  'diagnostics-recovery',
  'engine-support',
  'ai-integration',
  'visual-surfaces',
  'documentation-maintenance',
] as const

export type Category = (typeof ALL_CATEGORIES)[number]

export const OVERVIEW_KEY = 'overview' as const

export type CoverageResult =
  | { keys: readonly string[] }
  | { error: string }

export function resolveCoverage(
  coverage: 'all' | readonly string[],
): CoverageResult {
  if (coverage === 'all') {
    return { keys: [OVERVIEW_KEY, ...ALL_CATEGORIES] }
  }
  const invalid = coverage.filter(
    (k) => !ALL_CATEGORIES.includes(k as Category),
  )
  if (invalid.length > 0) {
    return { error: `Invalid coverage doc-keys: ${invalid.join(', ')}` }
  }
  return { keys: [OVERVIEW_KEY, ...coverage] }
}

export type NormalizeFlagResult = 'all' | string[] | { error: string }

export function normalizeCoverageFlag(input: string): NormalizeFlagResult {
  const trimmed = input.trim()
  if (trimmed === 'all') return 'all'
  if (trimmed === '') return { error: 'coverage cannot be empty' }

  const parts = trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) return { error: 'coverage cannot be empty' }

  const allNumeric = parts.every((p) => /^\d+$/.test(p))
  const allKebab = parts.every((p) => /^[a-z][a-z0-9-]*$/.test(p))

  if (!allNumeric && !allKebab) {
    return { error: 'coverage must be all-numeric or all-kebab-case, not mixed' }
  }

  if (allNumeric) {
    const result: string[] = []
    for (const p of parts) {
      const n = Number(p)
      if (n < 1 || n > ALL_CATEGORIES.length) {
        return {
          error: `coverage index out of range: ${n} (valid 1-${ALL_CATEGORIES.length})`,
        }
      }
      result.push(ALL_CATEGORIES[n - 1]!)
    }
    return result
  }

  return parts
}
