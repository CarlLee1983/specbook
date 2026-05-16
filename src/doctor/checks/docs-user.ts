import { join } from 'node:path'
import { validateUserDocs } from '../../docs/validator.js'
import type { DocsUserConfig } from '../../schema/docs.js'
import type { DoctorFinding } from '../types.js'

export interface DocsUserCheckCtx {
  projectRoot: string
  docsUserEnabled: boolean
  docsUserConfig: DocsUserConfig | null
}

export async function checkDocsUser(
  ctx: DocsUserCheckCtx,
): Promise<DoctorFinding[]> {
  if (!ctx.docsUserEnabled || !ctx.docsUserConfig) return []
  const rootDir = join(ctx.projectRoot, 'docs/user/')
  const result = await validateUserDocs(rootDir, ctx.docsUserConfig)
  if (result.ok) return []
  return result.errors.map((err) => ({
    id: `docs-user.${err.token.replace(/^docs\.user\./, '')}`,
    severity: 'error' as const,
    category: 'docs-user' as const,
    title: err.token,
    detail: JSON.stringify(err),
    hint: 'Run `specbook docs validate` for details, or `specbook docs init` to scaffold.',
  }))
}
