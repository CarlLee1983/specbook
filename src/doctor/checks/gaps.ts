import { detectGaps } from '../../gaps/detect-gaps.js'
import type { DoctorFinding, ExecutionContext } from '../types.js'

export async function checkGaps(
  ctx: Pick<ExecutionContext, 'specbookRoot'>,
): Promise<DoctorFinding[]> {
  const report = await detectGaps(ctx.specbookRoot)
  if (report.ok) {
    return [
      {
        id: 'gaps',
        severity: 'info',
        category: 'content',
        title: 'No gaps detected',
      },
    ]
  }
  return report.gaps.map((g) => ({
    id: `gaps.${g.section}`,
    severity: 'warn' as const,
    category: 'content' as const,
    title: g.reason,
    detail: `Section: ${g.section}`,
    hint: 'Run `specbook gaps` or `/specbook enhance` to fill in.',
  }))
}
