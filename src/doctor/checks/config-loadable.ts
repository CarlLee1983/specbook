import { resolve } from 'node:path'
import { loadConfig } from '../../content/load-config.js'
import type { DoctorFinding, ExecutionContext } from '../types.js'

export async function checkConfigLoadable(
  ctx: Pick<ExecutionContext, 'specbookRoot'>,
): Promise<DoctorFinding[]> {
  const configPath = resolve(ctx.specbookRoot, 'specbook.config.ts')
  try {
    await loadConfig(configPath)
    return [
      {
        id: 'config-loadable',
        severity: 'info',
        category: 'project',
        title: 'specbook.config.ts loaded',
      },
    ]
  } catch (e) {
    return [
      {
        id: 'config-loadable',
        severity: 'error',
        category: 'project',
        title: 'Failed to load specbook.config.ts',
        detail: e instanceof Error ? e.message : String(e),
        hint: 'Inspect specbook.config.ts for syntax / import errors.',
      },
    ]
  }
}
