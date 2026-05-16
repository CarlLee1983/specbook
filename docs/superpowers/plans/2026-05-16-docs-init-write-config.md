# `docs init --write-config` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `--write-config` flag to `specbook docs init` that patches `.specbook/specbook.config.ts` to insert a `docs.user` block after scaffolding `docs/user/*`.

**Architecture:** New pure function module `src/docs/patch-config.ts` does all string-level config patching with pattern detection (regex + shallow top-level key scan, no AST). The existing `src/cli/docs.ts` `init` action reads/writes the file and dispatches on patch result. Conservative fallback prints a manual snippet when the config shape is unrecognised.

**Tech Stack:** TypeScript, Node.js `fs/promises`, vitest, commander (existing CLI), Zod (existing schema), jiti (existing config loader). No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-05-16-docs-init-write-config-design.md`

---

## File Structure

**New files:**
- `src/docs/patch-config.ts` — pure function `patchConfig(source, docsUser)` returning `PatchConfigResult`; helper `renderDocsUserSnippet(locales, theme, coverage)`
- `tests/docs/patch-config.test.ts` — unit tests for `patchConfig` and `renderDocsUserSnippet`

**Modified files:**
- `src/cli/docs.ts` — add `--write-config` option on `init` subcommand; after successful scaffold, read config / call `patchConfig` / dispatch on result kind
- `tests/cli/docs.test.ts` — add four integration cases for `--write-config`

**Untouched:** `src/schema/*`, `src/scaffold/*`, `src/doctor/*`, `package.json` (no new deps).

---

## Task 1: Create `patch-config` module skeleton with types

**Files:**
- Create: `src/docs/patch-config.ts`
- Test: `tests/docs/patch-config.test.ts`

- [ ] **Step 1: Write the failing test (skeleton exists & exports types)**

Create `tests/docs/patch-config.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { patchConfig, renderDocsUserSnippet, type PatchConfigResult } from '../../src/docs/patch-config'
import type { DocsUserConfig } from '../../src/schema/docs'

const DEFAULT_DOCS_USER: DocsUserConfig = {
  enabled: true,
  locales: ['zh-TW', 'en'],
  theme: 'anthropic-warm',
  coverage: 'all',
}

describe('patchConfig', () => {
  it('returns unparseable when defineConfig is missing', () => {
    const src = `export const x = 1\n`
    const r: PatchConfigResult = patchConfig(src, DEFAULT_DOCS_USER)
    expect(r.kind).toBe('unparseable')
    if (r.kind === 'unparseable') {
      expect(r.reason).toContain('defineConfig')
    }
  })
})

describe('renderDocsUserSnippet', () => {
  it('renders a docs.user block with given values', () => {
    const out = renderDocsUserSnippet(['en'], 'anthropic-warm', 'all')
    expect(out).toContain("docs: {")
    expect(out).toContain("user: {")
    expect(out).toContain("enabled: true")
    expect(out).toContain("locales: ['en']")
    expect(out).toContain("theme: 'anthropic-warm'")
    expect(out).toContain("coverage: 'all'")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/docs/patch-config.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement minimal skeleton**

Create `src/docs/patch-config.ts`:

```ts
import type { DocsUserConfig } from '../schema/docs.js'

export type PatchConfigResult =
  | { kind: 'patched'; text: string }
  | { kind: 'skipped' }
  | { kind: 'unparseable'; reason: string }

export function patchConfig(
  source: string,
  _docsUser: DocsUserConfig,
): PatchConfigResult {
  if (!/export\s+default\s+defineConfig\s*\(\s*\{/.test(source)) {
    return { kind: 'unparseable', reason: 'defineConfig({...}) not found' }
  }
  return { kind: 'unparseable', reason: 'not implemented yet' }
}

export function renderDocsUserSnippet(
  locales: readonly string[],
  theme: string,
  coverage: 'all' | readonly string[],
): string {
  const localesLit = `[${locales.map((l) => `'${l}'`).join(', ')}]`
  const coverageLit =
    coverage === 'all'
      ? `'all'`
      : `[${coverage.map((k) => `'${k}'`).join(', ')}]`
  return [
    '  docs: {',
    '    user: {',
    '      enabled: true,',
    `      locales: ${localesLit},`,
    `      theme: '${theme}',`,
    `      coverage: ${coverageLit},`,
    '    },',
    '  },',
  ].join('\n')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/docs/patch-config.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/docs/patch-config.ts tests/docs/patch-config.test.ts
git commit -m "feat: [docs-cli] add patch-config skeleton with types and snippet helper"
```

---

## Task 2: Detect already-present `docs.user` → `skipped`

**Files:**
- Modify: `src/docs/patch-config.ts`
- Modify: `tests/docs/patch-config.test.ts`

- [ ] **Step 1: Add failing test for `skipped` case**

Append to `tests/docs/patch-config.test.ts` inside `describe('patchConfig', ...)`:

```ts
  it('returns skipped when docs.user already exists', () => {
    const src = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X',
  },
  docs: {
    user: {
      enabled: true,
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: 'all',
    },
  },
})
`
    const r = patchConfig(src, DEFAULT_DOCS_USER)
    expect(r.kind).toBe('skipped')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/docs/patch-config.test.ts`
Expected: FAIL — current stub returns `unparseable`.

- [ ] **Step 3: Implement docs.user detection**

Replace `patchConfig` in `src/docs/patch-config.ts`:

```ts
export function patchConfig(
  source: string,
  _docsUser: DocsUserConfig,
): PatchConfigResult {
  const define = findDefineConfigBody(source)
  if (!define) {
    return { kind: 'unparseable', reason: 'defineConfig({...}) not found' }
  }
  const body = source.slice(define.bodyStart, define.bodyEnd)
  const docsRange = findTopLevelDocsBlock(body)
  if (docsRange) {
    if (/^ {4}user:/m.test(body.slice(docsRange.start, docsRange.end))) {
      return { kind: 'skipped' }
    }
    return {
      kind: 'unparseable',
      reason: 'existing docs block without user; will not edit nested object',
    }
  }
  return { kind: 'unparseable', reason: 'not implemented yet' }
}

interface DefineConfigBody {
  bodyStart: number
  bodyEnd: number
  closeStart: number
}

function findDefineConfigBody(source: string): DefineConfigBody | null {
  const m = source.match(/export\s+default\s+defineConfig\s*\(\s*\{/)
  if (!m || m.index === undefined) return null
  const bodyStart = m.index + m[0].length
  const closeMatch = source.slice(bodyStart).match(/\n\}\)\s*\n?\s*$/)
  if (!closeMatch || closeMatch.index === undefined) return null
  const closeStart = bodyStart + closeMatch.index + 1
  return { bodyStart, bodyEnd: closeStart, closeStart }
}

interface TopLevelKeyRange {
  start: number
  end: number
}

function findTopLevelDocsBlock(body: string): TopLevelKeyRange | null {
  const re = /^ {2}docs:\s*\{/m
  const m = body.match(re)
  if (!m || m.index === undefined) return null
  let depth = 1
  let i = m.index + m[0].length
  while (i < body.length && depth > 0) {
    const c = body[i]
    if (c === '{') depth++
    else if (c === '}') depth--
    i++
  }
  return { start: m.index, end: i }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/docs/patch-config.test.ts`
Expected: PASS — all three tests green.

- [ ] **Step 5: Commit**

```bash
git add src/docs/patch-config.ts tests/docs/patch-config.test.ts
git commit -m "feat: [docs-cli] detect existing docs.user as skipped"
```

---

## Task 3: Detect `docs:` without `user:` → `unparseable`

**Files:**
- Modify: `tests/docs/patch-config.test.ts`

- [ ] **Step 1: Add failing test (conservative fall back)**

Append to `tests/docs/patch-config.test.ts` inside `describe('patchConfig', ...)`:

```ts
  it('returns unparseable when docs exists without user (conservative)', () => {
    const src = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X',
  },
  docs: {
    somethingElse: true,
  },
})
`
    const r = patchConfig(src, DEFAULT_DOCS_USER)
    expect(r.kind).toBe('unparseable')
    if (r.kind === 'unparseable') {
      expect(r.reason).toContain('without user')
    }
  })
```

- [ ] **Step 2: Run the test to verify it passes already**

Run: `pnpm vitest run tests/docs/patch-config.test.ts`
Expected: PASS — Task 2's logic already returns this case correctly. (TDD note: writing the test first locks behaviour in even when it incidentally passes.)

- [ ] **Step 3: Commit**

```bash
git add tests/docs/patch-config.test.ts
git commit -m "test: [docs-cli] cover docs-without-user unparseable case"
```

---

## Task 4: Insert `docs.user` block when missing → `patched`

**Files:**
- Modify: `src/docs/patch-config.ts`
- Modify: `tests/docs/patch-config.test.ts`

- [ ] **Step 1: Add failing tests for `patched` cases**

Append to `tests/docs/patch-config.test.ts` inside `describe('patchConfig', ...)`:

```ts
  it('patches a template config (no trailing comma on last key)', () => {
    const src = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X'
  }
})
`
    const r = patchConfig(src, DEFAULT_DOCS_USER)
    expect(r.kind).toBe('patched')
    if (r.kind === 'patched') {
      expect(r.text).toContain("docs: {")
      expect(r.text).toContain("user: {")
      expect(r.text).toContain("enabled: true,")
      expect(r.text).toContain("locales: ['zh-TW', 'en'],")
      // Last project key got a trailing comma added before insertion
      expect(r.text).toMatch(/name: 'X',?\n\s*\},/)
    }
  })

  it('patches a config with trailing comma on last key', () => {
    const src = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X',
  },
})
`
    const r = patchConfig(src, DEFAULT_DOCS_USER)
    expect(r.kind).toBe('patched')
    if (r.kind === 'patched') {
      expect(r.text).toContain("docs: {")
      // Output ends cleanly with single })
      expect(r.text.trimEnd().endsWith('})')).toBe(true)
    }
  })

  it('honours custom locales / theme / coverage in patched output', () => {
    const src = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X',
  },
})
`
    const r = patchConfig(src, {
      enabled: true,
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: ['install-setup'],
    })
    expect(r.kind).toBe('patched')
    if (r.kind === 'patched') {
      expect(r.text).toContain("locales: ['en'],")
      expect(r.text).toContain("coverage: ['install-setup'],")
    }
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/docs/patch-config.test.ts`
Expected: FAIL — current code returns `unparseable` for no-docs case.

- [ ] **Step 3: Implement the patched branch**

Replace the trailing `return { kind: 'unparseable', reason: 'not implemented yet' }` in `patchConfig` with the insertion logic. Final `patchConfig` body:

```ts
export function patchConfig(
  source: string,
  docsUser: DocsUserConfig,
): PatchConfigResult {
  const define = findDefineConfigBody(source)
  if (!define) {
    return { kind: 'unparseable', reason: 'defineConfig({...}) not found' }
  }
  const body = source.slice(define.bodyStart, define.bodyEnd)
  const docsRange = findTopLevelDocsBlock(body)
  if (docsRange) {
    if (/^ {4}user:/m.test(body.slice(docsRange.start, docsRange.end))) {
      return { kind: 'skipped' }
    }
    return {
      kind: 'unparseable',
      reason: 'existing docs block without user; will not edit nested object',
    }
  }

  // No docs block: ensure trailing comma on the last top-level key, then insert
  // the docs block just before `})`.
  const before = source.slice(0, define.closeStart)
  const after = source.slice(define.closeStart) // starts at `})`
  const beforeWithComma = ensureTrailingComma(before)
  const snippet = renderDocsUserSnippet(
    docsUser.locales,
    docsUser.theme,
    docsUser.coverage,
  )
  const patched = `${beforeWithComma}${snippet}\n${after}`
  return { kind: 'patched', text: patched }
}

function ensureTrailingComma(before: string): string {
  // `before` ends just before `})`. Walk back over whitespace; if the last
  // non-whitespace char isn't a comma, append one (with a newline + 2-space
  // indent so the inserted block starts on its own line).
  const trimmed = before.replace(/\s+$/, '')
  if (trimmed.endsWith(',')) {
    return trimmed + '\n'
  }
  return trimmed + ',\n'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/docs/patch-config.test.ts`
Expected: PASS — all six patchConfig tests + snippet test green.

- [ ] **Step 5: Commit**

```bash
git add src/docs/patch-config.ts tests/docs/patch-config.test.ts
git commit -m "feat: [docs-cli] insert docs.user block when missing"
```

---

## Task 5: Verify patched output is loadable via `loadConfig` (round-trip)

**Files:**
- Modify: `tests/docs/patch-config.test.ts`

This guards against the patched string being syntactically valid but rejected by Zod or jiti.

- [ ] **Step 1: Add failing round-trip test**

Append to `tests/docs/patch-config.test.ts` (new describe at the bottom of the file):

```ts
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig } from '../../src/content/load-config'

describe('patchConfig round-trip', () => {
  it('produces a config file that loadConfig can parse with docs.user enabled', async () => {
    const src = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X',
  },
})
`
    const r = patchConfig(src, DEFAULT_DOCS_USER)
    expect(r.kind).toBe('patched')
    if (r.kind !== 'patched') return
    const dir = await mkdtemp(join(tmpdir(), 'patch-config-roundtrip-'))
    try {
      const file = join(dir, 'specbook.config.ts')
      await writeFile(file, r.text, 'utf8')
      const cfg = await loadConfig(file)
      expect(cfg.docs?.user?.enabled).toBe(true)
      expect(cfg.docs?.user?.locales).toEqual(['zh-TW', 'en'])
      expect(cfg.docs?.user?.theme).toBe('anthropic-warm')
      expect(cfg.docs?.user?.coverage).toBe('all')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
```

(Note: the imports for `mkdtemp` / `rm` / `writeFile` / `tmpdir` / `join` / `loadConfig` belong at the top of the test file — add them to the existing import block, do not duplicate.)

- [ ] **Step 2: Run the test to verify it passes**

Run: `pnpm vitest run tests/docs/patch-config.test.ts`
Expected: PASS — if it fails, the formatting in `renderDocsUserSnippet` or `patchConfig` is producing invalid TS; fix until green before committing.

- [ ] **Step 3: Commit**

```bash
git add tests/docs/patch-config.test.ts
git commit -m "test: [docs-cli] round-trip patched config through loadConfig"
```

---

## Task 6: Wire `--write-config` into `docs init` CLI

**Files:**
- Modify: `src/cli/docs.ts`

- [ ] **Step 1: Add the flag and patch flow to the init action**

In `src/cli/docs.ts`:

1. Ensure the imports block at the top of the file includes the following (merge into existing import statements; the file already imports `readFile` from `'node:fs/promises'`):

```ts
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { patchConfig, renderDocsUserSnippet } from '../docs/patch-config.js'
```

2. On the `init` subcommand (the `cmd.command('init')...` chain), add the new option just before `.action(...)`:

```ts
    .option(
      '--write-config',
      'Patch .specbook/specbook.config.ts to enable docs.user',
      false,
    )
```

3. At the end of the existing `.action(async (opts) => { ... })` body — after the existing `for (const f of r.writtenFiles) console.log('wrote', f)` line and before the closing `})` — append:

```ts
      if (opts.writeConfig) {
        const configPath = resolve(root, '.specbook/specbook.config.ts')
        if (!existsSync(configPath)) {
          console.error(
            `expected ${configPath} (run \`specbook init\` first)`,
          )
          process.exit(1)
        }
        const original = await readFile(configPath, 'utf8')
        const result = patchConfig(original, {
          enabled: true,
          locales,
          theme: opts.theme,
          coverage: cov,
        })
        if (result.kind === 'patched') {
          await writeFile(configPath, result.text, 'utf8')
          console.log(`patched ${configPath} (added docs.user)`)
        } else if (result.kind === 'skipped') {
          console.log(`${configPath} already has docs.user; left untouched`)
        } else {
          console.error(
            `could not patch ${configPath}: ${result.reason}. paste this manually:`,
          )
          console.log(renderDocsUserSnippet(locales, opts.theme, cov))
          process.exit(1)
        }
      }
```

- [ ] **Step 2: Build the CLI**

Run: `pnpm build`
Expected: clean build, no TS errors. The integration tests in Task 7 spawn `dist/cli/index.js` so the dist must be up to date.

- [ ] **Step 3: Smoke-check the flag is registered**

Run: `node dist/cli/index.js docs init --help`
Expected: output includes `--write-config` line.

- [ ] **Step 4: Commit**

```bash
git add src/cli/docs.ts
git commit -m "feat: [docs-cli] add --write-config flag to docs init"
```

---

## Task 7: CLI integration tests for `--write-config`

**Files:**
- Modify: `tests/cli/docs.test.ts`

- [ ] **Step 1: Add four integration tests**

Append to `tests/cli/docs.test.ts` inside the existing `describe('specbook docs CLI', ...)` block, after the last existing `it(...)`:

```ts
  it('docs init --write-config patches a freshly-initialised config', async () => {
    // Use `specbook init` first to produce a real template config
    const init = spawnSync('node', [CLI, 'init'], {
      cwd: tmp,
      encoding: 'utf8',
    })
    expect(init.status).toBe(0)

    const r = runCli(
      ['docs', 'init', '--locales', 'en', '--project', 'X', '--write-config'],
      tmp,
    )
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('patched')
    expect(r.stdout).toContain('added docs.user')

    const cfgText = await readFile(
      join(tmp, '.specbook/specbook.config.ts'),
      'utf8',
    )
    expect(cfgText).toContain("docs: {")
    expect(cfgText).toContain("user: {")
    expect(cfgText).toContain("enabled: true")
    expect(cfgText).toContain("locales: ['en']")
  })

  it('docs init --write-config is idempotent when docs.user already present', async () => {
    await mkdir(join(tmp, '.specbook'), { recursive: true })
    const cfg = `import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'X',
  },
  docs: {
    user: {
      enabled: true,
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: 'all',
    },
  },
})
`
    await writeFile(join(tmp, '.specbook/specbook.config.ts'), cfg, 'utf8')

    const r = runCli(
      ['docs', 'init', '--locales', 'en', '--project', 'X', '--write-config'],
      tmp,
    )
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('already has docs.user')

    const after = await readFile(
      join(tmp, '.specbook/specbook.config.ts'),
      'utf8',
    )
    expect(after).toBe(cfg)
  })

  it('docs init --write-config exits 1 when config is missing', async () => {
    // No .specbook/specbook.config.ts written
    const r = runCli(
      ['docs', 'init', '--locales', 'en', '--project', 'X', '--write-config'],
      tmp,
    )
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('run `specbook init` first')
  })

  it('docs init --write-config exits 1 and prints snippet when config is unparseable', async () => {
    await mkdir(join(tmp, '.specbook'), { recursive: true })
    // No defineConfig call at all → unparseable
    await writeFile(
      join(tmp, '.specbook/specbook.config.ts'),
      `export default { project: { name: 'X' } }\n`,
      'utf8',
    )
    const r = runCli(
      ['docs', 'init', '--locales', 'en', '--project', 'X', '--write-config'],
      tmp,
    )
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('could not patch')
    expect(r.stdout).toContain("docs: {")
    expect(r.stdout).toContain("user: {")
  })
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `pnpm build && pnpm vitest run tests/cli/docs.test.ts`
Expected: PASS — all existing CLI tests + four new ones green.

(If a test fails on `init.status === 0`, it likely means `specbook init` exited non-zero for a fresh tmp dir; re-check the fixture setup in `beforeEach`.)

- [ ] **Step 3: Commit**

```bash
git add tests/cli/docs.test.ts
git commit -m "test: [docs-cli] cover --write-config integration paths"
```

---

## Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS — no regressions in any module.

- [ ] **Step 2: Run typecheck and lint (if configured)**

Run: `pnpm typecheck && pnpm lint` (skip whichever the project does not have)
Expected: clean.

- [ ] **Step 3: Manual smoke test in a throwaway directory**

```bash
mkdir -p /tmp/specbook-smoke && cd /tmp/specbook-smoke
echo '{"name":"smoke","version":"0.0.0"}' > package.json
node /Users/carl/Dev/CMG/SpecBook/dist/cli/index.js init
node /Users/carl/Dev/CMG/SpecBook/dist/cli/index.js docs init --locales en --write-config
cat .specbook/specbook.config.ts
```

Expected: final `cat` shows the config containing a `docs: { user: { enabled: true, locales: ['en'], ... } }` block; rerunning `docs init --write-config` prints `already has docs.user`.

Clean up: `rm -rf /tmp/specbook-smoke`.

- [ ] **Step 4: Self-check spec coverage**

Open `docs/superpowers/specs/2026-05-16-docs-init-write-config-design.md` and verify all of Sec 2 / Sec 4 / Sec 6 cases are covered by Tasks 1-7. No commit needed.

---

## Notes

- **Atomic commits**: each task ends with one commit. If a task's tests don't pass, do not commit; fix forward in the same task.
- **No new dependencies**: `patch-config` uses only built-in JS regex / string ops. Do not add `ts-morph`, `@babel/parser`, or similar.
- **Backwards compatibility**: without `--write-config`, `docs init` behaviour must be byte-identical to before this change. The integration test `docs init scaffolds files` (existing) must remain green.
- **Doctor remediation message** is intentionally **out of scope** for this plan (see spec Sec 8).
