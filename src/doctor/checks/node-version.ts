import type { DoctorFinding, ExecutionContext } from '../types.js'

const MIN_MAJOR = 20

export async function checkNodeVersion(
  ctx: Pick<ExecutionContext, 'nodeVersion'>,
): Promise<DoctorFinding[]> {
  const match = /^v(\d+)\./.exec(ctx.nodeVersion)
  const major = match ? Number(match[1]) : 0
  if (major < MIN_MAJOR) {
    return [
      {
        id: 'node-version',
        severity: 'error',
        category: 'environment',
        title: `Node ${ctx.nodeVersion} is below the required v${MIN_MAJOR}`,
        hint: `Upgrade to Node ${MIN_MAJOR} or newer (see package.json "engines").`,
      },
    ]
  }
  return [
    {
      id: 'node-version',
      severity: 'info',
      category: 'environment',
      title: `Node version ${ctx.nodeVersion.replace(/^v/, '')}`,
    },
  ]
}
