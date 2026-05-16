import { resolve, dirname } from 'node:path'
import { loadConfig } from '../content/load-config.js'
import { checkNodeVersion } from './checks/node-version.js'
import { checkSpecbookRoot } from './checks/specbook-root.js'
import { checkConfigLoadable } from './checks/config-loadable.js'
import { checkValidate } from './checks/validate.js'
import { checkGaps } from './checks/gaps.js'
import {
  checkMermaidPlaywright,
  type MermaidDeps,
} from './checks/mermaid-playwright.js'
import { checkDocsUser } from './checks/docs-user.js'
import type {
  Category,
  DoctorFinding,
  DoctorReport,
  ExecutionContext,
  RunDoctorInput,
} from './types.js'

export interface RunDoctorDeps {
  tryImportPlaywright?: MermaidDeps['tryImportPlaywright']
}

function skipped(
  id: string,
  reason: string,
  category: Category,
): DoctorFinding {
  return {
    id: `skipped.${id}`,
    severity: 'info',
    category,
    title: `Skipped: ${reason}`,
  }
}

export async function runDoctor(
  input: RunDoctorInput & RunDoctorDeps = {},
): Promise<DoctorReport> {
  const started = Date.now()
  const cwd = process.cwd()
  const specbookRoot = resolve(input.root ?? resolve(cwd, '.specbook'))
  const projectRoot = dirname(specbookRoot)
  const ctx: ExecutionContext = {
    specbookRoot,
    projectRoot,
    nodeVersion: process.version,
    cwd,
  }
  const findings: DoctorFinding[] = []

  const nodeFindings = await checkNodeVersion(ctx)
  findings.push(...nodeFindings)
  if (nodeFindings.some((f) => f.severity === 'error')) {
    findings.push(
      skipped('specbook-root', 'Node version too old', 'project'),
      skipped('config', 'Node version too old', 'project'),
      skipped('validate', 'Node version too old', 'content'),
      skipped('gaps', 'Node version too old', 'content'),
      skipped('mermaid-playwright', 'Node version too old', 'optional-deps'),
      skipped('docs-user', 'Node version too old', 'docs-user'),
    )
    return finalize(findings, ctx, started)
  }

  const rootFindings = await checkSpecbookRoot(ctx)
  findings.push(...rootFindings)
  if (rootFindings.some((f) => f.severity === 'error')) {
    findings.push(
      skipped('config', '.specbook/ missing', 'project'),
      skipped('validate', '.specbook/ missing', 'content'),
      skipped('gaps', '.specbook/ missing', 'content'),
      skipped('mermaid-playwright', '.specbook/ missing', 'optional-deps'),
      skipped('docs-user', '.specbook/ missing', 'docs-user'),
    )
    return finalize(findings, ctx, started)
  }

  const configFindings = await checkConfigLoadable(ctx)
  findings.push(...configFindings)
  if (configFindings.some((f) => f.severity === 'error')) {
    findings.push(
      skipped('validate', 'config could not be loaded', 'content'),
      skipped('gaps', 'config could not be loaded', 'content'),
      skipped(
        'mermaid-playwright',
        'config could not be loaded',
        'optional-deps',
      ),
      skipped('docs-user', 'config could not be loaded', 'docs-user'),
    )
    return finalize(findings, ctx, started)
  }

  findings.push(...(await checkValidate(ctx)))
  findings.push(...(await checkGaps(ctx)))
  findings.push(
    ...(await checkMermaidPlaywright(
      ctx,
      input.tryImportPlaywright
        ? { tryImportPlaywright: input.tryImportPlaywright }
        : undefined,
    )),
  )

  const cfg = await loadConfig(resolve(specbookRoot, 'specbook.config.ts'))
  findings.push(
    ...(await checkDocsUser({
      projectRoot,
      docsUserEnabled: !!cfg.docs?.user?.enabled,
      docsUserConfig: cfg.docs?.user ?? null,
    })),
  )

  return finalize(findings, ctx, started)
}

function finalize(
  findings: DoctorFinding[],
  ctx: ExecutionContext,
  started: number,
): DoctorReport {
  const ok = findings.every((f) => f.severity !== 'error')
  return {
    ok,
    findings,
    meta: {
      nodeVersion: ctx.nodeVersion,
      cwd: ctx.cwd,
      specbookRoot: ctx.specbookRoot,
      durationMs: Date.now() - started,
    },
  }
}
