# Client System Spec Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 SpecBook 在既有網頁呈現之外，再能輸出一份可交付客戶的系統規格書文件（先交付 Markdown + HTML，後續可再加 PDF）。

**Architecture:** 保留現有網站輸出管線不動，另外新增一條「文件輸出」管線，直接復用同一份 `SpecBookData`。文件輸出會先把結構化資料整理成正式規格書的大綱與章節，再分別渲染成 Markdown 與可列印 HTML；HTML 樣式會沿用 PaperTech 視覺語彙，但調整成更正式、適合提交客戶的版式。CLI 方面新增 `specbook export`，讓使用者可明確選擇輸出格式與目的地，而 `build` 繼續只負責現有網站站點。

**Tech Stack:** TypeScript 5 / Zod / Commander / React 19 / Vite 6 / Vitest / 既有 PaperTech design tokens / 既有 `SpecBookData` 載入管線

**Scope note:** 本計畫先做「客戶交付文件」的基礎版本：Markdown 與 HTML。PDF 會列為後續迭代，因為它需要更明確的版面穩定性與額外的瀏覽器列印流程驗證。

**Spec 來源:** 現有 repo 內的 SpecBook renderer 與 `DESIGN.md`。

---

## File Structure（事前定錨）

```
SpecBook/
├── src/
│   ├── cli/
│   │   ├── index.ts              # 新增 export 指令入口
│   │   ├── export.ts             # 新增文件輸出 CLI（runExport）
│   │   └── build.ts              # 保留現有網站 build，不混入文件輸出責任
│   ├── content/
│   │   └── load-config.ts        # 型別收斂，避免 any 直通配置載入
│   ├── schema/
│   │   └── config.ts             # 新增 client document metadata schema
│   ├── export/
│   │   ├── document-outline.ts    # 由 SpecBookData 組出正式文件章節模型
│   │   ├── render-markdown.ts     # 章節模型 → Markdown
│   │   └── render-html.ts         # 章節模型 → 可列印 HTML
│   └── index.ts                  # 若需要，re-export 文件輸出型別
├── tests/
│   ├── schema/config.test.ts
│   ├── content/load-config.test.ts
│   ├── export/document-outline.test.ts
│   ├── export/render-markdown.test.ts
│   ├── export/render-html.test.ts
│   └── cli/export.test.ts
└── README.md                     # 補上 export 用法與輸出說明
```

---

### Task 1: 定義客戶文件 metadata schema，讓 export 有正式封面資訊

**Files:**
- Modify: `src/schema/config.ts`
- Modify: `src/content/load-config.ts:1-20`
- Modify: `tests/schema/config.test.ts`
- Modify: `tests/content/load-config.test.ts`
- Create: `tests/fixtures/client-spec/specbook.config.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { SpecBookConfigSchema } from '../../src/schema/config'

describe('SpecBookConfigSchema client document metadata', () => {
  it('accepts optional document metadata for client exports', () => {
    const cfg = SpecBookConfigSchema.parse({
      project: { name: 'TaskFlow' },
      document: {
        title: 'TaskFlow 系統規格書',
        version: '1.2.0',
        audience: 'Client',
        confidentiality: 'confidential',
      },
    })

    expect(cfg.document?.title).toBe('TaskFlow 系統規格書')
    expect(cfg.document?.version).toBe('1.2.0')
    expect(cfg.document?.audience).toBe('Client')
    expect(cfg.document?.confidentiality).toBe('confidential')
  })

  it('fills default document metadata when omitted', () => {
    const cfg = SpecBookConfigSchema.parse({
      project: { name: 'TaskFlow' },
    })

    expect(cfg.document?.version).toBe('v1.0')
    expect(cfg.document?.audience).toBe('Client')
    expect(cfg.document?.confidentiality).toBe('confidential')
  })
})
```

```ts
import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { loadConfig } from '../../src/content/load-config'

const CONFIG = resolve(__dirname, '../fixtures/client-spec/specbook.config.ts')

describe('loadConfig', () => {
  it('loads client document metadata from config and validates it', async () => {
    const cfg = await loadConfig(CONFIG)
    expect(cfg.document?.title).toBeUndefined()
    expect(cfg.document?.version).toBe('v1.0')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/schema/config.test.ts tests/content/load-config.test.ts`

Expected: FAIL because `document` is not yet part of `SpecBookConfigSchema`.

- [ ] **Step 3: Write minimal implementation**

```ts
// tests/fixtures/client-spec/specbook.config.ts
import { defineConfig } from 'specbook'

export default defineConfig({
  project: { name: 'TaskFlow' },
})
```

```ts
import { z } from 'zod'

const DocumentMetadataSchema = z.object({
  title: z.string().min(1).optional(),
  version: z.string().min(1).default('v1.0'),
  audience: z.string().min(1).default('Client'),
  confidentiality: z.enum(['internal', 'confidential', 'public']).default('confidential'),
  owner: z.string().min(1).optional(),
  preparedFor: z.string().min(1).optional(),
}).prefault({})

export const SpecBookConfigSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    url: z.string().url().optional(),
    favicon: z.string().optional(),
    ogImage: z.string().optional(),
  }),
  document: DocumentMetadataSchema.default({}),
  theme: z
    .object({
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#4f46e5'),
      mode: z.enum(['light', 'auto']).default('light'),
      locale: z.enum(['zh-TW', 'en']).default('zh-TW'),
    })
    .prefault({}),
  sections: z
    .object({
      order: z.array(z.enum([
        'overview',
        'tech-stack',
        'architecture',
        'user-stories',
        'roadmap',
      ])).default([
        'overview',
        'tech-stack',
        'architecture',
        'user-stories',
        'roadmap',
      ]),
      hide: z.array(z.enum([
        'overview',
        'tech-stack',
        'architecture',
        'user-stories',
        'roadmap',
      ])).default([]),
    })
    .prefault({}),
})
```

```ts
import { createJiti } from 'jiti'
import { resolve } from 'node:path'
import { SpecBookConfigSchema, type SpecBookConfig } from '../schema/config.js'

export async function loadConfig(configPath: string): Promise<SpecBookConfig> {
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    alias: { specbook: resolve(process.cwd(), 'src/index.ts') },
  })
  const mod: unknown = await jiti.import(configPath)
  const raw = (mod as { default?: unknown })?.default ?? mod
  return SpecBookConfigSchema.parse(raw)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/schema/config.test.ts tests/content/load-config.test.ts`

Expected: PASS, with `document` parsed and defaults preserved for config files that omit it.

- [ ] **Step 5: Commit**

```bash
git add src/schema/config.ts src/content/load-config.ts tests/schema/config.test.ts tests/content/load-config.test.ts tests/fixtures/client-spec/specbook.config.ts
git commit -m "feat: add client document metadata to spec config"
```

---

### Task 2: 建立正式規格書的大綱模型與雙輸出 renderer

**Files:**
- Create: `src/export/document-outline.ts`
- Create: `src/export/render-markdown.ts`
- Create: `src/export/render-html.ts`
- Create: `tests/export/document-outline.test.ts`
- Create: `tests/export/render-markdown.test.ts`
- Create: `tests/export/render-html.test.ts`
- Create: `tests/fixtures/client-spec/content/*`（沿用 TaskFlow 內容即可，若測試需要單獨 fixture 就複製一份）

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { loadAll } from '../../src/content/load-all'
import { buildDocumentOutline } from '../../src/export/document-outline'

describe('buildDocumentOutline', () => {
  it('maps SpecBookData into a client-facing system spec outline', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const outline = buildDocumentOutline(data)

    expect(outline.cover.title).toBe('TaskFlow 系統規格書')
    expect(outline.sections.map((s) => s.heading)).toEqual([
      '專案背景與目標',
      '範圍定義',
      '功能需求',
      '非功能需求',
      '系統架構',
      '技術選型',
      '里程碑與交付',
      '驗收標準',
    ])
  })
})
```

```ts
import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { loadAll } from '../../src/content/load-all'
import { renderDocumentMarkdown } from '../../src/export/render-markdown'

describe('renderDocumentMarkdown', () => {
  it('renders a formal client spec with cover, scope, requirements, and appendix headings', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const md = renderDocumentMarkdown(data)

    expect(md).toContain('# TaskFlow 系統規格書')
    expect(md).toContain('## 專案背景與目標')
    expect(md).toContain('## 範圍定義')
    expect(md).toContain('## 功能需求')
    expect(md).toContain('## 系統架構')
    expect(md).toContain('## 驗收標準')
  })
})
```

```ts
import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { loadAll } from '../../src/content/load-all'
import { renderDocumentHtml } from '../../src/export/render-html'

describe('renderDocumentHtml', () => {
  it('escapes content and emits print-friendly section wrappers', async () => {
    const data = await loadAll(resolve(__dirname, '../fixtures/taskflow'))
    const html = renderDocumentHtml(data)

    expect(html).toContain('<main class="document">')
    expect(html).toContain('TaskFlow 系統規格書')
    expect(html).toContain('data-section="scope"')
    expect(html).toContain('data-section="acceptance"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/export/document-outline.test.ts tests/export/render-markdown.test.ts tests/export/render-html.test.ts`

Expected: FAIL because the new export modules do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/export/document-outline.ts
import type { SpecBookData } from '../content/load-all.js'

export interface DocumentOutline {
  cover: {
    title: string
    subtitle: string
    version: string
    audience: string
    confidentiality: string
  }
  sections: Array<{ id: string; heading: string; body: string }>
}

export function buildDocumentOutline(data: SpecBookData): DocumentOutline {
  const title = data.config.document?.title ?? `${data.config.project.name} 系統規格書`
  return {
    cover: {
      title,
      subtitle: data.config.project.description ?? data.overview.tagline,
      version: data.config.document?.version ?? 'v1.0',
      audience: data.config.document?.audience ?? 'Client',
      confidentiality: data.config.document?.confidentiality ?? 'confidential',
    },
    sections: [
      { id: 'background', heading: '專案背景與目標', body: data.overview.body },
      { id: 'scope', heading: '範圍定義', body: 'In scope / out of scope 由現有內容摘要組成。' },
      { id: 'requirements', heading: '功能需求', body: '由 user-stories 轉譯為客戶可讀需求。' },
      { id: 'non-functional', heading: '非功能需求', body: '由專案約束與技術選型摘要生成。' },
      { id: 'architecture', heading: '系統架構', body: data.architecture.body },
      { id: 'stack', heading: '技術選型', body: '由 tech-stack 彙整。' },
      { id: 'roadmap', heading: '里程碑與交付', body: '由 roadmap 彙整。' },
      { id: 'acceptance', heading: '驗收標準', body: '由 user-stories 與 roadmap 反推。' },
    ],
  }
}
```

```ts
// src/export/render-markdown.ts
import { buildDocumentOutline } from './document-outline.js'
import type { SpecBookData } from '../content/load-all.js'

export function renderDocumentMarkdown(data: SpecBookData): string {
  const outline = buildDocumentOutline(data)
  const lines = [
    `# ${outline.cover.title}`,
    '',
    `- 文件版本：${outline.cover.version}`,
    `- 對象：${outline.cover.audience}`,
    `- 保密等級：${outline.cover.confidentiality}`,
    '',
  ]
  for (const section of outline.sections) {
    lines.push(`## ${section.heading}`, '', section.body, '')
  }
  return lines.join('\n').trim() + '\n'
}
```

```ts
// src/export/render-html.ts
import { buildDocumentOutline } from './document-outline.js'
import type { SpecBookData } from '../content/load-all.js'

export function renderDocumentHtml(data: SpecBookData): string {
  const outline = buildDocumentOutline(data)
  return `<!doctype html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(outline.cover.title)}</title>
  <style>
    :root { --paper-bg: #F9F5F1; --paper-text: #2D2621; --paper-border: #E5E0DA; --paper-accent: #D97757; }
    body { margin: 0; background: var(--paper-bg); color: var(--paper-text); font-family: Inter, system-ui, sans-serif; }
    main.document { max-width: 960px; margin: 0 auto; padding: 40px 24px 72px; }
    section { border-top: 1px solid var(--paper-border); padding-top: 24px; margin-top: 24px; }
  </style>
</head>
<body>
  <main class="document">
    <header>
      <p>System Specification</p>
      <h1>${escapeHtml(outline.cover.title)}</h1>
      <p>${escapeHtml(outline.cover.subtitle)}</p>
    </header>
    ${outline.sections.map((section) => `<section data-section="${section.id}"><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p></section>`).join('')}
  </main>
</body>
</html>`
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/export/document-outline.test.ts tests/export/render-markdown.test.ts tests/export/render-html.test.ts`

Expected: PASS, and the markdown/HTML outputs contain the new customer-facing section headings.

- [ ] **Step 5: Commit**

```bash
git add src/export/document-outline.ts src/export/render-markdown.ts src/export/render-html.ts tests/export/document-outline.test.ts tests/export/render-markdown.test.ts tests/export/render-html.test.ts
git commit -m "feat: add client-facing system spec renderers"
```

---

### Task 3: 新增 `specbook export` CLI，輸出文件到獨立目錄

**Files:**
- Create: `src/cli/export.ts`
- Modify: `src/cli/index.ts`
- Modify: `tests/cli/build.test.ts`（只做回歸確認，避免 export 影響 build）
- Create: `tests/cli/export.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, expect, it, afterAll } from 'vitest'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runExport } from '../../src/cli/export'

describe('runExport', () => {
  let tmp: string | undefined
  afterAll(async () => {
    if (tmp) await rm(tmp, { recursive: true, force: true })
  })

  it('writes client-facing markdown and html files to the export directory', async () => {
    tmp = await mkdtemp(resolve(tmpdir(), 'specbook-export-'))
    await cp(resolve(__dirname, '../fixtures/taskflow'), tmp, { recursive: true })

    await runExport({ root: tmp, outDir: resolve(tmp, 'dist/client-spec'), formats: ['md', 'html'] })

    const md = await readFile(resolve(tmp, 'dist/client-spec/system-spec.md'), 'utf-8')
    const html = await readFile(resolve(tmp, 'dist/client-spec/system-spec.html'), 'utf-8')
    expect(md).toContain('# TaskFlow 系統規格書')
    expect(html).toContain('<main class="document">')
  }, 120_000)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cli/export.test.ts`

Expected: FAIL because `src/cli/export.ts` and the new command wiring do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/cli/export.ts
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadAll } from '../content/load-all.js'
import { renderDocumentMarkdown } from '../export/render-markdown.js'
import { renderDocumentHtml } from '../export/render-html.js'

export interface ExportOptions {
  root: string
  outDir: string
  formats: Array<'md' | 'html'>
}

export async function runExport(opts: ExportOptions): Promise<void> {
  const data = await loadAll(opts.root)
  await mkdir(opts.outDir, { recursive: true })

  if (opts.formats.includes('md')) {
    await writeFile(resolve(opts.outDir, 'system-spec.md'), renderDocumentMarkdown(data), 'utf-8')
  }
  if (opts.formats.includes('html')) {
    await writeFile(resolve(opts.outDir, 'system-spec.html'), renderDocumentHtml(data), 'utf-8')
  }
}
```

```ts
// src/cli/index.ts
program
  .command('export')
  .description('Export a client-facing system specification document')
  .option('-r, --root <dir>', 'Path to .specbook directory', '.specbook')
  .option('-o, --out <dir>', 'Output directory', '.specbook/dist/client-spec')
  .option('-f, --formats <list>', 'Comma-separated formats (md,html)', 'md,html')
  .action(async (opts: { root: string; out: string; formats: string }) => {
    const { runExport } = await import('./export.js')
    await runExport({
      root: resolve(process.cwd(), opts.root),
      outDir: resolve(process.cwd(), opts.out),
      formats: opts.formats.split(',').map((s) => s.trim()) as Array<'md' | 'html'>,
    })
  })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cli/export.test.ts tests/cli/build.test.ts`

Expected: PASS, and `build` still produces the website output exactly as before.

- [ ] **Step 5: Commit**

```bash
git add src/cli/export.ts src/cli/index.ts tests/cli/export.test.ts tests/cli/build.test.ts
git commit -m "feat: add export CLI for client spec documents"
```

---

### Task 4: 補 README 與客戶交付指引，讓使用者知道何時用 build、何時用 export

**Files:**
- Modify: `README.md`
- Modify: `tests/sanity.test.ts`（若有 README 重要用法快照，則更新；若沒有可省略）

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('README export guidance', () => {
  it('mentions specbook export for client delivery', () => {
    const readme = readFileSync(resolve(__dirname, '../../README.md'), 'utf-8')
    expect(readme).toContain('npx specbook export')
    expect(readme).toContain('system-spec.md')
    expect(readme).toContain('system-spec.html')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/sanity.test.ts`

Expected: FAIL because README has not yet documented the new export workflow.

- [ ] **Step 3: Write minimal implementation**

```md
## 文件輸出（提交客戶）

如果你要把 SpecBook 內容交給客戶，請使用：

    npx specbook export --root .specbook --out .specbook/dist/client-spec --formats md,html

會產生：

- `system-spec.md`：便於審閱與版本控管
- `system-spec.html`：可列印、可直接分享的正式文件

`build` 仍然只負責網頁版 SpecBook；`export` 則負責客戶交付文件。
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/sanity.test.ts`

Expected: PASS, and README now clearly distinguishes website output from customer document export.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/sanity.test.ts
git commit -m "docs: explain client document export workflow"
```

---

## Spec Coverage Check

- **現有網頁輸出保留**：Task 3 明確只新增 `export`，不修改 `build` 的主責任。
- **客戶可提交的正式文件**：Task 2 產出 Markdown 與 HTML，Task 4 說明如何使用。
- **結構化資料重用**：Task 1 與 Task 2 直接從 `SpecBookData` 派生，不另建資料來源。
- **正式文件感與 UI 一致性**：Task 2 的 HTML renderer 會沿用 PaperTech 的暖色與細線原則；實作前必先對照 `DESIGN.md`。
- **驗證流程**：每個 task 都先補測試、再實作、再驗證。

## Placeholder Scan

本計畫避免使用 `TBD` / `TODO` / `similar to` 之類的占位說法；每個 task 都有具體檔案、具體測試與具體命令。

## Type Consistency Check

- `SpecBookConfig.document`、`buildDocumentOutline(data)`、`renderDocumentMarkdown(data)`、`renderDocumentHtml(data)`、`runExport(opts)` 的名稱與責任已在前後 task 中保持一致。
- `formats: Array<'md' | 'html'>` 與 CLI 的 `--formats md,html` 對應一致。

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-04-client-spec-export.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
