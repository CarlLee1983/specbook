# `specbook doctor` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `specbook doctor` CLI subcommand that aggregates environment, project, content, optional-deps, and docs.user checks into a single structured `DoctorReport`, with both TTY and `--json` output.

**Architecture:** Thin CLI shell (`src/cli/doctor.ts`) calls a pure orchestrator (`src/doctor/run-doctor.ts`) that runs ordered checks. Each check is an independent module under `src/doctor/checks/`. Checks reuse existing `runValidate`, `detectGaps`, `validateUserDocs`, `loadConfig` — no logic duplication. Skip cascade for prerequisite failures keeps the report focused on root causes.

**Tech Stack:** TypeScript, Commander, vitest, Zod (already in use). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-16-doctor-design.md`

---

## File Map

### New files

- `src/doctor/types.ts` — `Severity`, `Category`, `DoctorFinding`, `DoctorReport`, `RunDoctorInput`
- `src/doctor/run-doctor.ts` — orchestrator (pure function)
- `src/doctor/format-text.ts` — TTY formatter
- `src/doctor/checks/node-version.ts`
- `src/doctor/checks/specbook-root.ts`
- `src/doctor/checks/config-loadable.ts`
- `src/doctor/checks/validate.ts` — thin wrapper over `runValidate`
- `src/doctor/checks/gaps.ts` — thin wrapper over `detectGaps`
- `src/doctor/checks/mermaid-playwright.ts`
- `src/doctor/checks/docs-user.ts` — thin wrapper over `validateUserDocs`
- `src/cli/doctor.ts` — Commander command factory
- `tests/doctor/run-doctor.test.ts`
- `tests/doctor/checks/node-version.test.ts`
- `tests/doctor/checks/mermaid-playwright.test.ts`
- `tests/doctor/checks/docs-user.test.ts`
- `tests/cli/doctor.test.ts`
- `tests/fixtures/doctor/happy/` (and 5 sibling fixture dirs)

### Modified files

- `src/cli/index.ts` — register `doctor` command
- `README.md` — Commands section adds `specbook doctor` line
- `docs/RELEASE-READINESS.md` — validation list adds doctor
- `docs/user/en/index.md` — `diagnostics-recovery` section recommends `doctor` first
- `docs/user/zh-TW/index.md` — same

---

## Conventions

- All check functions return `Promise<DoctorFinding[]>` (zero or more findings).
- All checks accept a context object (defined in Task 1).
- `info`-level findings are emitted for **passing** environment / project checks so `--verbose` can show them.
- `skipped.*` info findings are emitted by `run-doctor.ts`, not by the individual checks.
- All tests use vitest. CLI tests build first then spawn `dist/cli/index.js`.
- Commits use `<type>: [doctor] <subject>` style to match recent project history.

---

## Task 1: Define types

**Files:**
- Create: `src/doctor/types.ts`

- [ ] **Step 1: Write the types file**

```ts
// src/doctor/types.ts
export type Severity = 'error' | 'warn' | 'info'

export type Category =
  | 'environment'
  | 'project'
  | 'content'
  | 'optional-deps'
  | 'docs-user'

export interface DoctorFinding {
  id: string
  severity: Severity
  category: Category
  title: string
  detail?: string
  hint?: string
}

export interface DoctorReport {
  ok: boolean
  findings: DoctorFinding[]
  meta: {
    nodeVersion: string
    cwd: string
    specbookRoot: string
    durationMs: number
  }
}

export interface RunDoctorInput {
  root?: string
}

export interface ExecutionContext {
  specbookRoot: string
  projectRoot: string
  nodeVersion: string
  cwd: string
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/doctor/types.ts
git commit -m "feat: [doctor] add type definitions"
```

---

## Task 2: `node-version` check

**Files:**
- Create: `src/doctor/checks/node-version.ts`
- Test: `tests/doctor/checks/node-version.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/doctor/checks/node-version.test.ts
import { describe, it, expect } from 'vitest'
import { checkNodeVersion } from '../../../src/doctor/checks/node-version.js'

describe('checkNodeVersion', () => {
  it('returns error finding for Node < 20', async () => {
    const findings = await checkNodeVersion({ nodeVersion: 'v18.20.0' })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      id: 'node-version',
      severity: 'error',
      category: 'environment',
    })
    expect(findings[0].title).toContain('20')
  })

  it('returns info finding for Node 20', async () => {
    const findings = await checkNodeVersion({ nodeVersion: 'v20.11.0' })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      id: 'node-version',
      severity: 'info',
      category: 'environment',
    })
  })

  it('returns info finding for Node 22', async () => {
    const findings = await checkNodeVersion({ nodeVersion: 'v22.5.0' })
    expect(findings[0].severity).toBe('info')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/doctor/checks/node-version.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/doctor/checks/node-version.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/doctor/checks/node-version.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/doctor/checks/node-version.ts tests/doctor/checks/node-version.test.ts
git commit -m "feat: [doctor] add node-version check"
```

---

## Task 3: `specbook-root` check

**Files:**
- Create: `src/doctor/checks/specbook-root.ts`
- Test: (covered by integration tests in Task 9; check is too thin for a dedicated unit test)

- [ ] **Step 1: Write implementation**

```ts
// src/doctor/checks/specbook-root.ts
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/doctor/checks/specbook-root.ts
git commit -m "feat: [doctor] add specbook-root check"
```

---

## Task 4: `config-loadable` check

**Files:**
- Create: `src/doctor/checks/config-loadable.ts`

- [ ] **Step 1: Write implementation**

```ts
// src/doctor/checks/config-loadable.ts
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/doctor/checks/config-loadable.ts
git commit -m "feat: [doctor] add config-loadable check"
```

---

## Task 5: `validate` check

**Files:**
- Create: `src/doctor/checks/validate.ts`

- [ ] **Step 1: Write implementation**

```ts
// src/doctor/checks/validate.ts
import { runValidate } from '../../cli/validate.js'
import type { DoctorFinding, ExecutionContext } from '../types.js'

/** Parses "[area] message" into { area, message }. Falls back to area='content'. */
function parseValidateError(raw: string): { area: string; message: string } {
  const m = /^\[([^\]]+)\]\s*(.*)$/.exec(raw)
  if (m) return { area: m[1], message: m[2] }
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/doctor/checks/validate.ts
git commit -m "feat: [doctor] add validate check wrapper"
```

---

## Task 6: `gaps` check

**Files:**
- Create: `src/doctor/checks/gaps.ts`

- [ ] **Step 1: Write implementation**

```ts
// src/doctor/checks/gaps.ts
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/doctor/checks/gaps.ts
git commit -m "feat: [doctor] add gaps check wrapper"
```

---

## Task 7: `mermaid-playwright` check

**Files:**
- Create: `src/doctor/checks/mermaid-playwright.ts`
- Test: `tests/doctor/checks/mermaid-playwright.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/doctor/checks/mermaid-playwright.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkMermaidPlaywright } from '../../../src/doctor/checks/mermaid-playwright.js'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'doctor-mermaid-'))
  await mkdir(join(root, 'content'), { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const ctx = () => ({ specbookRoot: root })

describe('checkMermaidPlaywright', () => {
  it('returns no findings when no mermaid blocks exist', async () => {
    await writeFile(join(root, 'content/architecture.md'), '# No mermaid here')
    const findings = await checkMermaidPlaywright(ctx(), {
      tryImportPlaywright: async () => true,
    })
    expect(findings).toEqual([])
  })

  it('returns warn when mermaid present but playwright missing', async () => {
    await writeFile(
      join(root, 'content/architecture.md'),
      '# Hi\n\n```mermaid\ngraph TD; A-->B;\n```\n',
    )
    const findings = await checkMermaidPlaywright(ctx(), {
      tryImportPlaywright: async () => false,
    })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      id: 'mermaid-playwright',
      severity: 'warn',
      category: 'optional-deps',
    })
  })

  it('returns no findings when mermaid present and playwright installed', async () => {
    await writeFile(
      join(root, 'content/architecture.md'),
      '```mermaid\ngraph TD;\n```',
    )
    const findings = await checkMermaidPlaywright(ctx(), {
      tryImportPlaywright: async () => true,
    })
    expect(findings).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/doctor/checks/mermaid-playwright.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/doctor/checks/mermaid-playwright.ts
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DoctorFinding, ExecutionContext } from '../types.js'

export interface MermaidDeps {
  tryImportPlaywright: () => Promise<boolean>
}

async function defaultTryImportPlaywright(): Promise<boolean> {
  try {
    await import('playwright')
    return true
  } catch {
    return false
  }
}

async function hasMermaidBlock(contentDir: string): Promise<boolean> {
  let entries: string[]
  try {
    entries = await readdir(contentDir)
  } catch {
    return false
  }
  for (const name of entries) {
    if (!name.endsWith('.md')) continue
    const text = await readFile(join(contentDir, name), 'utf8').catch(() => '')
    if (/```mermaid\b/.test(text)) return true
  }
  return false
}

export async function checkMermaidPlaywright(
  ctx: Pick<ExecutionContext, 'specbookRoot'>,
  deps: MermaidDeps = { tryImportPlaywright: defaultTryImportPlaywright },
): Promise<DoctorFinding[]> {
  const contentDir = join(ctx.specbookRoot, 'content')
  const mermaidPresent = await hasMermaidBlock(contentDir)
  if (!mermaidPresent) return []
  const playwrightInstalled = await deps.tryImportPlaywright()
  if (playwrightInstalled) return []
  return [
    {
      id: 'mermaid-playwright',
      severity: 'warn',
      category: 'optional-deps',
      title: 'Mermaid blocks detected but `playwright` is not installed',
      hint: 'Run `pnpm add -D playwright` to enable Mermaid rendering at build time.',
    },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/doctor/checks/mermaid-playwright.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/doctor/checks/mermaid-playwright.ts tests/doctor/checks/mermaid-playwright.test.ts
git commit -m "feat: [doctor] add mermaid-playwright check"
```

---

## Task 8: `docs-user` check

**Files:**
- Create: `src/doctor/checks/docs-user.ts`
- Test: `tests/doctor/checks/docs-user.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/doctor/checks/docs-user.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkDocsUser } from '../../../src/doctor/checks/docs-user.js'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'doctor-docs-user-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('checkDocsUser', () => {
  it('returns no findings when docs.user is not enabled', async () => {
    const findings = await checkDocsUser({
      projectRoot: root,
      docsUserEnabled: false,
      docsUserConfig: null,
    })
    expect(findings).toEqual([])
  })

  it('returns error findings when docs.user is enabled and validation fails', async () => {
    // No docs/user/ at all → validateUserDocs reports missingFile errors
    const findings = await checkDocsUser({
      projectRoot: root,
      docsUserEnabled: true,
      docsUserConfig: {
        enabled: true,
        locales: ['en'],
        coverage: 'all',
        theme: 'anthropic-warm',
      },
    })
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0]).toMatchObject({
      severity: 'error',
      category: 'docs-user',
    })
  })

  it('returns no findings when coverage is empty array', async () => {
    await mkdir(join(root, 'docs/user/en'), { recursive: true })
    const findings = await checkDocsUser({
      projectRoot: root,
      docsUserEnabled: true,
      docsUserConfig: {
        enabled: true,
        locales: ['en'],
        coverage: [],
        theme: 'anthropic-warm',
      },
    })
    expect(findings).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/doctor/checks/docs-user.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/doctor/checks/docs-user.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/doctor/checks/docs-user.test.ts`
Expected: PASS (3 tests). Note: if `DocsUserConfig.coverage` type rejects `[]` in test 3, look up the actual zod schema (`src/schema/docs.ts`) and use a value the type accepts (e.g. cast through `as unknown as DocsUserConfig` only as a last resort — preferred is updating the test to use a valid empty-coverage form).

- [ ] **Step 5: Commit**

```bash
git add src/doctor/checks/docs-user.ts tests/doctor/checks/docs-user.test.ts
git commit -m "feat: [doctor] add docs-user check"
```

---

## Task 9: `runDoctor` orchestrator + fixtures

**Files:**
- Create: `src/doctor/run-doctor.ts`
- Create: `tests/doctor/run-doctor.test.ts`
- Create: `tests/fixtures/doctor/happy/`, `no-specbook/`, `bad-config/`, `schema-error/`, `has-gaps/`, `mermaid-without-playwright/`

- [ ] **Step 1: Create the `happy` fixture (manual)**

The simplest path: copy the existing `tests/fixtures/partial-specbook` layout, then edit content to bypass `detectGaps` placeholder regex.

```bash
mkdir -p tests/fixtures/doctor/happy
cp -R tests/fixtures/partial-specbook/.specbook tests/fixtures/doctor/happy/.specbook
cp tests/fixtures/partial-specbook/package.json tests/fixtures/doctor/happy/package.json
```

Now edit these four files so none of the placeholder regexes in `src/gaps/detect-gaps.ts` match:

- `tests/fixtures/doctor/happy/.specbook/content/overview.md`: replace the body so it contains neither `在這裡寫一段 1-3 段的散文` nor `這段文字會以 hero 區呈現在 SpecBook 站首屏`. Example body: `Real overview content for the happy fixture.`
- `tests/fixtures/doctor/happy/.specbook/content/architecture.md`: replace body so it does not contain `在這裡描述系統的整體架構`. Example: `Architecture: single-process Node CLI.`
- `tests/fixtures/doctor/happy/.specbook/content/user-stories.yaml`: ensure stringified YAML does not contain `主要使用者角色`, `次要使用者`, or `第三類使用者`. Replace placeholder personas with real-looking names (e.g. `persona: "developer"`).
- `tests/fixtures/doctor/happy/.specbook/content/roadmap.yaml`: ensure stringified YAML does not contain `M1 — 起手` or `第一個工作項`. Replace milestone names with concrete strings (e.g. `name: "Initial release"`).

Both `overview.md` and `architecture.md` keep their existing frontmatter; only the body needs editing.

- [ ] **Step 2: Create the other 5 fixtures**

```bash
# no-specbook
mkdir -p tests/fixtures/doctor/no-specbook
echo '{ "name": "doctor-no-specbook", "version": "0.0.0" }' > tests/fixtures/doctor/no-specbook/package.json

# bad-config
mkdir -p tests/fixtures/doctor/bad-config/.specbook
echo '{ "name": "doctor-bad-config", "version": "0.0.0" }' > tests/fixtures/doctor/bad-config/package.json
cat > tests/fixtures/doctor/bad-config/.specbook/specbook.config.ts <<'EOF'
throw new Error('intentional load failure for doctor bad-config fixture')
EOF

# schema-error: copy happy, then break overview frontmatter
cp -R tests/fixtures/doctor/happy tests/fixtures/doctor/schema-error
# Manually edit tests/fixtures/doctor/schema-error/.specbook/content/overview.md
# and remove the `title:` line from the frontmatter so loadOverview throws.

# has-gaps: copy happy, then restore one placeholder regex hit in user-stories.yaml
cp -R tests/fixtures/doctor/happy tests/fixtures/doctor/has-gaps
# Manually edit tests/fixtures/doctor/has-gaps/.specbook/content/user-stories.yaml
# so its stringified content contains "主要使用者角色" (e.g. add it as a value
# in a string field). detectGaps will flag user-stories.

# mermaid-without-playwright: copy happy, append a mermaid block
cp -R tests/fixtures/doctor/happy tests/fixtures/doctor/mermaid-without-playwright
cat >> tests/fixtures/doctor/mermaid-without-playwright/.specbook/content/architecture.md <<'MEOF'

```mermaid
graph TD
  A --> B
```
MEOF
```

- [ ] **Step 3: Write the failing orchestrator test**

```ts
// tests/doctor/run-doctor.test.ts
import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runDoctor } from '../../src/doctor/run-doctor.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIX = (name: string) =>
  resolve(__dirname, '../fixtures/doctor', name, '.specbook')

describe('runDoctor', () => {
  it('happy: ok=true, no error findings', async () => {
    const report = await runDoctor({ root: FIX('happy') })
    expect(report.ok).toBe(true)
    expect(report.findings.filter((f) => f.severity === 'error')).toEqual([])
    expect(report.meta.specbookRoot).toContain('happy/.specbook')
  })

  it('no-specbook: specbook-missing error + skipped infos', async () => {
    const report = await runDoctor({ root: FIX('no-specbook') })
    expect(report.ok).toBe(false)
    const ids = report.findings.map((f) => f.id)
    expect(ids).toContain('specbook-missing')
    expect(ids).toContain('skipped.config')
    expect(ids).toContain('skipped.validate')
    expect(ids).toContain('skipped.gaps')
  })

  it('bad-config: config-loadable error + skipped infos', async () => {
    const report = await runDoctor({ root: FIX('bad-config') })
    expect(report.ok).toBe(false)
    const ids = report.findings.map((f) => f.id)
    expect(ids).toContain('config-loadable')
    expect(ids).toContain('skipped.validate')
  })

  it('schema-error: validate.overview error', async () => {
    const report = await runDoctor({ root: FIX('schema-error') })
    expect(report.ok).toBe(false)
    const errorIds = report.findings
      .filter((f) => f.severity === 'error')
      .map((f) => f.id)
    expect(errorIds.some((id) => id.startsWith('validate.'))).toBe(true)
  })

  it('has-gaps: warn but ok=true', async () => {
    const report = await runDoctor({ root: FIX('has-gaps') })
    expect(report.ok).toBe(true)
    const warnIds = report.findings
      .filter((f) => f.severity === 'warn')
      .map((f) => f.id)
    expect(warnIds.some((id) => id.startsWith('gaps.'))).toBe(true)
  })

  it('mermaid-without-playwright: warn but ok=true', async () => {
    const report = await runDoctor({
      root: FIX('mermaid-without-playwright'),
      tryImportPlaywright: async () => false,
    })
    expect(report.ok).toBe(true)
    const ids = report.findings.map((f) => f.id)
    expect(ids).toContain('mermaid-playwright')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test tests/doctor/run-doctor.test.ts`
Expected: FAIL (`runDoctor` not exported).

- [ ] **Step 5: Write the orchestrator**

```ts
// src/doctor/run-doctor.ts
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

  // 1. node-version
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

  // 2. specbook-root
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

  // 3. config-loadable
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

  // 4-7 run in order (sequential; volume is tiny and avoids race conditions)
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

  // Re-load config (already validated loadable) to read docs.user
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test tests/doctor/run-doctor.test.ts`
Expected: PASS (6 tests). If a fixture-driven assertion fails, re-read the failing fixture and adjust its content; the test is the source of truth for expected behaviour.

- [ ] **Step 7: Commit**

```bash
git add src/doctor/run-doctor.ts tests/doctor/run-doctor.test.ts tests/fixtures/doctor/
git commit -m "feat: [doctor] add run-doctor orchestrator + fixtures"
```

---

## Task 10: TTY formatter

**Files:**
- Create: `src/doctor/format-text.ts`

- [ ] **Step 1: Write implementation**

```ts
// src/doctor/format-text.ts
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
      // hide environment passing info in non-verbose mode
      if (key === 'environment') return false
      // hide generic skipped.* in non-verbose mode — the upstream error already explains why
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/doctor/format-text.ts
git commit -m "feat: [doctor] add TTY formatter"
```

---

## Task 11: CLI command + index registration + CLI tests

**Files:**
- Create: `src/cli/doctor.ts`
- Modify: `src/cli/index.ts` (register command)
- Create: `tests/cli/doctor.test.ts`

- [ ] **Step 1: Write CLI command file**

```ts
// src/cli/doctor.ts
import { Command } from 'commander'
import { resolve } from 'node:path'
import { runDoctor } from '../doctor/run-doctor.js'
import { formatReport } from '../doctor/format-text.js'

export function createDoctorCommand(): Command {
  return new Command('doctor')
    .description('Diagnose environment, project, and content health')
    .option('-r, --root <dir>', 'Path to .specbook directory', '.specbook')
    .option('--json', 'Emit JSON to stdout', false)
    .option('--verbose', 'Show passing checks', false)
    .action(
      async (opts: { root: string; json: boolean; verbose: boolean }) => {
        try {
          const report = await runDoctor({
            root: resolve(process.cwd(), opts.root),
          })
          if (opts.json) {
            process.stdout.write(JSON.stringify(report, null, 2) + '\n')
          } else {
            process.stdout.write(
              formatReport(report, { verbose: opts.verbose }) + '\n',
            )
          }
          process.exit(report.ok ? 0 : 1)
        } catch (e) {
          process.stderr.write(
            `doctor crashed: ${e instanceof Error ? e.message : String(e)}\n`,
          )
          process.exit(2)
        }
      },
    )
}
```

- [ ] **Step 2: Register in `src/cli/index.ts`**

Open `src/cli/index.ts` and make two edits:

1. Near the top, after `import { createDocsCommand } from './docs.js'`, add:
   ```ts
   import { createDoctorCommand } from './doctor.js'
   ```
2. After the existing `program.addCommand(createDocsCommand())` line and before `program.parseAsync(...)`, add:
   ```ts
   program.addCommand(createDoctorCommand())
   ```

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: PASS (typecheck + asset copy).

- [ ] **Step 4: Write the CLI test (and run, expecting PASS since build is already done)**

```ts
// tests/cli/doctor.test.ts
import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI = resolve(__dirname, '../../dist/cli/index.js')
const FIX = (name: string) => resolve(__dirname, '../fixtures/doctor', name)

function runCli(args: string[], cwd: string) {
  return spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf8' })
}

describe('specbook doctor CLI', () => {
  it('--help shows flags', () => {
    const r = runCli(['doctor', '--help'], FIX('happy'))
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('--json')
    expect(r.stdout).toContain('--verbose')
  })

  it('happy: exits 0, prints Summary', () => {
    const r = runCli(['doctor'], FIX('happy'))
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('Summary:')
  })

  it('no-specbook: exits 1, mentions specbook-missing', () => {
    const r = runCli(['doctor'], FIX('no-specbook'))
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('specbook-missing')
  })

  it('--json: emits valid JSON with top-level keys', () => {
    const r = runCli(['doctor', '--json'], FIX('happy'))
    expect(r.status).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(parsed).toHaveProperty('ok')
    expect(parsed).toHaveProperty('findings')
    expect(parsed).toHaveProperty('meta')
    expect(parsed.meta).toHaveProperty('nodeVersion')
    expect(parsed.meta).toHaveProperty('specbookRoot')
    expect(parsed.meta).toHaveProperty('durationMs')
  })

  it('--verbose: shows Node version line; default mode hides it', () => {
    const rDefault = runCli(['doctor'], FIX('happy'))
    const rVerbose = runCli(['doctor', '--verbose'], FIX('happy'))
    expect(rVerbose.stdout).toContain('Node version')
    expect(rDefault.stdout).not.toContain('Node version ')
  })
})
```

- [ ] **Step 5: Run the CLI test**

Run: `pnpm test tests/cli/doctor.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/cli/doctor.ts src/cli/index.ts tests/cli/doctor.test.ts
git commit -m "feat: [cli] register doctor subcommand"
```

---

## Task 12: Documentation updates

**Files:**
- Modify: `README.md`
- Modify: `docs/RELEASE-READINESS.md`
- Modify: `docs/user/en/index.md`
- Modify: `docs/user/zh-TW/index.md`

- [ ] **Step 1: Update README.md**

Open `README.md`, locate the existing Commands section (search for the line beginning with `- \`specbook init\`` or similar). Insert a new bullet after `specbook gaps` (or wherever the `gaps` bullet lives):

```markdown
- `specbook doctor` — Aggregate health check (environment, schemas, gaps, optional deps). `--json` for machine-readable output, `--verbose` for passing checks.
```

- [ ] **Step 2: Update `docs/RELEASE-READINESS.md`**

In the file's "目前成效" numbered list (currently items 1–6), append:

```markdown
7. `specbook doctor`：聚合 environment / `.specbook` / schemas / gaps / optional deps / docs.user 檢查，輸出統一報告，支援 `--json` 與 `--verbose`。
```

Do NOT update the recorded test count yet — Task 13 verifies the new total and updates this number with the real value.

- [ ] **Step 3: Update `docs/user/en/index.md` diagnostics section**

Search for the heading `## Diagnostics / recovery` (around line 138). Replace the existing first paragraph (the one that begins `When dev or build prints errors, or the rendered site looks off, start with validate to find schema issues:` and the immediately following `npx specbook validate` block) with:

````markdown
When `dev` or `build` prints errors, or the rendered site looks off, start with `doctor` for an aggregated report:

```bash
npx specbook doctor
```

`doctor` runs environment checks (Node version, `.specbook/` presence, config loadability), schema validation, gap detection, and optional-dependency checks in one pass. Use `--json` for machine-readable output that AI agents can consume; use `--verbose` to also show passing checks.

If you need to drill into schemas directly:

```bash
npx specbook validate
```
````

Keep all subsequent paragraphs in the section untouched (the "Common errors" list, `gaps` paragraph, `init --force` paragraph, and final "Still stuck?" line all stay the same).

- [ ] **Step 4: Update `docs/user/zh-TW/index.md` diagnostics section**

Search for `## 診斷與修復` (around line 138). Replace the first paragraph + `validate` code block analogously:

````markdown
當 `dev` 或 `build` 印出錯誤，或網站長相不對時，先跑 `doctor` 看聚合報告：

```bash
npx specbook doctor
```

`doctor` 會一次跑完環境檢查（Node 版本、`.specbook/` 是否存在、config 能否載入）、schema 驗證、缺口偵測與可選依賴檢查。AI agent 可用 `--json` 取得結構化輸出；`--verbose` 會額外顯示通過的檢查。

若需要直接看 schema 細節：

```bash
npx specbook validate
```
````

Leave all subsequent zh-TW paragraphs untouched.

- [ ] **Step 5: Sync the HTML mirrors**

Run: `pnpm docs:check`
Expected: It will either pass (the HTML mirrors are auto-synced) or report drift between `.md` and `.html`. If it reports drift:

1. Open `docs/user/en/index.html`. Find the element `<section data-doc-key="diagnostics-recovery">` (or `<!-- doc-key: diagnostics-recovery -->` marker). Replace the prose inside to match the new Markdown content from Step 3 (rendered to HTML — paragraphs, code blocks for the `npx specbook doctor` and `npx specbook validate` commands).
2. Do the same for `docs/user/zh-TW/index.html` using the zh-TW prose from Step 4.
3. Re-run `pnpm docs:check`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add README.md docs/RELEASE-READINESS.md docs/user/en/index.md docs/user/zh-TW/index.md docs/user/en/index.html docs/user/zh-TW/index.html
git commit -m "docs: [doctor] mention doctor in README, release readiness, and user docs"
```

---

## Task 13: Final verification

**Files:** (none modified — verification only, except possibly RELEASE-READINESS in Step 7)

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: PASS. Count the new total (previous baseline 199 + roughly 20 new = roughly 219). Record the exact numbers.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS (this project's `lint` is `pnpm typecheck`).

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Run packaging smoke test**

Run: `pnpm test:packaging`
Expected: PASS.

- [ ] **Step 5: Run pack:check**

Run: `pnpm pack:check`
Expected: PASS.

- [ ] **Step 6: Manual CLI smoke test**

Run the following commands from the project root:

```bash
node dist/cli/index.js doctor -r tests/fixtures/doctor/happy/.specbook
echo "---"
node dist/cli/index.js doctor -r tests/fixtures/doctor/no-specbook/.specbook
echo "---"
node dist/cli/index.js doctor --json -r tests/fixtures/doctor/happy/.specbook
echo "---"
node dist/cli/index.js doctor --verbose -r tests/fixtures/doctor/happy/.specbook
```

Expected:
1. exits 0, prints `Summary: 0 errors, 0 warnings.`
2. exits 1, prints a line containing `[specbook-missing] .specbook/ not found`
3. prints a JSON object containing `"ok": true`
4. shows `✓ [node-version] Node version ...` inside the `Environment` section

- [ ] **Step 7: Update RELEASE-READINESS test count**

Edit `docs/RELEASE-READINESS.md` and update the lines under "最近一次驗證結果" with the real numbers recorded in Step 1 (e.g. change `Test Files  52 passed (52)` and `Tests       199 passed (199)` to the new totals). Also update the date in the heading to `2026-05-16`.

```bash
git add docs/RELEASE-READINESS.md
git commit -m "docs: [release] sync test count after doctor"
```

(Skip the commit if the count was already accurate.)

---

## Notes on commit hygiene

- Each task commits independently. If a later step fails, prior commits remain safe.
- If a fixture step in Task 9 needs adjustment (placeholder regex matches differently than expected), amend the fixture and re-run `pnpm test`; commit fixture fixes as `chore: [doctor] adjust fixture for ...`.
- Do not skip pre-commit hooks. If lint / typecheck fails, fix the root cause; never use `--no-verify`.

## Out of scope (explicitly deferred — do not implement here)

- `--fix` flag (auto-repair).
- `--strict` flag (warn → error promotion).
- Coloured output / chalk dependency.
- Per-check `--only` / `--skip` filters.
- Localised doctor output (English-only by design — short diagnostic strings aimed at agents and devs).
