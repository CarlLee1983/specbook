import { runValidate } from '../../cli/validate.js'
import type { DoctorFinding, ExecutionContext } from '../types.js'

function parseValidateError(raw: string): { area: string; message: string } {
  const m = /^\[([^\]]+)\]\s*(.*)$/.exec(raw)
  if (m && m[1] !== undefined && m[2] !== undefined) {
    return { area: m[1], message: m[2] }
  }
  return { area: 'content', message: raw }
}

export async function checkValidate(
  ctx: Pick<ExecutionContext, 'specbookRoot'>,
): Promise<DoctorFinding[]> {
  const result = await runValidate(ctx.specbookRoot)
  if (result.ok) {
    return [
      {
        id: 'validate',
        severity: 'info',
        category: 'content',
        title: 'All content valid',
      },
    ]
  }
  return result.errors.map((raw) => {
    const { area, message } = parseValidateError(raw)
    return {
      id: `validate.${area}`,
      severity: 'error' as const,
      category: 'content' as const,
      title: message || `Validation failed in ${area}`,
      detail: raw,
      hint: `Open .specbook/content/${area}.* and fix the field mentioned above.`,
    }
  })
}
