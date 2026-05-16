import type { Category, DoctorReport, Severity } from './types.js'

const SYMBOL: Record<Severity, string> = {
  error: '✗',
  warn: '⚠',
  info: '✓',
}

const SECTION_ORDER: { key: Category; label: string }[] = [
  { key: 'environment', label: 'Environment' },
  { key: 'project', label: 'Project' },
  { key: 'content', label: 'Content' },
  { key: 'optional-deps', label: 'Optional dependencies' },
  { key: 'docs-user', label: 'docs.user' },
]

export function formatReport(
  report: DoctorReport,
  opts: { verbose: boolean } = { verbose: false },
): string {
  const lines: string[] = []
  lines.push(
    `SpecBook doctor — ${report.meta.specbookRoot} (Node ${report.meta.nodeVersion})`,
    '',
  )

  for (const { key, label } of SECTION_ORDER) {
    const inSection = report.findings.filter((f) => f.category === key)
    if (inSection.length === 0) continue
    const visible = inSection.filter((f) => {
      if (opts.verbose) return true
      if (f.severity !== 'info') return true
      if (key === 'environment') return false
      if (f.id.startsWith('skipped.')) return false
      return true
    })
    if (visible.length === 0) continue
    lines.push(label)
    for (const f of visible) {
      lines.push(`  ${SYMBOL[f.severity]} [${f.id}] ${f.title}`)
      if (f.hint) lines.push(`      → ${f.hint}`)
    }
    lines.push('')
  }

  const errors = report.findings.filter((f) => f.severity === 'error').length
  const warns = report.findings.filter((f) => f.severity === 'warn').length
  lines.push(
    `Summary: ${errors} error${errors === 1 ? '' : 's'}, ${warns} warning${warns === 1 ? '' : 's'}.`,
  )
  return lines.join('\n')
}
