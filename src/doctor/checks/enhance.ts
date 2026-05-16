import { detectEnhanceItems } from '../../enhance/detect.js'
import type { DoctorFinding, ExecutionContext } from '../types.js'

export async function checkEnhance(
  ctx: Pick<ExecutionContext, 'specbookRoot'>,
): Promise<DoctorFinding[]> {
  let report
  try {
    report = await detectEnhanceItems(ctx.specbookRoot)
  } catch {
    return []
  }
  if (report.ok) {
    return [
      {
        id: 'enhance',
        severity: 'info',
        category: 'content',
        title: 'No enhancement opportunities detected',
      },
    ]
  }
  return report.items.map((it) => ({
    id: `enhance.${it.section}`,
    severity: 'warn' as const,
    category: 'content' as const,
    title: it.problem,
    detail: it.path ? `${it.section} › ${it.path}` : `Section: ${it.section}`,
    hint: 'Run `/specbook enhance` to fill in.',
  }))
}
