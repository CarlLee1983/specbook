import { existsSync } from 'node:fs'
import type { DoctorFinding, ExecutionContext } from '../types.js'

export async function checkSpecbookRoot(
  ctx: Pick<ExecutionContext, 'specbookRoot'>,
): Promise<DoctorFinding[]> {
  if (!existsSync(ctx.specbookRoot)) {
    return [
      {
        id: 'specbook-missing',
        severity: 'error',
        category: 'project',
        title: `.specbook/ not found at ${ctx.specbookRoot}`,
        hint: 'Run `specbook init` to scaffold the project.',
      },
    ]
  }
  return [
    {
      id: 'specbook-root',
      severity: 'info',
      category: 'project',
      title: `.specbook/ found at ${ctx.specbookRoot}`,
    },
  ]
}
