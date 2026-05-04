# Release Readiness Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the published `specbook` package work from a clean install for `init`, `validate`, `build`, `export`, and the dev entry module paths promised by the README.

**Architecture:** Keep the existing TypeScript library layout and Vite-based build/dev pipeline, but make the package self-contained at runtime. The TypeScript build will continue to emit JavaScript into `dist/`; a small post-build asset copy step will add CSS files into `dist/styles`, and the CLI will resolve package-internal runtime paths from `dist` instead of unpublished `src`. A packaging smoke test will install the generated tarball into a temporary app and run the installed CLI, preventing regressions that normal in-repo tests cannot catch.

**Tech Stack:** TypeScript 5, Node 20+ ESM, Vite 6, React 19, Tailwind CSS 4, Vitest, npm pack/install smoke testing, existing SpecBook CLI and fixtures.

---

## File Structure（事前定錨）

```
SpecBook/
├── package.json
│   ├── Move Vite/Tailwind build-time runtime dependencies from devDependencies to dependencies
│   ├── Add post-build asset copy to `build`
│   └── Add `test:packaging` and include it in `prepublishOnly`
├── scripts/
│   └── copy-build-assets.mjs
│       └── Copies `src/styles/*.css` into `dist/styles/` after `tsc`
├── src/
│   └── cli/
│       ├── build.ts
│       │   └── Resolve CSS from packaged `dist/styles`, not unpublished `src/styles`
│       ├── dev.ts
│       │   └── Generate dev entry without `any`; alias to packaged `dist` files
│       ├── export.ts
│       │   └── Reject unsupported export formats at runtime
│       └── index.ts
│           └── Parse `--formats` with the new validator instead of a type cast
└── tests/
    ├── cli/
    │   ├── build.test.ts
    │   │   └── Assert build can use a copied `dist/styles/global.css`
    │   ├── dev.test.ts
    │   │   └── Assert generated dev entry is type-clean and package aliases point to `dist`
    │   └── export.test.ts
    │       └── Assert unsupported export formats throw a clear error
    └── packaging/
        └── package-smoke.test.ts
            └── Packs, installs, and runs installed CLI in a clean temporary app
```

### Design decisions locked by this plan

- Do **not** bundle the CLI into a single file. Keep the current `tsc` output and fix package contents/paths instead.
- Do **not** add a new bundler dependency. Reuse Node `fs/promises` for the asset copy script.
- Treat `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, and `tailwindcss` as runtime dependencies because `specbook build` and `specbook dev` import them in installed user projects.
- Keep `.specbook/.dev/` ephemeral; generated dev files should stay outside npm package output.

---

### Task 1: Copy CSS assets into `dist/styles` during package build

**Files:**
- Create: `scripts/copy-build-assets.mjs`
- Modify: `package.json:33-40`
- Test: `tests/packaging/package-smoke.test.ts`（created in Task 4 consumes this behavior）

- [ ] **Step 1: Write the asset copy script**

Create `scripts/copy-build-assets.mjs` with this complete content:

```js
import { cp, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceStyles = resolve(repoRoot, 'src/styles')
const outputStyles = resolve(repoRoot, 'dist/styles')

await mkdir(outputStyles, { recursive: true })
await cp(sourceStyles, outputStyles, { recursive: true })
```

- [ ] **Step 2: Update `package.json` build scripts**

Modify only the `scripts` object in `package.json` to this exact shape:

```json
  "scripts": {
    "dev": "vite --config vite.config.ts examples/taskflow",
    "build": "tsc -p tsconfig.json && node scripts/copy-build-assets.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:packaging": "pnpm build && vitest run tests/packaging/package-smoke.test.ts",
    "prepublishOnly": "pnpm test && pnpm test:packaging",
    "pack:check": "npm pack --dry-run"
  },
```

- [ ] **Step 3: Run the build and verify copied assets**

Run:

```bash
pnpm build
find dist/styles -maxdepth 1 -type f | sort
```

Expected: command exits 0 and prints at least:

```text
dist/styles/global.css
dist/styles/tokens.css
```

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/copy-build-assets.mjs dist/styles/global.css dist/styles/tokens.css
git commit -m "Make packaged builds include runtime styles

Constraint: npm package only publishes files declared in package.json files list
Rejected: importing CSS from src/ at runtime | src/ is not included in the package tarball
Confidence: high
Scope-risk: narrow
Directive: Keep package runtime paths inside dist unless files list is intentionally expanded
Tested: pnpm build and dist/styles asset presence
Not-tested: clean-install CLI smoke; covered by later packaging task"
```

---

### Task 2: Resolve build/dev runtime paths from packaged `dist`

**Files:**
- Modify: `src/cli/build.ts:32-41`
- Modify: `src/cli/dev.ts:23-52`
- Modify: `tests/cli/build.test.ts`
- Modify: `tests/cli/dev.test.ts`

- [ ] **Step 1: Add a failing build test for packaged-style CSS resolution**

Append this test to `tests/cli/build.test.ts` inside the existing `describe('runBuild', () => { ... })` block:

```ts
  it('uses CSS copied into dist/styles instead of unpublished src/styles', async () => {
    const tmp3 = await mkdtemp(resolve(tmpdir(), 'specbook-build-dist-styles-'))
    try {
      await cp(resolve(__dirname, '../fixtures/taskflow'), tmp3, { recursive: true })
      await runBuild({ root: tmp3 })
      const manifest = await readFile(resolve(tmp3, 'dist/.vite/manifest.json'), 'utf-8')
      expect(manifest).toContain('client-entry')
      const html = await readFile(resolve(tmp3, 'dist/index.html'), 'utf-8')
      expect(html).toMatch(/href="\/assets\/.*\.css"/)
    } finally {
      await rm(tmp3, { recursive: true, force: true })
    }
  }, 120_000)
```

- [ ] **Step 2: Add a failing dev test for generated entry content and dist aliases**

Replace `tests/cli/dev.test.ts` with this complete content:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mkdtemp, cp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { specbookContentPlugin } from '../../src/plugins/content-hmr'
import { createDevEntryFiles, resolvePackageRuntimePaths } from '../../src/cli/dev'

describe('dev plugin smoke', () => {
  it('serves virtual:specbook-data via ssrLoadModule', async () => {
    const tmp = await mkdtemp(resolve(tmpdir(), 'specbook-dev-'))
    try {
      await cp(resolve(__dirname, '../fixtures/taskflow'), tmp, { recursive: true })
      const server = await createServer({
        configFile: false,
        root: tmp,
        plugins: [react(), specbookContentPlugin(tmp)],
        logLevel: 'silent',
        server: { middlewareMode: true },
      })
      try {
        const mod = await server.ssrLoadModule('virtual:specbook-data')
        expect(mod.default.config.project.name).toBe('TaskFlow')
      } finally {
        await server.close()
      }
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it('generates a type-safe dev entry without any casts', async () => {
    const tmp = await mkdtemp(resolve(tmpdir(), 'specbook-dev-entry-'))
    try {
      await createDevEntryFiles(tmp)
      const entry = await readFile(resolve(tmp, '.dev/main.tsx'), 'utf-8')
      expect(entry).toContain("import type { SpecBookData } from 'specbook'")
      expect(entry).toContain('const data = rawData as SpecBookData')
      expect(entry).not.toContain('as any')
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it('resolves dev aliases to packaged dist files', () => {
    const paths = resolvePackageRuntimePaths(resolve(process.cwd(), 'dist/cli'))
    expect(paths.styles).toBe(resolve(process.cwd(), 'dist/styles/global.css'))
    expect(paths.components).toBe(resolve(process.cwd(), 'dist/components/SpecBookPage.js'))
  })
})
```

Expected before implementation: TypeScript/test failure because `createDevEntryFiles` and `resolvePackageRuntimePaths` are not exported.

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
pnpm vitest run tests/cli/build.test.ts tests/cli/dev.test.ts
```

Expected: FAIL with missing exports from `../../src/cli/dev`.

- [ ] **Step 4: Update `src/cli/build.ts` path resolution**

In `src/cli/build.ts`, replace lines 32-41:

```ts
  const clientEntry = resolve(__dirname, '../ssg/client-entry.js')
  // __dirname is dist/cli at runtime; src/styles is two dirs up then into src/styles
  const stylesDir = resolve(__dirname, '../../src/styles')
  await viteBuild({
    configFile: false,
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [{ find: /^\.\.\/styles\//, replacement: stylesDir + '/' }],
    },
```

with:

```ts
  const clientEntry = resolve(__dirname, '../ssg/client-entry.js')
  const stylesDir = resolve(__dirname, '../styles')
  await viteBuild({
    configFile: false,
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [{ find: /^\.\.\/styles\//, replacement: stylesDir + '/' }],
    },
```

- [ ] **Step 5: Refactor `src/cli/dev.ts` to export helpers and use dist aliases**

Replace `src/cli/dev.ts` with this complete content:

```ts
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { specbookContentPlugin } from '../plugins/content-hmr.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface DevOptions {
  root: string
  port?: number
}

export interface PackageRuntimePaths {
  styles: string
  components: string
}

export async function runDev(opts: DevOptions): Promise<void> {
  const root = opts.root
  const devDir = await createDevEntryFiles(root)
  const specbookPkg = await findSpecbookPkgRoot(__dirname)
  const runtimePaths = resolvePackageRuntimePaths(resolve(specbookPkg, 'dist/cli'))

  const server = await createServer({
    configFile: false,
    root: devDir,
    server: { port: opts.port ?? 5173 },
    plugins: [react(), tailwindcss(), specbookContentPlugin(root)],
    resolve: {
      alias: {
        'specbook/styles/global.css': runtimePaths.styles,
        'specbook/components': runtimePaths.components,
      },
    },
  })
  await server.listen()
  server.printUrls()
}

export async function createDevEntryFiles(root: string): Promise<string> {
  const devDir = resolve(root, '.dev')
  await mkdir(devDir, { recursive: true })
  const entryHtml = resolve(devDir, 'index.html')
  const entryTsx = resolve(devDir, 'main.tsx')

  if (!existsSync(entryHtml)) {
    await writeFile(entryHtml, `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>SpecBook dev</title></head>
<body><div id="root"></div><script type="module" src="./main.tsx"></script></body>
</html>`)
  }

  if (!existsSync(entryTsx)) {
    await writeFile(entryTsx, `import React from 'react'
import { createRoot } from 'react-dom/client'
import type { SpecBookData } from 'specbook'
import 'specbook/styles/global.css'
import { SpecBookPage } from 'specbook/components'
import rawData from 'virtual:specbook-data'
const data = rawData as SpecBookData
createRoot(document.getElementById('root')!).render(<SpecBookPage data={data} />)
`)
  }

  return devDir
}

export function resolvePackageRuntimePaths(cliDir: string): PackageRuntimePaths {
  return {
    styles: resolve(cliDir, '../styles/global.css'),
    components: resolve(cliDir, '../components/SpecBookPage.js'),
  }
}

async function findSpecbookPkgRoot(startDir: string): Promise<string> {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    const pkgPath = resolve(dir, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as { name?: unknown }
      if (pkg.name === 'specbook') return dir
    }
    dir = resolve(dir, '..')
  }
  return startDir
}
```

- [ ] **Step 6: Run tests to verify pass**

Run:

```bash
pnpm vitest run tests/cli/build.test.ts tests/cli/dev.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/cli/build.ts src/cli/dev.ts tests/cli/build.test.ts tests/cli/dev.test.ts
git commit -m "Resolve CLI runtime paths from packaged dist

Constraint: published packages do not include src/ by default
Rejected: expanding files to publish src/ | dist should remain the runtime boundary
Confidence: high
Scope-risk: moderate
Directive: New CLI runtime imports must be validated against npm pack output
Tested: pnpm vitest run tests/cli/build.test.ts tests/cli/dev.test.ts
Not-tested: clean npm install smoke; covered by later packaging task"
```

---

### Task 3: Move build/dev runtime packages into dependencies and validate export formats

**Files:**
- Modify: `package.json:44-69`
- Modify: `src/cli/export.ts:1-24`
- Modify: `src/cli/index.ts:61-71`
- Modify: `tests/cli/export.test.ts`

- [ ] **Step 1: Add failing tests for invalid export formats**

Append this test to `tests/cli/export.test.ts` inside `describe('runExport', () => { ... })`:

```ts
  it('rejects unsupported export formats before writing files', async () => {
    tmp = await mkdtemp(resolve(tmpdir(), 'specbook-export-invalid-'))
    await cp(resolve(__dirname, '../fixtures/taskflow'), tmp, { recursive: true })

    await expect(
      runExport({
        root: tmp,
        outDir: resolve(tmp, 'dist/client-spec'),
        formats: ['pdf' as never],
      })
    ).rejects.toThrow('Unsupported export format: pdf')
  })
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm vitest run tests/cli/export.test.ts
```

Expected: FAIL because `runExport` currently ignores unsupported formats instead of rejecting them.

- [ ] **Step 3: Update `src/cli/export.ts` with a parser/validator**

Replace `src/cli/export.ts` with this complete content:

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadAll } from '../content/load-all.js'
import { renderDocumentHtml } from '../export/render-html.js'
import { renderDocumentMarkdown } from '../export/render-markdown.js'

export type ExportFormat = 'md' | 'html'

export interface ExportOptions {
  root: string
  outDir: string
  formats: ExportFormat[]
}

const SUPPORTED_FORMATS: ExportFormat[] = ['md', 'html']

export function parseExportFormats(input: string): ExportFormat[] {
  const formats = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (formats.length === 0) {
    throw new Error('At least one export format is required')
  }

  return formats.map(assertExportFormat)
}

function assertExportFormat(format: string): ExportFormat {
  if (SUPPORTED_FORMATS.includes(format as ExportFormat)) return format as ExportFormat
  throw new Error(`Unsupported export format: ${format}`)
}

export async function runExport(opts: ExportOptions): Promise<void> {
  const formats = opts.formats.map(assertExportFormat)
  const data = await loadAll(opts.root)
  await mkdir(opts.outDir, { recursive: true })

  if (formats.includes('md')) {
    await writeFile(resolve(opts.outDir, 'system-spec.md'), renderDocumentMarkdown(data), 'utf-8')
  }

  if (formats.includes('html')) {
    await writeFile(resolve(opts.outDir, 'system-spec.html'), renderDocumentHtml(data), 'utf-8')
  }
}
```

- [ ] **Step 4: Update `src/cli/index.ts` to use `parseExportFormats`**

Replace lines 61-71 in `src/cli/index.ts`:

```ts
  .action(async (opts: { root: string; out: string; formats: string }) => {
    const { runExport } = await import('./export.js')
    const formats = opts.formats
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as Array<'md' | 'html'>
    await runExport({
      root: resolve(process.cwd(), opts.root),
      outDir: resolve(process.cwd(), opts.out),
      formats,
    })
  })
```

with:

```ts
  .action(async (opts: { root: string; out: string; formats: string }) => {
    const { parseExportFormats, runExport } = await import('./export.js')
    await runExport({
      root: resolve(process.cwd(), opts.root),
      outDir: resolve(process.cwd(), opts.out),
      formats: parseExportFormats(opts.formats),
    })
  })
```

- [ ] **Step 5: Move Vite/Tailwind runtime dependencies in `package.json`**

Modify the dependency sections in `package.json` so they are exactly:

```json
  "dependencies": {
    "@tailwindcss/vite": "^4.2.4",
    "@vitejs/plugin-react": "^4.7.0",
    "commander": "^14.0.3",
    "gray-matter": "^4.0.3",
    "jiti": "^2.6.1",
    "mermaid-isomorphic": "^3.1.0",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "tailwindcss": "^4.2.4",
    "vite": "^6.4.2",
    "yaml": "^2.8.4",
    "zod": "^4.4.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^25.6.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitest/ui": "^4.1.5",
    "happy-dom": "^20.9.0",
    "jsdom": "^29.1.1",
    "playwright": "^1.59.1",
    "typescript": "^5.9.3",
    "vitest": "^4.1.5"
  }
```

- [ ] **Step 6: Install to update lockfile**

Run:

```bash
pnpm install
```

Expected: exits 0 and updates `pnpm-lock.yaml` if needed.

- [ ] **Step 7: Run focused tests**

Run:

```bash
pnpm vitest run tests/cli/export.test.ts
pnpm build
```

Expected: both commands PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml src/cli/export.ts src/cli/index.ts tests/cli/export.test.ts
git commit -m "Treat build toolchain as CLI runtime dependency

Constraint: installed users run specbook build/dev without this repository's devDependencies
Rejected: keeping Vite and Tailwind plugins as devDependencies | installed CLI imports them at runtime
Confidence: high
Scope-risk: moderate
Directive: Re-run packaging smoke before changing package dependency classes
Tested: pnpm vitest run tests/cli/export.test.ts; pnpm build
Not-tested: clean npm install smoke; covered by later packaging task"
```

---

### Task 4: Add clean-install packaging smoke test

**Files:**
- Create: `tests/packaging/package-smoke.test.ts`
- Modify: `package.json:33-40`（already changed in Task 1; this task verifies script works）

- [ ] **Step 1: Write the failing packaging smoke test**

Create `tests/packaging/package-smoke.test.ts` with this complete content:

```ts
// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const repoRoot = resolve(__dirname, '../..')
const cleanup: string[] = []

describe('published package smoke test', () => {
  afterEach(async () => {
    while (cleanup.length > 0) {
      const dir = cleanup.pop()
      if (dir) await rm(dir, { recursive: true, force: true })
    }
  })

  it('runs installed CLI build and export from a clean npm app', async () => {
    const tempRoot = await mkdtemp(resolve(tmpdir(), 'specbook-package-smoke-'))
    cleanup.push(tempRoot)

    const packDir = resolve(tempRoot, 'pack')
    const appDir = resolve(tempRoot, 'app')
    const specRoot = resolve(tempRoot, 'taskflow')

    await execFileAsync('mkdir', ['-p', packDir, appDir])

    const { stdout: packStdout } = await execFileAsync('npm', ['pack', '--pack-destination', packDir], {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024 * 10,
    })
    const tarballName = packStdout.trim().split('\n').at(-1)
    expect(tarballName).toMatch(/^specbook-.*\.tgz$/)

    const tarballPath = resolve(packDir, tarballName!)
    expect(existsSync(tarballPath)).toBe(true)

    await writeFile(resolve(appDir, 'package.json'), '{"type":"module","private":true}\n')
    await execFileAsync('npm', ['install', tarballPath], {
      cwd: appDir,
      maxBuffer: 1024 * 1024 * 10,
    })

    await cp(resolve(repoRoot, 'tests/fixtures/taskflow'), specRoot, { recursive: true })
    const cli = resolve(appDir, 'node_modules/.bin/specbook')

    const validate = await execFileAsync(cli, ['validate', '--root', specRoot], { cwd: appDir })
    expect(validate.stdout).toContain('All content valid.')

    await execFileAsync(cli, ['build', '--root', specRoot, '--base', '/specbook/'], {
      cwd: appDir,
      maxBuffer: 1024 * 1024 * 10,
    })
    const siteHtml = await readFile(resolve(specRoot, 'dist/index.html'), 'utf-8')
    expect(siteHtml).toContain('<title>TaskFlow</title>')
    expect(siteHtml).toMatch(/href="\/specbook\/assets\/.*\.css"/)
    expect(siteHtml).toMatch(/src="\/specbook\/assets\/.*\.js"/)

    await execFileAsync(
      cli,
      ['export', '--root', specRoot, '--out', resolve(tempRoot, 'client-spec'), '--formats', 'md,html'],
      { cwd: appDir }
    )
    const exportedMarkdown = await readFile(resolve(tempRoot, 'client-spec/system-spec.md'), 'utf-8')
    const exportedHtml = await readFile(resolve(tempRoot, 'client-spec/system-spec.html'), 'utf-8')
    expect(exportedMarkdown).toContain('# TaskFlow 系統規格書')
    expect(exportedHtml).toContain('<main class="document">')
  }, 180_000)
})
```

- [ ] **Step 2: Run the test to verify current failure**

Run:

```bash
pnpm build
pnpm vitest run tests/packaging/package-smoke.test.ts
```

Expected before Tasks 1-3 are fully implemented: FAIL with either missing runtime dependency or missing CSS under package `dist/styles`. Expected after Tasks 1-3: PASS.

- [ ] **Step 3: Run packaging script**

Run:

```bash
pnpm test:packaging
```

Expected: PASS; output includes one passed test file for `tests/packaging/package-smoke.test.ts`.

- [ ] **Step 4: Commit**

```bash
git add tests/packaging/package-smoke.test.ts package.json
git commit -m "Add clean-install packaging smoke coverage

Constraint: in-repo tests cannot catch missing npm package runtime files or dependencies
Rejected: relying on npm pack --dry-run only | it lists files but does not execute installed CLI
Confidence: high
Scope-risk: narrow
Directive: Packaging smoke must pass before publishing or changing package files/dependencies
Tested: pnpm test:packaging
Not-tested: real npm publish; smoke uses local tarball install"
```

---

### Task 5: Full release-readiness verification and documentation alignment

**Files:**
- Modify: `README.md:14-28` only if smoke evidence changes commands or assumptions
- Modify: `docs/superpowers/plans/2026-05-04-release-readiness-packaging.md` checkbox states during execution

- [ ] **Step 1: Run full test suite**

Run:

```bash
pnpm test
```

Expected:

```text
Test Files  44 passed
Tests       130+ passed
```

The exact test count may differ if earlier tasks add assertions, but all tests must pass.

- [ ] **Step 2: Run build**

Run:

```bash
pnpm build
```

Expected: exits 0 and `dist/styles/global.css` exists.

- [ ] **Step 3: Run packaging smoke**

Run:

```bash
pnpm test:packaging
```

Expected: PASS and installed tarball CLI successfully runs `validate`, `build`, and `export`.

- [ ] **Step 4: Run dry pack inspection**

Run:

```bash
npm pack --dry-run
```

Expected tarball contents include:

```text
dist/styles/global.css
dist/styles/tokens.css
skill/specbook/SKILL.md
README.md
LICENSE
```

- [ ] **Step 5: Check git cleanliness except intentional changes**

Run:

```bash
git status --short
```

Expected: only files changed by this plan before the final commit, or empty after commits.

- [ ] **Step 6: Commit documentation alignment if needed**

If README remains accurate after smoke testing, do not edit README. If any README command changed during implementation, commit that minimal doc fix:

```bash
git add README.md docs/superpowers/plans/2026-05-04-release-readiness-packaging.md
git commit -m "Align release docs with packaged CLI smoke evidence

Constraint: README quickstart must match clean-install behavior
Rejected: documenting repo-local commands only | users install the npm package
Confidence: high
Scope-risk: narrow
Directive: Update README whenever packaging smoke changes user-facing commands
Tested: pnpm test; pnpm build; pnpm test:packaging; npm pack --dry-run
Not-tested: live npm publish"
```

If README did not need changes, only commit the plan checkbox updates if the project tracks plan execution state:

```bash
git add docs/superpowers/plans/2026-05-04-release-readiness-packaging.md
git commit -m "Record release readiness packaging plan completion

Constraint: plan files are used as execution audit trails
Confidence: high
Scope-risk: narrow
Tested: pnpm test; pnpm build; pnpm test:packaging; npm pack --dry-run
Not-tested: live npm publish"
```

---

## Self-Review

### 1. Spec coverage

- Completion assessment blocker: clean-installed tarball failed on missing `vite` dependency — covered by Task 3 and Task 4.
- Completion assessment blocker: package build/dev referenced unpublished `src/styles` — covered by Task 1, Task 2, and Task 4.
- Completion assessment risk: `export --formats` used a type cast without runtime validation — covered by Task 3.
- Completion assessment risk: no packaging regression test — covered by Task 4.
- Completion assessment requirement: keep release evidence concrete — covered by Task 5.

### 2. Placeholder scan

No `TBD`, `TODO`, “similar to”, or undefined implementation placeholders remain in executable steps. Every code-changing step includes complete code or exact replacement snippets.

### 3. Type consistency

- `ExportFormat`, `parseExportFormats`, and `runExport` signatures are defined in Task 3 before being imported by `src/cli/index.ts`.
- `PackageRuntimePaths`, `createDevEntryFiles`, and `resolvePackageRuntimePaths` are defined in Task 2 before tests assert them.
- `dist/styles/global.css` is produced in Task 1 before build/dev path changes depend on it.
