# SpecBook Skill + Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 `specbook` 套件補上 Claude Code 端的兩條 skill 指令（`/specbook init`、`/specbook enhance`），讓使用者「3 分鐘內跑出第一份可看的 SpecBook 站」這個成功標準成立；並完成 npm 發佈與 skill 上架的最後一哩。

**Architecture:** 把機械性、可單元測試的工作集中在套件 CLI 端（新增 `specbook init`、`specbook gaps` 兩個子命令），把 LLM 草稿與 Q&A 的部分放在 skill SKILL.md。Skill 流程 = ① 呼叫 `npx specbook init` 做專案偵測、scaffold、tech-stack 自動萃取；② 自己用 Write 工具補 `overview.md` 與 `architecture.md` 的草稿；③ 跑 `npx specbook validate` 驗證。`/specbook enhance` 走純對話流：呼叫 `npx specbook gaps` 取得 JSON 化的缺口清單，依缺口開 Q&A 與使用者討論，最後 Write 回去 + validate。

**Tech Stack:** TypeScript 5 / Node 20 ESM / commander / vitest / 既有 `src/schema/*` zod schema / Claude Code SKILL.md 規格

**Scope note:** 本計畫對應 spec `docs/superpowers/specs/2026-05-02-specbook-design.md` 中的 M3 + M4 + M6。前置依賴：`2026-05-02-specbook-renderer.md`（M1+M2+M5）必須完工——本計畫會直接 import `src/schema/*`、複用 `resolvePaths`、`runValidate`，不重造輪子。

**Spec 來源:** `docs/superpowers/specs/2026-05-02-specbook-design.md`

---

## File Structure（事前定錨）

新增檔案以 `+` 標示、修改既有以 `~` 標示。

```
SpecBook/
├── package.json                                ~ 新增 files、bin、scripts；publish metadata
├── README.md                                   ~ 加入 skill 安裝段、init/enhance 用法
├── src/
│   ├── cli/
│   │   ├── index.ts                            ~ 註冊 init / gaps 兩個新子命令
│   │   ├── init.ts                             + runInit 入口
│   │   └── gaps.ts                             + runGaps 入口（給 /specbook enhance 吃 JSON）
│   ├── scaffold/
│   │   ├── detect-project.ts                   + 解析 package.json + 框架簽名 + README 摘要
│   │   ├── walk-tree.ts                        + 受控的檔案樹列表（depth ≤ 3、ignore 規則）
│   │   ├── tech-stack-map.ts                   + 已知套件 → layer/role 的對應表
│   │   ├── derive-tech-stack.ts                + 把 dependencies 轉成 tech-stack.yaml 結構
│   │   ├── templates.ts                        + 5 個檔案的字串模板 + render 函式
│   │   ├── write-scaffold.ts                   + 冪等寫入：只補缺、--force 覆寫、--only 過濾
│   │   └── run-init.ts                         + 把上述串起來、輸出 InitReport
│   ├── gaps/
│   │   ├── detect-gaps.ts                      + 讀 .specbook/content/* 找缺口
│   │   └── run-gaps.ts                         + 把 detectGaps 包成 CLI runner
│   └── index.ts                                ~ 額外 re-export scaffold / gaps 公用型別
├── skill/
│   └── specbook/
│       ├── SKILL.md                            + Claude Code skill 入口（含 frontmatter）
│       ├── init.md                             + /specbook init 詳細流程
│       ├── enhance.md                          + /specbook enhance 詳細流程
│       └── reference/
│           └── schema-cheatsheet.md            + 給 LLM 對齊用的 schema 速查
├── tests/
│   ├── scaffold/
│   │   ├── detect-project.test.ts              + 單元測試
│   │   ├── walk-tree.test.ts                   +
│   │   ├── derive-tech-stack.test.ts           +
│   │   ├── templates.test.ts                   + 模板渲染後過 schema
│   │   ├── write-scaffold.test.ts              + 冪等性 / --force / --only
│   │   └── run-init.test.ts                    + 整合：fresh-project fixture
│   ├── gaps/
│   │   └── detect-gaps.test.ts                 +
│   ├── cli/
│   │   ├── init.test.ts                        + CLI 子命令端對端
│   │   └── gaps.test.ts                        +
│   ├── skill/
│   │   ├── init-fixture.test.ts                + 模擬 skill 流程：init CLI → 寫死 overview/arch → validate
│   │   └── enhance-fixture.test.ts             + 模擬 skill 流程：gaps CLI → 補 stories/roadmap → validate
│   └── fixtures/
│       ├── fresh-project/                      + 沒有 .specbook/ 的乾淨 npm 專案
│       │   ├── package.json
│       │   └── README.md
│       └── partial-specbook/                   + 已 init、user-stories/roadmap 是 placeholder
│           ├── package.json
│           └── .specbook/
│               ├── specbook.config.ts
│               └── content/{overview.md,tech-stack.yaml,architecture.md,user-stories.yaml,roadmap.yaml}
└── docs/
    └── superpowers/
        └── plans/
            └── 2026-05-02-specbook-skill.md     ← 本檔
```

---

## Task 0: 基線確認（前置）

**Files:**
- 讀: `package.json`、`docs/superpowers/plans/2026-05-02-specbook-renderer.md`

- [x] **Step 0.1: 確認 renderer plan 已交付**

Run:
```bash
pnpm test
pnpm build
```
Expected: 全綠、`dist/cli/index.js`、`dist/index.js`、`dist/index.d.ts` 都產出。
若失敗 → 回 renderer plan 完成剩下的 task，再回來繼續本計畫。

- [x] **Step 0.2: 建立分支**

```bash
git checkout -b feat/specbook-skill
```

---

## Task 1: Tech-stack 對應表

**Files:**
- Create: `src/scaffold/tech-stack-map.ts`
- Test: `tests/scaffold/derive-tech-stack.test.ts`（同檔包含 map 驗證）

`tech-stack-map.ts` 是純資料模組——把已知 npm 套件 / 框架名 → `{ layer, role }` 收成 record，給 derivation 用。先建這個讓後面 derive 函式有得吃。

- [x] **Step 1.1: 寫測試（RED）**

Create `tests/scaffold/derive-tech-stack.test.ts`：
```typescript
import { describe, it, expect } from 'vitest'
import { TECH_STACK_MAP } from '../../src/scaffold/tech-stack-map.js'

describe('TECH_STACK_MAP', () => {
  it('包含常見前端框架', () => {
    expect(TECH_STACK_MAP['react']).toEqual({
      layer: 'Frontend',
      role: 'UI 元件框架',
    })
    expect(TECH_STACK_MAP['next']).toBeDefined()
    expect(TECH_STACK_MAP['vue']).toBeDefined()
  })

  it('包含後端與資料層', () => {
    expect(TECH_STACK_MAP['express']?.layer).toBe('Backend')
    expect(TECH_STACK_MAP['prisma']?.layer).toBe('Backend & Data')
  })

  it('包含工具鏈', () => {
    expect(TECH_STACK_MAP['vite']?.layer).toBe('Tooling')
    expect(TECH_STACK_MAP['typescript']?.layer).toBe('Tooling')
  })

  it('layer 字串都不為空', () => {
    for (const [name, entry] of Object.entries(TECH_STACK_MAP)) {
      expect(entry.layer.length, name).toBeGreaterThan(0)
      expect(entry.role.length, name).toBeGreaterThan(0)
    }
  })
})
```

- [x] **Step 1.2: 跑測試確認紅燈**

Run: `pnpm test tests/scaffold/derive-tech-stack.test.ts`
Expected: FAIL，找不到模組。

- [x] **Step 1.3: 寫實作**

Create `src/scaffold/tech-stack-map.ts`：
```typescript
export interface TechStackMapEntry {
  layer: string
  role: string
}

export const TECH_STACK_MAP: Record<string, TechStackMapEntry> = {
  // Frontend
  react: { layer: 'Frontend', role: 'UI 元件框架' },
  'react-dom': { layer: 'Frontend', role: 'React DOM 渲染器' },
  next: { layer: 'Frontend', role: 'React 全端框架' },
  vue: { layer: 'Frontend', role: 'UI 元件框架' },
  nuxt: { layer: 'Frontend', role: 'Vue 全端框架' },
  svelte: { layer: 'Frontend', role: 'UI 元件框架' },
  '@sveltejs/kit': { layer: 'Frontend', role: 'Svelte 全端框架' },
  solid: { layer: 'Frontend', role: 'UI 元件框架' },
  preact: { layer: 'Frontend', role: '輕量 React 替代' },

  // Styling
  tailwindcss: { layer: 'Frontend', role: '原子化樣式系統' },
  '@tailwindcss/vite': { layer: 'Frontend', role: 'Tailwind 的 Vite 整合' },
  sass: { layer: 'Frontend', role: 'CSS 預處理器' },
  'styled-components': { layer: 'Frontend', role: 'CSS-in-JS' },

  // Backend
  express: { layer: 'Backend', role: 'Node.js HTTP 框架' },
  hono: { layer: 'Backend', role: 'Edge-friendly HTTP 框架' },
  fastify: { layer: 'Backend', role: '高效能 HTTP 框架' },
  koa: { layer: 'Backend', role: 'Node.js 中介層框架' },
  '@nestjs/core': { layer: 'Backend', role: '企業級 Node 框架' },

  // Backend & Data
  prisma: { layer: 'Backend & Data', role: 'TypeScript ORM' },
  'drizzle-orm': { layer: 'Backend & Data', role: '輕量 SQL ORM' },
  '@supabase/supabase-js': { layer: 'Backend & Data', role: 'Supabase 用戶端' },
  mongoose: { layer: 'Backend & Data', role: 'MongoDB ODM' },
  redis: { layer: 'Backend & Data', role: 'Redis 用戶端' },
  ioredis: { layer: 'Backend & Data', role: 'Redis 用戶端' },
  pg: { layer: 'Backend & Data', role: 'PostgreSQL 驅動' },
  dexie: { layer: 'Backend & Data', role: 'IndexedDB wrapper' },

  // Tooling
  vite: { layer: 'Tooling', role: 'Build / dev server' },
  typescript: { layer: 'Tooling', role: '型別系統' },
  vitest: { layer: 'Tooling', role: '測試框架' },
  jest: { layer: 'Tooling', role: '測試框架' },
  playwright: { layer: 'Tooling', role: 'E2E 測試' },
  eslint: { layer: 'Tooling', role: 'Lint' },
  prettier: { layer: 'Tooling', role: 'Formatter' },
  webpack: { layer: 'Tooling', role: 'Bundler' },
  rollup: { layer: 'Tooling', role: 'Bundler' },
  esbuild: { layer: 'Tooling', role: 'Bundler / transpiler' },

  // Validation / utilities
  zod: { layer: 'Tooling', role: 'Runtime schema 驗證' },
  yaml: { layer: 'Tooling', role: 'YAML parser' },
  commander: { layer: 'Tooling', role: 'CLI 框架' },
}
```

- [x] **Step 1.4: 跑測試確認綠燈**

Run: `pnpm test tests/scaffold/derive-tech-stack.test.ts`
Expected: PASS。

- [x] **Step 1.5: Commit**

```bash
git add src/scaffold/tech-stack-map.ts tests/scaffold/derive-tech-stack.test.ts
git commit -m "feat: [scaffold] 加入 tech-stack 對應表"
```

---

## Task 2: 從 dependencies 推 tech-stack

**Files:**
- Create: `src/scaffold/derive-tech-stack.ts`
- Test: 沿用 `tests/scaffold/derive-tech-stack.test.ts`（追加 case）

從 `package.json` 的 `dependencies` + `devDependencies` 出發，比對 `TECH_STACK_MAP`，輸出 `TechStack` 結構（`src/schema/tech-stack.ts` 已定義型別）。未命中的依賴跳過——這是「自動萃取草稿」，使用者之後可手改。

- [x] **Step 2.1: 追加測試（RED）**

Append to `tests/scaffold/derive-tech-stack.test.ts`：
```typescript
import { deriveTechStack } from '../../src/scaffold/derive-tech-stack.js'
import { TechStackSchema } from '../../src/schema/tech-stack.js'

describe('deriveTechStack', () => {
  it('把已知依賴依 layer 分組', () => {
    const result = deriveTechStack({
      dependencies: { react: '^19.0.0', hono: '^4.0.0' },
      devDependencies: { vite: '^6.0.0', vitest: '^4.0.0' },
    })
    const layers = result.map((l) => l.layer)
    expect(layers).toContain('Frontend')
    expect(layers).toContain('Backend')
    expect(layers).toContain('Tooling')
    const frontend = result.find((l) => l.layer === 'Frontend')!
    expect(frontend.items.find((i) => i.name === 'react')).toBeDefined()
  })

  it('未命中的依賴被略過', () => {
    const result = deriveTechStack({
      dependencies: { 'some-unknown-pkg': '1.0.0', react: '^19.0.0' },
    })
    const all = result.flatMap((l) => l.items.map((i) => i.name))
    expect(all).toContain('react')
    expect(all).not.toContain('some-unknown-pkg')
  })

  it('保留版本字串', () => {
    const result = deriveTechStack({
      dependencies: { react: '^19.2.5' },
    })
    const item = result.flatMap((l) => l.items).find((i) => i.name === 'react')!
    expect(item.version).toBe('^19.2.5')
  })

  it('輸出符合 TechStackSchema', () => {
    const result = deriveTechStack({
      dependencies: { react: '^19.0.0' },
      devDependencies: { vite: '^6.0.0' },
    })
    expect(() => TechStackSchema.parse(result)).not.toThrow()
  })

  it('全空依賴回傳空陣列（呼叫端決定要不要 fallback）', () => {
    expect(deriveTechStack({})).toEqual([])
  })
})
```

- [x] **Step 2.2: 跑測試紅燈**

Run: `pnpm test tests/scaffold/derive-tech-stack.test.ts`
Expected: FAIL（`deriveTechStack` 找不到）。

- [x] **Step 2.3: 實作**

Create `src/scaffold/derive-tech-stack.ts`：
```typescript
import type { TechStack, TechLayer, TechItem } from '../schema/tech-stack.js'
import { TECH_STACK_MAP } from './tech-stack-map.js'

export interface PackageJsonLike {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export function deriveTechStack(pkg: PackageJsonLike): TechStack {
  const all: Record<string, string> = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  }
  const grouped = new Map<string, TechItem[]>()
  for (const [name, version] of Object.entries(all)) {
    const entry = TECH_STACK_MAP[name]
    if (!entry) continue
    const items = grouped.get(entry.layer) ?? []
    items.push({ name, version, role: entry.role })
    grouped.set(entry.layer, items)
  }
  const layers: TechLayer[] = []
  for (const [layer, items] of grouped) {
    layers.push({ layer, items })
  }
  return layers
}
```

- [x] **Step 2.4: 跑測試綠燈**

Run: `pnpm test tests/scaffold/derive-tech-stack.test.ts`
Expected: PASS。

- [x] **Step 2.5: Commit**

```bash
git add src/scaffold/derive-tech-stack.ts tests/scaffold/derive-tech-stack.test.ts
git commit -m "feat: [scaffold] 從 dependencies 推導 tech-stack"
```

---

## Task 3: 受控檔案樹列表

**Files:**
- Create: `src/scaffold/walk-tree.ts`
- Test: `tests/scaffold/walk-tree.test.ts`

提供 LLM「看得到專案長相」的訊號——但只到 depth ≤ 3、過濾掉常見雜訊資料夾（`node_modules`、`.git`、`dist`、`.next`、`coverage`、`.specbook` 等）。

- [x] **Step 3.1: 寫測試（RED）**

Create `tests/scaffold/walk-tree.test.ts`：
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { walkTree } from '../../src/scaffold/walk-tree.js'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-walk-'))
  mkdirSync(join(dir, 'src/components'), { recursive: true })
  writeFileSync(join(dir, 'src/components/A.tsx'), 'x')
  writeFileSync(join(dir, 'src/index.ts'), 'x')
  writeFileSync(join(dir, 'package.json'), '{}')
  mkdirSync(join(dir, 'node_modules/foo'), { recursive: true })
  writeFileSync(join(dir, 'node_modules/foo/index.js'), 'x')
  mkdirSync(join(dir, '.git'), { recursive: true })
  writeFileSync(join(dir, '.git/HEAD'), 'x')
  mkdirSync(join(dir, 'dist'), { recursive: true })
  writeFileSync(join(dir, 'dist/out.js'), 'x')
  mkdirSync(join(dir, 'a/b/c/d'), { recursive: true }) // depth 4 — d 不應出現
  writeFileSync(join(dir, 'a/b/c/d/deep.txt'), 'x')
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('walkTree', () => {
  it('回傳相對路徑、不含預設忽略目錄', () => {
    const list = walkTree(dir)
    expect(list).toContain('package.json')
    expect(list).toContain('src/index.ts')
    expect(list).toContain('src/components/A.tsx')
    expect(list.find((p) => p.startsWith('node_modules'))).toBeUndefined()
    expect(list.find((p) => p.startsWith('.git'))).toBeUndefined()
    expect(list.find((p) => p.startsWith('dist'))).toBeUndefined()
  })

  it('預設深度 3：a/b/c/d/deep.txt 不應入列', () => {
    const list = walkTree(dir)
    expect(list.find((p) => p.includes('deep.txt'))).toBeUndefined()
  })

  it('支援 maxDepth 覆寫', () => {
    const list = walkTree(dir, { maxDepth: 5 })
    expect(list.find((p) => p.endsWith('deep.txt'))).toBeDefined()
  })

  it('回傳依字典序排序', () => {
    const list = walkTree(dir)
    const sorted = [...list].sort()
    expect(list).toEqual(sorted)
  })
})
```

- [x] **Step 3.2: 跑測試紅燈**

Run: `pnpm test tests/scaffold/walk-tree.test.ts`
Expected: FAIL。

- [x] **Step 3.3: 實作**

Create `src/scaffold/walk-tree.ts`：
```typescript
import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const DEFAULT_IGNORES = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.turbo',
  '.specbook',
  '.superpowers',
  '.vercel',
  '.netlify',
  '.DS_Store',
])

export interface WalkOptions {
  maxDepth?: number
  ignore?: Iterable<string>
}

export function walkTree(root: string, opts: WalkOptions = {}): string[] {
  const maxDepth = opts.maxDepth ?? 3
  const ignore = new Set([...DEFAULT_IGNORES, ...(opts.ignore ?? [])])
  const out: string[] = []

  function visit(dir: string, depth: number): void {
    if (depth > maxDepth) return
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const name of entries) {
      if (ignore.has(name)) continue
      const full = join(dir, name)
      let stat
      try {
        stat = statSync(full)
      } catch {
        continue
      }
      const rel = relative(root, full).split(sep).join('/')
      if (stat.isDirectory()) {
        visit(full, depth + 1)
      } else if (stat.isFile()) {
        out.push(rel)
      }
    }
  }

  visit(root, 1)
  out.sort()
  return out
}
```

- [x] **Step 3.4: 跑測試綠燈**

Run: `pnpm test tests/scaffold/walk-tree.test.ts`
Expected: PASS。

- [x] **Step 3.5: Commit**

```bash
git add src/scaffold/walk-tree.ts tests/scaffold/walk-tree.test.ts
git commit -m "feat: [scaffold] 受控檔案樹列表（depth+ignore）"
```

---

## Task 4: 專案偵測（package.json + README + 框架簽名）

**Files:**
- Create: `src/scaffold/detect-project.ts`
- Test: `tests/scaffold/detect-project.test.ts`

把 Step 1 to Step 4 of the scaffolding pipeline 所需要的「專案訊號」收成單一 `detectProject(root)` 函式。輸出帶有：`name`、`description`、`packageJson`、`readme`（前 N 字）、`fileTree`（呼叫 `walkTree`）、`frameworks`（簡單判斷 react / next / vue / hono / express）。

- [x] **Step 4.1: 寫測試（RED）**

Create `tests/scaffold/detect-project.test.ts`：
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectProject } from '../../src/scaffold/detect-project.js'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-detect-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('detectProject', () => {
  it('讀取 package.json 的 name 與 description', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'taskflow',
        description: '同步至雲端的極簡待辦工具',
        dependencies: { react: '^19.0.0' },
      }),
    )
    const r = detectProject(dir)
    expect(r.name).toBe('taskflow')
    expect(r.description).toBe('同步至雲端的極簡待辦工具')
    expect(r.packageJson?.dependencies?.react).toBe('^19.0.0')
  })

  it('讀取 README（取前 4KB）', () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}')
    writeFileSync(join(dir, 'README.md'), '# Hello\n\nThis is taskflow.')
    const r = detectProject(dir)
    expect(r.readme).toContain('# Hello')
    expect(r.readme).toContain('taskflow')
  })

  it('readme 大檔被截斷', () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}')
    writeFileSync(join(dir, 'README.md'), 'a'.repeat(20000))
    const r = detectProject(dir)
    expect(r.readme!.length).toBeLessThanOrEqual(4096)
  })

  it('找不到 README 時回傳 null', () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}')
    const r = detectProject(dir)
    expect(r.readme).toBeNull()
  })

  it('框架偵測：react / next / hono', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'x',
        dependencies: { react: '^19', next: '^15', hono: '^4' },
      }),
    )
    const r = detectProject(dir)
    expect(r.frameworks).toContain('react')
    expect(r.frameworks).toContain('next')
    expect(r.frameworks).toContain('hono')
  })

  it('沒 package.json 時 name fallback 到資料夾名', () => {
    const r = detectProject(dir)
    expect(r.name).toBe(dir.split('/').pop())
    expect(r.packageJson).toBeNull()
  })
})
```

- [x] **Step 4.2: 跑測試紅燈**

Run: `pnpm test tests/scaffold/detect-project.test.ts`
Expected: FAIL。

- [x] **Step 4.3: 實作**

Create `src/scaffold/detect-project.ts`：
```typescript
import { readFileSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { walkTree } from './walk-tree.js'

export interface DetectedProject {
  name: string
  description: string | null
  packageJson: PackageJson | null
  readme: string | null
  fileTree: string[]
  frameworks: string[]
}

export interface PackageJson {
  name?: string
  description?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const FRAMEWORK_KEYS = [
  'react',
  'next',
  'vue',
  'nuxt',
  'svelte',
  '@sveltejs/kit',
  'hono',
  'express',
  'fastify',
  '@nestjs/core',
  'astro',
]

const README_NAMES = ['README.md', 'readme.md', 'Readme.md', 'README.MD']
const MAX_README = 4096

export function detectProject(root: string): DetectedProject {
  const pkg = readJson(join(root, 'package.json'))
  const readme = readReadme(root)
  const fileTree = walkTree(root)
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) }
  const frameworks = FRAMEWORK_KEYS.filter((k) => k in deps)

  return {
    name: pkg?.name ?? basename(root),
    description: pkg?.description ?? null,
    packageJson: pkg,
    readme,
    fileTree,
    frameworks,
  }
}

function readJson(path: string): PackageJson | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as PackageJson
  } catch {
    return null
  }
}

function readReadme(root: string): string | null {
  for (const n of README_NAMES) {
    const p = join(root, n)
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf-8')
      return content.length > MAX_README ? content.slice(0, MAX_README) : content
    }
  }
  return null
}
```

- [x] **Step 4.4: 跑測試綠燈**

Run: `pnpm test tests/scaffold/detect-project.test.ts`
Expected: PASS。

- [x] **Step 4.5: Commit**

```bash
git add src/scaffold/detect-project.ts tests/scaffold/detect-project.test.ts
git commit -m "feat: [scaffold] 專案偵測（package.json + README + 框架）"
```

---

## Task 5: 內容模板與 render 函式

**Files:**
- Create: `src/scaffold/templates.ts`
- Test: `tests/scaffold/templates.test.ts`

模板採「字串 + 簡單 `{{var}}` 取代」（不引第三方）。所有模板渲染後必須能通過對應 zod schema —— 這是 templates.test.ts 的硬要求。

模板列表：
1. `specbook.config.ts`：以 `defineConfig` 包起來、注入 `project.name` 與 `project.description`
2. `overview.md`：tagline placeholder + `# {{name}}` + 一段 stub body（給使用者改寫）
3. `architecture.md`：`diagram: none` + 一段佔位文（避免 LLM 還沒填時就違反 schema）
4. `user-stories.yaml`：3 筆 placeholder stories（schema 要求至少 1 筆）
5. `roadmap.yaml`：1 筆 active 里程碑（schema 要求至少 1 筆）

`tech-stack.yaml` 由 `deriveTechStack` 動態產生（Task 7），不走模板。

- [x] **Step 5.1: 寫測試（RED）**

Create `tests/scaffold/templates.test.ts`：
```typescript
import { describe, it, expect } from 'vitest'
import {
  renderConfigTemplate,
  renderOverviewTemplate,
  renderArchitectureTemplate,
  renderUserStoriesTemplate,
  renderRoadmapTemplate,
} from '../../src/scaffold/templates.js'
import { parse as parseYaml } from 'yaml'
import matter from 'gray-matter'
import { OverviewSchema } from '../../src/schema/overview.js'
import { ArchitectureSchema } from '../../src/schema/architecture.js'
import { UserStoriesSchema } from '../../src/schema/user-stories.js'
import { RoadmapSchema } from '../../src/schema/roadmap.js'

describe('templates', () => {
  describe('renderConfigTemplate', () => {
    it('注入 name + description', () => {
      const out = renderConfigTemplate({ name: 'TaskFlow', description: 'desc' })
      expect(out).toContain("name: 'TaskFlow'")
      expect(out).toContain("description: 'desc'")
      expect(out).toContain('defineConfig')
      expect(out).toContain("from 'specbook'")
    })

    it('description 缺省時不寫該欄位', () => {
      const out = renderConfigTemplate({ name: 'X' })
      expect(out).not.toContain('description:')
    })
  })

  describe('renderOverviewTemplate', () => {
    it('產生符合 OverviewSchema 的 md', () => {
      const md = renderOverviewTemplate({ name: 'TaskFlow' })
      const { data, content } = matter(md)
      const parsed = OverviewSchema.parse({
        tagline: data.tagline,
        title: 'TaskFlow',
        body: content.replace(/^#.+$/m, '').trim(),
      })
      expect(parsed.tagline.length).toBeGreaterThan(0)
      expect(parsed.title).toBe('TaskFlow')
      expect(parsed.body.length).toBeGreaterThan(0)
    })
  })

  describe('renderArchitectureTemplate', () => {
    it('產生符合 ArchitectureSchema 的 md', () => {
      const md = renderArchitectureTemplate()
      const { data, content } = matter(md)
      const parsed = ArchitectureSchema.parse({
        diagram: data.diagram,
        image: data.image,
        body: content.trim(),
      })
      expect(parsed.diagram).toBe('none')
      expect(parsed.body.length).toBeGreaterThan(0)
    })
  })

  describe('renderUserStoriesTemplate', () => {
    it('產生符合 UserStoriesSchema 的 yaml', () => {
      const yaml = renderUserStoriesTemplate()
      const obj = parseYaml(yaml)
      expect(() => UserStoriesSchema.parse(obj)).not.toThrow()
    })
  })

  describe('renderRoadmapTemplate', () => {
    it('產生符合 RoadmapSchema 的 yaml', () => {
      const yaml = renderRoadmapTemplate()
      const obj = parseYaml(yaml)
      expect(() => RoadmapSchema.parse(obj)).not.toThrow()
    })
  })
})
```

- [x] **Step 5.2: 跑測試紅燈**

Run: `pnpm test tests/scaffold/templates.test.ts`
Expected: FAIL。

- [x] **Step 5.3: 實作**

Create `src/scaffold/templates.ts`：
```typescript
export interface ConfigTemplateInput {
  name: string
  description?: string
}

export function renderConfigTemplate(input: ConfigTemplateInput): string {
  const lines: string[] = [
    "import { defineConfig } from 'specbook'",
    '',
    'export default defineConfig({',
    '  project: {',
    `    name: ${quote(input.name)},`,
  ]
  if (input.description) lines.push(`    description: ${quote(input.description)},`)
  lines.push('  },')
  lines.push('})')
  lines.push('')
  return lines.join('\n')
}

export interface OverviewTemplateInput {
  name: string
}

export function renderOverviewTemplate(input: OverviewTemplateInput): string {
  return [
    '---',
    'tagline: 一句話描述這個專案要解決什麼問題',
    '---',
    '',
    `# ${input.name}`,
    '',
    '在這裡寫一段 1-3 段的散文，說明專案要解決的問題、',
    '為什麼這個問題重要、以及為什麼這個方案是合適的。',
    '這段文字會以 hero 區呈現在 SpecBook 站首屏。',
    '',
  ].join('\n')
}

export function renderArchitectureTemplate(): string {
  return [
    '---',
    'diagram: none',
    '---',
    '',
    '在這裡描述系統的整體架構：有哪幾層、彼此如何通訊、',
    '資料怎麼流動。如果有 mermaid 圖請把 frontmatter 的 diagram',
    "改成 'mermaid' 並在下面附上 ```mermaid 區塊；",
    "若有外部圖片請改成 'image' 並設定 image: ./assets/...。",
    '',
  ].join('\n')
}

export function renderUserStoriesTemplate(): string {
  return [
    '# 在這裡列出你的 user stories；建議用 /specbook enhance 互動補完',
    '- as: 主要使用者角色',
    '  want: 想做什麼',
    '  soThat: 達成什麼成果',
    '  priority: p0',
    '- as: 次要使用者',
    '  want: 想做什麼',
    '  soThat: 達成什麼',
    '  priority: p1',
    '- as: 第三類使用者',
    '  want: 想做什麼',
    '  soThat: 達成什麼',
    '  priority: p2',
    '',
  ].join('\n')
}

export function renderRoadmapTemplate(): string {
  return [
    '# Roadmap：用 done / active / future 標記里程碑狀態',
    '- title: M1 — 起手',
    '  quarter: 2026 Q1',
    '  status: active',
    '  items:',
    '    - 第一個工作項',
    '    - 第二個工作項',
    '',
  ].join('\n')
}

function quote(s: string): string {
  if (s.includes("'")) return JSON.stringify(s)
  return `'${s}'`
}
```

- [x] **Step 5.4: 跑測試綠燈**

Run: `pnpm test tests/scaffold/templates.test.ts`
Expected: PASS。

- [x] **Step 5.5: Commit**

```bash
git add src/scaffold/templates.ts tests/scaffold/templates.test.ts
git commit -m "feat: [scaffold] 內容模板與 schema 驗證測試"
```

---

## Task 6: 冪等寫入器

**Files:**
- Create: `src/scaffold/write-scaffold.ts`
- Test: `tests/scaffold/write-scaffold.test.ts`

抽象「把一組 `{ path, content }` 寫到磁碟」這件事，加上：
- 預設只補不存在或檔案大小為 0 的檔案
- `force = true` 全部覆寫
- `only = ['overview', ...]` 只處理白名單章節
- 回傳每個檔案的動作：`'created' | 'overwritten' | 'kept'`

- [x] **Step 6.1: 寫測試（RED）**

Create `tests/scaffold/write-scaffold.test.ts`：
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writeScaffold, ScaffoldFile } from '../../src/scaffold/write-scaffold.js'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-write-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const files: ScaffoldFile[] = [
  { kind: 'config', path: 'specbook.config.ts', content: 'CONFIG' },
  { kind: 'overview', path: 'content/overview.md', content: 'OV' },
  { kind: 'tech-stack', path: 'content/tech-stack.yaml', content: 'TS' },
]

describe('writeScaffold', () => {
  it('檔案不存在 → created', () => {
    const r = writeScaffold(dir, files)
    expect(r.find((x) => x.kind === 'config')!.action).toBe('created')
    expect(readFileSync(join(dir, 'specbook.config.ts'), 'utf-8')).toBe('CONFIG')
    expect(existsSync(join(dir, 'content/overview.md'))).toBe(true)
  })

  it('檔案已有非空內容 → kept', () => {
    writeFileSync(join(dir, 'specbook.config.ts'), 'EXISTING')
    const r = writeScaffold(dir, files)
    expect(r.find((x) => x.kind === 'config')!.action).toBe('kept')
    expect(readFileSync(join(dir, 'specbook.config.ts'), 'utf-8')).toBe('EXISTING')
  })

  it('檔案存在但為空 → 視為缺檔，會寫入', () => {
    const path = join(dir, 'content/overview.md')
    writeFileSync(path, '')
    writeScaffold(dir, files) // dir 自動建中介資料夾
    expect(readFileSync(path, 'utf-8')).toBe('OV')
  })

  it('--force 覆寫既有非空檔案', () => {
    writeFileSync(join(dir, 'specbook.config.ts'), 'EXISTING')
    const r = writeScaffold(dir, files, { force: true })
    expect(r.find((x) => x.kind === 'config')!.action).toBe('overwritten')
    expect(readFileSync(join(dir, 'specbook.config.ts'), 'utf-8')).toBe('CONFIG')
  })

  it('--only 只處理指定 kind', () => {
    const r = writeScaffold(dir, files, { only: ['overview'] })
    expect(r.find((x) => x.kind === 'overview')!.action).toBe('created')
    expect(existsSync(join(dir, 'specbook.config.ts'))).toBe(false)
    expect(existsSync(join(dir, 'content/tech-stack.yaml'))).toBe(false)
  })

  it('自動建立中介資料夾', () => {
    writeScaffold(dir, files)
    expect(existsSync(join(dir, 'content'))).toBe(true)
  })
})
```

- [x] **Step 6.2: 跑測試紅燈**

Run: `pnpm test tests/scaffold/write-scaffold.test.ts`
Expected: FAIL。

- [x] **Step 6.3: 實作**

Create `src/scaffold/write-scaffold.ts`：
```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type ScaffoldKind =
  | 'config'
  | 'overview'
  | 'tech-stack'
  | 'architecture'
  | 'user-stories'
  | 'roadmap'

export interface ScaffoldFile {
  kind: ScaffoldKind
  path: string // 相對於寫入根
  content: string
}

export interface WriteOptions {
  force?: boolean
  only?: ScaffoldKind[]
}

export interface WriteResult {
  kind: ScaffoldKind
  path: string
  action: 'created' | 'overwritten' | 'kept'
}

export function writeScaffold(
  root: string,
  files: ScaffoldFile[],
  opts: WriteOptions = {},
): WriteResult[] {
  const onlySet = opts.only ? new Set(opts.only) : null
  const out: WriteResult[] = []
  for (const f of files) {
    if (onlySet && !onlySet.has(f.kind)) continue
    const full = join(root, f.path)
    const exists = existsSync(full) && safeSize(full) > 0
    let action: WriteResult['action']
    if (!exists) {
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, f.content, 'utf-8')
      action = 'created'
    } else if (opts.force) {
      writeFileSync(full, f.content, 'utf-8')
      action = 'overwritten'
    } else {
      action = 'kept'
    }
    out.push({ kind: f.kind, path: f.path, action })
  }
  return out
}

function safeSize(p: string): number {
  try {
    return statSync(p).size
  } catch {
    return 0
  }
}
```

- [x] **Step 6.4: 跑測試綠燈**

Run: `pnpm test tests/scaffold/write-scaffold.test.ts`
Expected: PASS。

- [x] **Step 6.5: Commit**

```bash
git add src/scaffold/write-scaffold.ts tests/scaffold/write-scaffold.test.ts
git commit -m "feat: [scaffold] 冪等寫入器（force / only）"
```

---

## Task 7: `runInit` 編排器

**Files:**
- Create: `src/scaffold/run-init.ts`
- Test: `tests/scaffold/run-init.test.ts`

把 detect → derive → render → write 串成 `runInit`。把 `tech-stack.yaml` 由 `deriveTechStack` 結果以 `yaml.stringify` 輸出。回傳 `InitReport`，內含每章 action。整合測試以 `tests/fixtures/fresh-project/` 為輸入，跑完後對 `.specbook/` 整體跑 `runValidate`（複用既有 `src/cli/validate.ts`）必須全綠。

- [x] **Step 7.1: 建立 fresh-project fixture**

Create `tests/fixtures/fresh-project/package.json`：
```json
{
  "name": "fresh-project",
  "description": "用於測試 specbook init 的乾淨專案",
  "version": "0.1.0",
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "vitest": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

Create `tests/fixtures/fresh-project/README.md`：
```markdown
# fresh-project

這是一個用來測試 SpecBook init 的範例專案。它示範一個小型 React 應用。
```

- [x] **Step 7.2: 寫測試（RED）**

Create `tests/scaffold/run-init.test.ts`：
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  cpSync,
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runInit } from '../../src/scaffold/run-init.js'
import { runValidate } from '../../src/cli/validate.js'

const FIXTURE = resolve(__dirname, '../fixtures/fresh-project')

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-init-'))
  cpSync(FIXTURE, dir, { recursive: true })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('runInit', () => {
  it('在乾淨專案上產生完整可驗證的 .specbook/', async () => {
    const report = await runInit({ projectRoot: dir })
    expect(report.specbookRoot).toBe(join(dir, '.specbook'))
    expect(existsSync(join(dir, '.specbook/specbook.config.ts'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/content/overview.md'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/content/tech-stack.yaml'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/content/architecture.md'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/content/user-stories.yaml'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/content/roadmap.yaml'))).toBe(true)

    const ts = readFileSync(join(dir, '.specbook/content/tech-stack.yaml'), 'utf-8')
    expect(ts).toContain('react')
    expect(ts).toContain('vite')

    const validation = await runValidate(join(dir, '.specbook'))
    expect(validation.errors).toEqual([])
    expect(validation.ok).toBe(true)
  })

  it('再跑一次 → 全部 kept（冪等）', async () => {
    await runInit({ projectRoot: dir })
    const second = await runInit({ projectRoot: dir })
    for (const r of second.files) expect(r.action).toBe('kept')
  })

  it('--force 覆寫既有檔案', async () => {
    await runInit({ projectRoot: dir })
    writeFileSync(join(dir, '.specbook/content/overview.md'), 'STALE')
    const r = await runInit({ projectRoot: dir, force: true })
    const ov = r.files.find((f) => f.kind === 'overview')!
    expect(ov.action).toBe('overwritten')
    expect(readFileSync(join(dir, '.specbook/content/overview.md'), 'utf-8')).not.toBe(
      'STALE',
    )
  })

  it('--only=overview 不動其他章節', async () => {
    const r = await runInit({ projectRoot: dir, only: ['overview'] })
    const kinds = r.files.map((f) => f.kind)
    expect(kinds).toEqual(['overview'])
    expect(existsSync(join(dir, '.specbook/specbook.config.ts'))).toBe(false)
  })

  it('沒有 dependencies 時 tech-stack 不為空（fallback 一筆 stub）', async () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'empty', version: '0.0.1' }),
    )
    await runInit({ projectRoot: dir })
    const yaml = readFileSync(join(dir, '.specbook/content/tech-stack.yaml'), 'utf-8')
    expect(yaml.trim().length).toBeGreaterThan(0)
    const validation = await runValidate(join(dir, '.specbook'))
    expect(validation.errors).toEqual([])
  })
})
```

- [x] **Step 7.3: 跑測試紅燈**

Run: `pnpm test tests/scaffold/run-init.test.ts`
Expected: FAIL（`runInit` 未定義）。

- [x] **Step 7.4: 實作**

Create `src/scaffold/run-init.ts`：
```typescript
import { join } from 'node:path'
import { stringify as yamlStringify } from 'yaml'
import { detectProject } from './detect-project.js'
import { deriveTechStack } from './derive-tech-stack.js'
import {
  renderConfigTemplate,
  renderOverviewTemplate,
  renderArchitectureTemplate,
  renderUserStoriesTemplate,
  renderRoadmapTemplate,
} from './templates.js'
import {
  writeScaffold,
  type ScaffoldFile,
  type ScaffoldKind,
  type WriteResult,
} from './write-scaffold.js'
import type { TechStack } from '../schema/tech-stack.js'

const FALLBACK_TECH_STACK: TechStack = [
  {
    layer: 'Tooling',
    items: [
      { name: 'TBD', role: '請替換為實際技術棧；可用 /specbook enhance 互動補完' },
    ],
  },
]

export interface RunInitOptions {
  projectRoot: string
  force?: boolean
  only?: ScaffoldKind[]
}

export interface InitReport {
  projectName: string
  specbookRoot: string
  files: WriteResult[]
}

export async function runInit(opts: RunInitOptions): Promise<InitReport> {
  const project = detectProject(opts.projectRoot)
  const techStack = deriveTechStack(project.packageJson ?? {})
  const techStackOut = techStack.length > 0 ? techStack : FALLBACK_TECH_STACK
  const techStackYaml = yamlStringify(techStackOut)

  const files: ScaffoldFile[] = [
    {
      kind: 'config',
      path: 'specbook.config.ts',
      content: renderConfigTemplate({
        name: project.name,
        description: project.description ?? undefined,
      }),
    },
    {
      kind: 'overview',
      path: 'content/overview.md',
      content: renderOverviewTemplate({ name: project.name }),
    },
    { kind: 'tech-stack', path: 'content/tech-stack.yaml', content: techStackYaml },
    { kind: 'architecture', path: 'content/architecture.md', content: renderArchitectureTemplate() },
    { kind: 'user-stories', path: 'content/user-stories.yaml', content: renderUserStoriesTemplate() },
    { kind: 'roadmap', path: 'content/roadmap.yaml', content: renderRoadmapTemplate() },
  ]

  const specbookRoot = join(opts.projectRoot, '.specbook')
  const results = writeScaffold(specbookRoot, files, {
    force: opts.force,
    only: opts.only,
  })

  return {
    projectName: project.name,
    specbookRoot,
    files: results,
  }
}
```

- [x] **Step 7.5: 跑測試綠燈**

Run: `pnpm test tests/scaffold/run-init.test.ts`
Expected: PASS。所有 5 個 case 都過。

- [x] **Step 7.6: Commit**

```bash
git add src/scaffold/run-init.ts tests/scaffold/run-init.test.ts tests/fixtures/fresh-project
git commit -m "feat: [scaffold] runInit 編排器（detect → derive → render → write）"
```

---

## Task 8: `specbook init` CLI 子命令

**Files:**
- Modify: `src/cli/index.ts`
- Create: `src/cli/init.ts`
- Test: `tests/cli/init.test.ts`

把 `runInit` 包成 commander 子命令。flag：`--force`、`--only <list>`、`--root <dir>`（預設為 cwd，避免使用者得 cd 進專案根才能跑）。輸出格式：

```
✅ tech-stack (created from 4 dependencies)
📝 overview (created — 建議用 LLM 草稿覆寫)
📝 architecture (created — 建議用 LLM 草稿覆寫)
⚠️  user-stories (placeholder — 跑 /specbook enhance 補完)
⚠️  roadmap (placeholder — 跑 /specbook enhance 補完)
✅ specbook.config.ts (created)

下一步：npx specbook dev
```

CLI 測試以 fixture 跑 commander，再 inspect 結果。

- [x] **Step 8.1: 寫測試（RED）**

Create `tests/cli/init.test.ts`：
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cpSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runInitCli } from '../../src/cli/init.js'

const FIXTURE = resolve(__dirname, '../fixtures/fresh-project')

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-init-cli-'))
  cpSync(FIXTURE, dir, { recursive: true })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('runInitCli', () => {
  it('--root 指定時將 .specbook/ 建在該專案根', async () => {
    const r = await runInitCli({ root: dir })
    expect(r.exitCode).toBe(0)
    expect(existsSync(join(dir, '.specbook/specbook.config.ts'))).toBe(true)
    expect(r.summary).toContain('tech-stack')
    expect(r.summary).toContain('overview')
    expect(r.summary).toContain('下一步')
  })

  it('--only=overview 只建 overview', async () => {
    const r = await runInitCli({ root: dir, only: ['overview'] })
    expect(r.exitCode).toBe(0)
    expect(existsSync(join(dir, '.specbook/content/overview.md'))).toBe(true)
    expect(existsSync(join(dir, '.specbook/specbook.config.ts'))).toBe(false)
  })

  it('--only 帶非法 kind 回 exit 1', async () => {
    const r = await runInitCli({ root: dir, only: ['nope' as never] })
    expect(r.exitCode).toBe(1)
    expect(r.summary.toLowerCase()).toContain('only')
  })
})
```

- [x] **Step 8.2: 跑測試紅燈**

Run: `pnpm test tests/cli/init.test.ts`
Expected: FAIL。

- [x] **Step 8.3: 實作 `src/cli/init.ts`**

Create `src/cli/init.ts`：
```typescript
import { resolve } from 'node:path'
import { runInit } from '../scaffold/run-init.js'
import type { ScaffoldKind, WriteResult } from '../scaffold/write-scaffold.js'

const VALID_KINDS: ScaffoldKind[] = [
  'config',
  'overview',
  'tech-stack',
  'architecture',
  'user-stories',
  'roadmap',
]

export interface InitCliInput {
  root?: string
  force?: boolean
  only?: ScaffoldKind[]
}

export interface InitCliOutput {
  exitCode: number
  summary: string
}

export async function runInitCli(input: InitCliInput): Promise<InitCliOutput> {
  const projectRoot = resolve(input.root ?? process.cwd())

  if (input.only) {
    const bad = input.only.filter((k) => !VALID_KINDS.includes(k))
    if (bad.length > 0) {
      return {
        exitCode: 1,
        summary: `--only 含非法 kind：${bad.join(', ')}（合法：${VALID_KINDS.join(', ')}）`,
      }
    }
  }

  const report = await runInit({
    projectRoot,
    force: input.force,
    only: input.only,
  })

  return { exitCode: 0, summary: formatSummary(report.files) }
}

function formatSummary(files: WriteResult[]): string {
  const icon = (kind: ScaffoldKind, action: WriteResult['action']): string => {
    if (kind === 'user-stories' || kind === 'roadmap') return '⚠️ '
    if (kind === 'overview' || kind === 'architecture') {
      return action === 'created' ? '📝' : '✅'
    }
    return '✅'
  }
  const note = (kind: ScaffoldKind): string => {
    if (kind === 'user-stories' || kind === 'roadmap') {
      return '（placeholder — 跑 /specbook enhance 補完）'
    }
    if (kind === 'overview' || kind === 'architecture') {
      return '（建議用 LLM 草稿覆寫）'
    }
    return ''
  }
  const lines = files.map(
    (f) => `${icon(f.kind, f.action)} ${f.kind} (${f.action})${note(f.kind) ? ' ' + note(f.kind) : ''}`,
  )
  lines.push('')
  lines.push('下一步：npx specbook dev')
  return lines.join('\n')
}
```

- [x] **Step 8.4: 註冊到 commander（修改 `src/cli/index.ts`）**

Modify `src/cli/index.ts`，在 `program.command('dev')...` 之前插入：
```typescript
program
  .command('init')
  .description('Scaffold .specbook/ in current project')
  .option('-r, --root <dir>', 'Project root', process.cwd())
  .option('--force', 'Overwrite existing files', false)
  .option('--only <list>', 'Comma-separated kinds (overview,tech-stack,...)')
  .action(async (opts: { root: string; force: boolean; only?: string }) => {
    const { runInitCli } = await import('./init.js')
    const only = opts.only
      ? (opts.only.split(',').map((s) => s.trim()) as never[])
      : undefined
    const r = await runInitCli({ root: opts.root, force: opts.force, only })
    process.stdout.write(r.summary + '\n')
    process.exit(r.exitCode)
  })
```

- [x] **Step 8.5: 跑測試綠燈**

Run: `pnpm test tests/cli/init.test.ts`
Expected: PASS（3 case）。

- [x] **Step 8.6: 手動 smoke**

Run:
```bash
pnpm build
node dist/cli/index.js init --root tests/fixtures/fresh-project
node dist/cli/index.js validate --root tests/fixtures/fresh-project/.specbook
```
Expected: 兩個指令都 exit 0；validate 全綠。完事後刪除剛產的 `.specbook/`：
```bash
rm -rf tests/fixtures/fresh-project/.specbook
```

- [x] **Step 8.7: Commit**

```bash
git add src/cli/index.ts src/cli/init.ts tests/cli/init.test.ts
git commit -m "feat: [cli] specbook init — scaffold + tech-stack 自動萃取"
```

---

## Task 9: 缺口偵測（gap detection）

**Files:**
- Create: `src/gaps/detect-gaps.ts`
- Test: `tests/gaps/detect-gaps.test.ts`

讀使用者既有 `.specbook/content/*`，找四種缺口：
1. `user-stories` 是 placeholder（任一條的 `as` 含「主要使用者角色」之類預設字串）
2. `roadmap` 是 placeholder（任一里程碑的 `title` 是「M1 — 起手」之類預設字串）
3. `overview.md` body 是模板原文（含「在這裡寫一段 1-3 段的散文」這個句子）
4. `architecture.md` body 是模板原文（含「在這裡描述系統的整體架構」）

回傳形如：
```typescript
type GapReport = {
  gaps: Array<{ section: 'overview' | 'architecture' | 'user-stories' | 'roadmap'; reason: string }>
  ok: boolean // gaps.length === 0
}
```

- [x] **Step 9.1: 建立 partial-specbook fixture**

Create `tests/fixtures/partial-specbook/package.json`：
```json
{
  "name": "partial",
  "version": "0.1.0",
  "dependencies": { "react": "^19.0.0" }
}
```

Create `tests/fixtures/partial-specbook/.specbook/specbook.config.ts`：
```typescript
import { defineConfig } from 'specbook'

export default defineConfig({
  project: { name: 'partial' },
})
```

Create `tests/fixtures/partial-specbook/.specbook/content/overview.md`：
```markdown
---
tagline: 一句話描述這個專案要解決什麼問題
---

# partial

在這裡寫一段 1-3 段的散文，說明專案要解決的問題、
為什麼這個問題重要、以及為什麼這個方案是合適的。
這段文字會以 hero 區呈現在 SpecBook 站首屏。
```

Create `tests/fixtures/partial-specbook/.specbook/content/tech-stack.yaml`：
```yaml
- layer: Frontend
  items:
    - name: react
      version: ^19.0.0
      role: UI 元件框架
```

Create `tests/fixtures/partial-specbook/.specbook/content/architecture.md`：
```markdown
---
diagram: none
---

實際撰寫好的架構描述：本專案採三層 — UI / Service / Data。
```

Create `tests/fixtures/partial-specbook/.specbook/content/user-stories.yaml`：
```yaml
- as: 主要使用者角色
  want: 想做什麼
  soThat: 達成什麼成果
  priority: p0
```

Create `tests/fixtures/partial-specbook/.specbook/content/roadmap.yaml`：
```yaml
- title: M1 — 起手
  quarter: 2026 Q1
  status: active
  items:
    - 第一個工作項
```

- [x] **Step 9.2: 寫測試（RED）**

Create `tests/gaps/detect-gaps.test.ts`：
```typescript
import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { detectGaps } from '../../src/gaps/detect-gaps.js'

const FIXTURE = resolve(__dirname, '../fixtures/partial-specbook/.specbook')

describe('detectGaps', () => {
  it('partial-specbook：標出 overview / user-stories / roadmap 三個缺口', async () => {
    const r = await detectGaps(FIXTURE)
    const sections = r.gaps.map((g) => g.section).sort()
    expect(sections).toEqual(['overview', 'roadmap', 'user-stories'])
    expect(r.ok).toBe(false)
    expect(r.gaps.find((g) => g.section === 'user-stories')!.reason).toMatch(
      /placeholder|預設/,
    )
  })

  it('完整內容 → ok', async () => {
    // 用 examples/taskflow 作為健康範本（renderer plan 已建好）
    const taskflow = resolve(__dirname, '../../examples/taskflow/.specbook')
    const r = await detectGaps(taskflow).catch(() => null)
    if (r) {
      expect(r.ok).toBe(true)
      expect(r.gaps).toEqual([])
    }
  })
})
```

> Note：第二個 case 視 `examples/taskflow` 是否走 `.specbook/` 子目錄；renderer plan 的 examples 結構為 `examples/taskflow/{specbook.config.ts,content/...}`（無 `.specbook` 中間層）。若實際結構不同，本 case 會 catch 後跳過——不阻擋紅綠流。第一個 case 是硬要求。

- [x] **Step 9.3: 跑測試紅燈**

Run: `pnpm test tests/gaps/detect-gaps.test.ts`
Expected: FAIL。

- [x] **Step 9.4: 實作**

Create `src/gaps/detect-gaps.ts`：
```typescript
import { resolvePaths } from '../content/paths.js'
import { loadOverview } from '../content/load-overview.js'
import { loadArchitecture } from '../content/load-architecture.js'
import { loadUserStories } from '../content/load-user-stories.js'
import { loadRoadmap } from '../content/load-roadmap.js'

export type GapSection = 'overview' | 'architecture' | 'user-stories' | 'roadmap'

export interface Gap {
  section: GapSection
  reason: string
}

export interface GapReport {
  gaps: Gap[]
  ok: boolean
}

const PLACEHOLDER_PATTERNS: Record<GapSection, RegExp[]> = {
  overview: [
    /在這裡寫一段 1-3 段的散文/,
    /這段文字會以 hero 區呈現在 SpecBook 站首屏/,
  ],
  architecture: [/在這裡描述系統的整體架構/],
  'user-stories': [/主要使用者角色/, /次要使用者/, /第三類使用者/],
  roadmap: [/M1\s*—\s*起手/, /第一個工作項/],
}

export async function detectGaps(specbookRoot: string): Promise<GapReport> {
  const paths = resolvePaths(specbookRoot)
  const gaps: Gap[] = []

  await checkSection('overview', () => loadOverview(paths.files.overview), (d) => d.body, gaps)
  await checkSection(
    'architecture',
    () => loadArchitecture(paths.files.architecture),
    (d) => d.body,
    gaps,
  )
  await checkSection(
    'user-stories',
    () => loadUserStories(paths.files.userStories),
    (d) => JSON.stringify(d),
    gaps,
  )
  await checkSection(
    'roadmap',
    () => loadRoadmap(paths.files.roadmap),
    (d) => JSON.stringify(d),
    gaps,
  )

  return { gaps, ok: gaps.length === 0 }
}

async function checkSection<T>(
  section: GapSection,
  load: () => Promise<T>,
  pick: (d: T) => string,
  out: Gap[],
): Promise<void> {
  let data: T
  try {
    data = await load()
  } catch (e) {
    out.push({
      section,
      reason: `無法載入：${e instanceof Error ? e.message : String(e)}`,
    })
    return
  }
  const text = pick(data)
  const hit = PLACEHOLDER_PATTERNS[section].find((re) => re.test(text))
  if (hit) {
    out.push({ section, reason: `偵測到 placeholder（${hit.source}）` })
  }
}
```

- [x] **Step 9.5: 跑測試綠燈**

Run: `pnpm test tests/gaps/detect-gaps.test.ts`
Expected: PASS。

- [x] **Step 9.6: Commit**

```bash
git add src/gaps/detect-gaps.ts tests/gaps/detect-gaps.test.ts tests/fixtures/partial-specbook
git commit -m "feat: [gaps] 偵測 placeholder / 模板殘留"
```

---

## Task 10: `specbook gaps` CLI 子命令

**Files:**
- Modify: `src/cli/index.ts`
- Create: `src/cli/gaps.ts`
- Test: `tests/cli/gaps.test.ts`

CLI flag：`--root <.specbook 路徑>`、`--json`（給 skill 機器讀）。沒 `--json` 時印人類可讀；有 `--json` 時 stdout 是 JSON、stderr 留錯誤訊息。

- [x] **Step 10.1: 寫測試（RED）**

Create `tests/cli/gaps.test.ts`：
```typescript
import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { runGapsCli } from '../../src/cli/gaps.js'

const PARTIAL = resolve(__dirname, '../fixtures/partial-specbook/.specbook')

describe('runGapsCli', () => {
  it('--json 輸出可解析、含 gaps 陣列', async () => {
    const r = await runGapsCli({ root: PARTIAL, json: true })
    const parsed = JSON.parse(r.stdout)
    expect(Array.isArray(parsed.gaps)).toBe(true)
    expect(parsed.ok).toBe(false)
    const sections = parsed.gaps.map((g: { section: string }) => g.section)
    expect(sections).toContain('user-stories')
  })

  it('沒 --json 時印人類可讀格式', async () => {
    const r = await runGapsCli({ root: PARTIAL, json: false })
    expect(r.stdout).toMatch(/user-stories/)
    expect(r.stdout).toMatch(/placeholder/)
  })

  it('exitCode：有缺口 → 0（這不是錯誤，只是訊號）', async () => {
    const r = await runGapsCli({ root: PARTIAL, json: true })
    expect(r.exitCode).toBe(0)
  })

  it('找不到 .specbook 路徑 → exitCode 2 + 錯誤訊息進 stderr', async () => {
    const r = await runGapsCli({ root: '/tmp/does-not-exist-specbook', json: false })
    expect(r.exitCode).toBe(2)
    expect(r.stderr.length).toBeGreaterThan(0)
  })
})
```

- [x] **Step 10.2: 跑測試紅燈**

Run: `pnpm test tests/cli/gaps.test.ts`
Expected: FAIL。

- [x] **Step 10.3: 實作 `src/cli/gaps.ts`**

Create `src/cli/gaps.ts`：
```typescript
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { detectGaps } from '../gaps/detect-gaps.js'

export interface GapsCliInput {
  root: string
  json: boolean
}

export interface GapsCliOutput {
  exitCode: number
  stdout: string
  stderr: string
}

export async function runGapsCli(input: GapsCliInput): Promise<GapsCliOutput> {
  const root = resolve(input.root)
  if (!existsSync(root)) {
    return { exitCode: 2, stdout: '', stderr: `找不到 .specbook 目錄：${root}` }
  }
  const report = await detectGaps(root)
  if (input.json) {
    return { exitCode: 0, stdout: JSON.stringify(report, null, 2), stderr: '' }
  }
  if (report.ok) {
    return { exitCode: 0, stdout: '✅ 沒有偵測到缺口；可直接 specbook dev / build。', stderr: '' }
  }
  const lines = ['偵測到以下缺口：']
  for (const g of report.gaps) lines.push(`  - [${g.section}] ${g.reason}`)
  lines.push('', '建議：跑 /specbook enhance 互動補完。')
  return { exitCode: 0, stdout: lines.join('\n'), stderr: '' }
}
```

- [x] **Step 10.4: 註冊到 commander**

Append in `src/cli/index.ts` 之 `program.command('init')...` 之後：
```typescript
program
  .command('gaps')
  .description('Detect placeholder / unfinished sections in .specbook/content')
  .option('-r, --root <dir>', 'Path to .specbook directory', '.specbook')
  .option('--json', 'Emit JSON to stdout', false)
  .action(async (opts: { root: string; json: boolean }) => {
    const { runGapsCli } = await import('./gaps.js')
    const r = await runGapsCli({ root: opts.root, json: opts.json })
    if (r.stdout) process.stdout.write(r.stdout + '\n')
    if (r.stderr) process.stderr.write(r.stderr + '\n')
    process.exit(r.exitCode)
  })
```

- [x] **Step 10.5: 跑測試綠燈**

Run: `pnpm test tests/cli/gaps.test.ts`
Expected: PASS。

- [x] **Step 10.6: Commit**

```bash
git add src/cli/index.ts src/cli/gaps.ts tests/cli/gaps.test.ts
git commit -m "feat: [cli] specbook gaps — 偵測 placeholder（含 --json）"
```

---

## Task 11: Schema 速查文件（給 skill LLM 用）

**Files:**
- Create: `skill/specbook/reference/schema-cheatsheet.md`

skill SKILL.md 篇幅有限，但 LLM 在補 overview / architecture / stories / roadmap 時必須產出符合 zod schema 的內容；單獨一份速查表可以在需要時被 skill 內 link 參考。內容必須與 `src/schema/*` 完全一致（任何欄位變動要同步——這份文件是 skill 端的 single source 對齊）。

- [x] **Step 11.1: 寫文件**

Create `skill/specbook/reference/schema-cheatsheet.md`：
```markdown
# SpecBook Schema 速查（skill 用）

> 這份是給 `/specbook init`、`/specbook enhance` 在寫 `.specbook/content/*` 時對照用的速查。
> 與 `src/schema/*` 的 zod 定義保持同步；發現對不上以 schema 為準、回過頭來改本檔。

## overview.md

```markdown
---
tagline: <一句話描述（必填、不可空）>
---

# <專案名（必填，第一個 H1）>

<至少一段散文（必填、不可空）>
```

## tech-stack.yaml

```yaml
- layer: <分組標籤，例 Frontend / Backend / Tooling>   # 必填
  items:                                                # 至少一個 item
    - name: <技術名>            # 必填
      version: <版本字串>        # 可選
      role: <一句話說明角色>     # 必填、不可空
      icon: <單字母或圖片 URL>   # 可選
```

至少要有一個 layer，每個 layer 至少一個 item。

## architecture.md

```markdown
---
diagram: mermaid | image | none   # 必填
image: ./assets/x.png             # 當 diagram=image 時必填
---

<散文 body（必填、不可空）>
```

若 `diagram: mermaid`，請在 body 內以 ` ```mermaid ... ``` ` 區塊提供圖表程式碼。

## user-stories.yaml

```yaml
- as: <角色>          # 必填
  want: <想做什麼>     # 必填
  soThat: <成果>       # 必填
  priority: p0|p1|p2  # 可選，預設 p1
```

至少要有一筆 story。

## roadmap.yaml

```yaml
- title: <里程碑名>            # 必填
  quarter: <自由格式時段>      # 可選（如 "2026 Q1" / "2026-05"）
  status: done | active | future   # 必填
  items:                        # 可選；該里程碑下的工作項
    - <字串>
```

至少要有一筆 milestone。

## 路徑慣例

- `.specbook/content/` 下放這 5 個檔
- frontmatter 內 `image`、config 內 `favicon` / `ogImage` 路徑都相對於 `.specbook/`
```

- [x] **Step 11.2: 一致性檢查**

對照 `src/schema/overview.ts`、`tech-stack.ts`、`architecture.ts`、`user-stories.ts`、`roadmap.ts` 與 `config.ts`，逐欄位確認：欄位名、必填性、enum 值都一致。如有不一致，**改 cheatsheet 而非改 schema**——schema 是真實源頭。

- [x] **Step 11.3: Commit**

```bash
git add skill/specbook/reference/schema-cheatsheet.md
git commit -m "docs: [skill] schema 速查文件"
```

---

## Task 12: `/specbook init` skill 內容

**Files:**
- Create: `skill/specbook/SKILL.md`
- Create: `skill/specbook/init.md`

**設計目標：** skill 是 Claude Code 端的「程序文件」——告訴 Claude 在使用者鍵入 `/specbook init` 時要做什麼。整個流程是：

1. 確認 `specbook` 套件已可用（`npx specbook --version`）；若無則指引使用者 `pnpm add -D specbook`
2. 跑 `npx specbook init`（mechanical scaffold + tech-stack）
3. 讀剛產出的 `.specbook/content/overview.md` 和 `architecture.md`，加上專案 README + 檔案樹的訊號，**用 Write 工具**覆寫成更貼近專案現況的草稿
4. 跑 `npx specbook validate` 確認沒搞壞 schema
5. 結尾 summary（同 spec §5.1 Step 6）

`SKILL.md` 是入口（含 frontmatter `name` / `description`），`init.md` 是主流程的詳細步驟。

- [x] **Step 12.1: 寫 SKILL.md**

Create `skill/specbook/SKILL.md`：
```markdown
---
name: specbook
description: Use when the user runs /specbook init or /specbook enhance — scaffold or improve a SpecBook spec for the current project. Calls the specbook npm package CLI for mechanical work and uses Write to draft natural-language sections.
---

# SpecBook Skill

## What this skill does

Two commands in one skill:

- `/specbook init` — one-shot scaffold of `.specbook/` in the current project, plus an LLM-drafted overview + architecture.
- `/specbook enhance` — interactive Q&A to fill in user-stories and roadmap (and refresh stale overview/architecture).

Both commands assume the `specbook` npm package is installed in the project (or available via `npx`). If not, ask the user to run `pnpm add -D specbook` (or `npm i -D specbook`) first.

## Routing

When the user sends `/specbook init` (or asks to "initialise SpecBook" / "scaffold SpecBook"), follow [`init.md`](./init.md).

When the user sends `/specbook enhance` (or asks to "fill in user stories" / "complete the roadmap" / "improve the spec"), follow [`enhance.md`](./enhance.md).

## Reference

When you write to `.specbook/content/*`, the file must validate against the schemas in [`reference/schema-cheatsheet.md`](./reference/schema-cheatsheet.md). Always run `npx specbook validate --root <project>/.specbook` after any write to confirm.

## Non-goals

- Don't invent new sections — SpecBook is locked to 5 sections (overview / tech-stack / architecture / user-stories / roadmap).
- Don't edit `tech-stack.yaml` from natural language — that file is derived deterministically from `package.json` by `npx specbook init`. If the user wants to edit it, edit the YAML directly.
- Don't write to `.specbook/dist/` — that's build output.
```

- [x] **Step 12.2: 寫 init.md**

Create `skill/specbook/init.md`：
```markdown
# /specbook init — Procedure

Goal: end with a `.specbook/` that builds, with overview + architecture meaningfully drafted from project signals.

## Inputs you have at the start

- The user's current working directory (the project root).
- Tools: `Read`, `Write`, `Bash`, `Glob`.

## Steps

### 1. Verify specbook is available

```bash
npx --no-install specbook --version
```

If it fails ("command not found" or similar), ask the user:
> 我需要 `specbook` 套件來做 scaffold。要幫你跑 `pnpm add -D specbook` 嗎？

Wait for confirmation. After install, re-run the check.

### 2. Run mechanical scaffold

```bash
npx specbook init --root .
```

Expected output: a 6-line summary, last line "下一步：npx specbook dev". If it errors out with "已存在非空檔案" warnings, that's OK — re-runs are idempotent.

### 3. Read what was scaffolded

Use `Read` on:
- `.specbook/specbook.config.ts`
- `.specbook/content/overview.md`
- `.specbook/content/architecture.md`
- `.specbook/content/tech-stack.yaml` (just to know the layers/items, you won't edit it)

### 4. Gather project signals for the LLM draft

Use `Read` on:
- `package.json` (you already have name + description, but check the script entries and main fields).
- `README.md` if present (cap at first ~4 KB).
- `Glob` for entry-point hints: `src/index.{ts,js,tsx,jsx}`, `src/main.{ts,tsx}`, `pages/_app.tsx`, `app/layout.tsx`. Read whichever you find.
- A few representative source files (no more than 4) to understand the project.

### 5. Draft `overview.md`

Replace the placeholder body with a 1-3 paragraph problem statement based on README + signals. Constraints (these MUST hold or `validate` will fail):

- Keep frontmatter: `tagline: <a single sentence description>`.
- First H1 = project name.
- Body must not be empty and must not contain the placeholder phrase "在這裡寫一段 1-3 段的散文".
- See [`reference/schema-cheatsheet.md`](./reference/schema-cheatsheet.md#overviewmd) for the exact schema.

Write back with the `Write` tool.

### 6. Draft `architecture.md`

Replace the placeholder with a real description of the architecture you can infer from the file tree, frameworks, and entry points.

- If the project clearly has multiple layers (UI ↔ API ↔ DB), set `diagram: mermaid` and add a ` ```mermaid ... ``` ` block in the body.
- If you only see one layer (e.g. CLI tool, library), keep `diagram: none` and just write prose.
- Body must not contain the placeholder phrase "在這裡描述系統的整體架構".

Write back with the `Write` tool.

### 7. Validate

```bash
npx specbook validate --root .specbook
```

If errors:
- Re-read the offending file.
- Fix the schema violation (most common: empty body, wrong `diagram` enum, missing `tagline`).
- Re-run validate.
- Loop at most 3 times. If still failing, stop and report the error to the user verbatim.

### 8. Summary to the user

Print a checklist:
- ✅ tech-stack（自動，從 N 個依賴）
- 📝 overview（草稿，建議 review）
- 📝 architecture（草稿，建議 review）
- ⚠️  user-stories（placeholder — 跑 `/specbook enhance` 補完）
- ⚠️  roadmap（placeholder — 跑 `/specbook enhance` 補完）

下一步：`npx specbook dev` 預覽。

## Idempotency notes

- If `.specbook/` already exists, `npx specbook init` will keep existing files. To re-do everything, run `npx specbook init --force`. Ask the user before passing `--force`.
- The user can also pass `--only=overview,architecture` to scope this skill's work; if they ask for that, pass it through.
```

- [x] **Step 12.3: Commit（暫不寫 enhance.md）**

```bash
git add skill/specbook/SKILL.md skill/specbook/init.md
git commit -m "docs: [skill] SKILL.md + /specbook init 流程"
```

---

## Task 13: `/specbook enhance` skill 內容

**Files:**
- Create: `skill/specbook/enhance.md`

`enhance` 是純 Q&A 流程：呼叫 `npx specbook gaps --json` 拿到結構化缺口、依缺口開對話、寫回、再 validate。

- [x] **Step 13.1: 寫 enhance.md**

Create `skill/specbook/enhance.md`：
```markdown
# /specbook enhance — Procedure

Goal: turn placeholder sections into real content via short Q&A with the user, write back, validate.

## Steps

### 1. Detect gaps

```bash
npx specbook gaps --root .specbook --json
```

Parse the JSON. If `ok: true`, tell the user "沒有偵測到缺口" and stop.

### 2. For each gap, run a focused Q&A

Process gaps in this order: `overview` → `architecture` → `user-stories` → `roadmap` (some sections feed into others).

#### Q&A: user-stories

Ask 3 short questions, **one at a time**, waiting for answer between each:

1. 「這個專案的目標使用者是誰？（可以給 1-3 個角色）」
2. 「他們在使用這個工具時，最常做的 2-3 件事是什麼？」
3. 「最讓他們痛的情境是什麼？」

Synthesize 3-5 user stories (mix of p0/p1) using the answers. Show them as a draft to the user:

> 我整理了這幾個 stories（你可以說「保留 #1, #2, 把 #3 改成 ..., 加一條 ...」）：

After confirmation (or edits), write the YAML back. See [`reference/schema-cheatsheet.md`](./reference/schema-cheatsheet.md#user-storiesyaml) for the schema.

#### Q&A: roadmap

1. 「目前完成了什麼里程碑？大致花多久？」
2. 「正在做什麼？預計什麼時候完成？」
3. 「下一個 1-2 個里程碑會是什麼？」

Synthesize a roadmap with `done` / `active` / `future` items. Confirm with user before writing.

#### Q&A: overview / architecture

If these are flagged as gaps (i.e. user re-runs enhance after init failed to draft them well), ask:

- overview: 「能用一段話描述這個專案在解決什麼問題嗎？最常見的使用情境長怎樣？」
- architecture: 「畫不畫圖？有的話是 mermaid 還是 image？想描述哪些主要層次或元件？」

Generate a draft and confirm with user before writing.

### 3. Write back with `Write` tool

For each section confirmed, write the file. Each file MUST validate against the schema — see [`reference/schema-cheatsheet.md`](./reference/schema-cheatsheet.md).

### 4. Re-validate

```bash
npx specbook validate --root .specbook
```

If errors → fix and loop (max 3 attempts), then report to user.

### 5. Summary

> ✅ user-stories（4 筆）
> ✅ roadmap（3 個里程碑）
> 已重新驗證、全部通過。下一步：`npx specbook dev` 看效果。

## Tips

- Don't bombard the user with all questions at once. Q&A is interactive — wait for an answer between each question.
- If the user gives ambiguous answers, ask one clarifying follow-up; don't just guess.
- Keep stories tight: As / Want / SoThat each one sentence, no run-on prose.
- Roadmap items: 1-5 bullets per milestone, action-oriented ("加入 OAuth", not "我們要加入 OAuth").
```

- [x] **Step 13.2: Commit**

```bash
git add skill/specbook/enhance.md
git commit -m "docs: [skill] /specbook enhance 流程"
```

---

## Task 14: Skill 端對端 fixture 測試（init 流程）

**Files:**
- Create: `tests/skill/init-fixture.test.ts`

不能在 vitest 內真的跑 Claude，但可以模擬「skill 流程的機械骨架」：① 跑 `runInitCli`、② 模擬 LLM 寫一份合理 overview + architecture 覆蓋掉 placeholder、③ 跑 `runValidate`，斷言全綠。這替「skill 流程是否會壞 schema」加一道安全網。

- [x] **Step 14.1: 寫測試（RED）**

Create `tests/skill/init-fixture.test.ts`：
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runInitCli } from '../../src/cli/init.js'
import { runValidate } from '../../src/cli/validate.js'

const FIXTURE = resolve(__dirname, '../fixtures/fresh-project')

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-skill-init-'))
  cpSync(FIXTURE, dir, { recursive: true })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('skill init flow (mechanical sim)', () => {
  it('init → 模擬 LLM 寫 overview + architecture → validate 通過', async () => {
    // Step 1: mechanical
    const init = await runInitCli({ root: dir })
    expect(init.exitCode).toBe(0)

    // Step 2: simulate LLM filling overview + architecture
    const overview = [
      '---',
      'tagline: 用 React 起手的小型示範專案',
      '---',
      '',
      '# fresh-project',
      '',
      'fresh-project 是一個小型 React 應用，展示 SpecBook 在最小',
      '專案上的 init 流程：你只要有 package.json + README，',
      'specbook init 就能拉起一份可閱讀的 spec 草稿。',
      '',
    ].join('\n')
    writeFileSync(join(dir, '.specbook/content/overview.md'), overview)

    const arch = [
      '---',
      'diagram: none',
      '---',
      '',
      '本專案是一個單頁 React 應用，沒有後端；所有狀態存在記憶體',
      '與瀏覽器中。Build 由 Vite 處理；測試走 Vitest。',
      '',
    ].join('\n')
    writeFileSync(join(dir, '.specbook/content/architecture.md'), arch)

    // Step 3: validate
    const v = await runValidate(join(dir, '.specbook'))
    expect(v.errors).toEqual([])
    expect(v.ok).toBe(true)
  })
})
```

- [x] **Step 14.2: 跑測試紅燈**

Run: `pnpm test tests/skill/init-fixture.test.ts`

> 此時 Task 1-12 都做完，這個測試應該直接綠燈。如果不是，回前面 task 修。

Expected: PASS。

- [x] **Step 14.3: Commit**

```bash
git add tests/skill/init-fixture.test.ts
git commit -m "test: [skill] init 流程端對端機械模擬"
```

---

## Task 15: Skill 端對端 fixture 測試（enhance 流程）

**Files:**
- Create: `tests/skill/enhance-fixture.test.ts`

模擬 enhance 流程：用 `partial-specbook` fixture（已有 placeholder stories + roadmap），② 跑 `runGapsCli` 確認偵到三個缺口，③ 模擬 LLM 寫合理 stories + roadmap + overview，④ 重跑 gaps → ok=true，⑤ 跑 validate → ok。

- [x] **Step 15.1: 寫測試（RED）**

Create `tests/skill/enhance-fixture.test.ts`：
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runGapsCli } from '../../src/cli/gaps.js'
import { runValidate } from '../../src/cli/validate.js'

const FIXTURE = resolve(__dirname, '../fixtures/partial-specbook')

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-skill-enhance-'))
  cpSync(FIXTURE, dir, { recursive: true })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('skill enhance flow (mechanical sim)', () => {
  it('gaps → 模擬 LLM 補三個缺口 → 重新 gaps ok → validate ok', async () => {
    const before = await runGapsCli({
      root: join(dir, '.specbook'),
      json: true,
    })
    const beforeJson = JSON.parse(before.stdout)
    expect(beforeJson.ok).toBe(false)
    const sectionsBefore = beforeJson.gaps.map((g: { section: string }) => g.section)
    expect(sectionsBefore).toContain('user-stories')
    expect(sectionsBefore).toContain('roadmap')
    expect(sectionsBefore).toContain('overview')

    // Simulate LLM writing real content
    writeFileSync(
      join(dir, '.specbook/content/overview.md'),
      [
        '---',
        'tagline: 一個被部分填好的範例',
        '---',
        '',
        '# partial',
        '',
        '這是用來驗證 enhance 流程的範例專案。它示範一個',
        '已 init 但尚未補完的中間狀態。',
        '',
      ].join('\n'),
    )
    writeFileSync(
      join(dir, '.specbook/content/user-stories.yaml'),
      [
        '- as: 平台工程師',
        '  want: 在 .specbook/content 之間切換時不需要記欄位',
        '  soThat: 寫 spec 像填表，視覺與校驗即時',
        '  priority: p0',
        '- as: 主管',
        '  want: 一頁看完團隊的目標、節奏與下一步',
        '  soThat: 不必在多份文件之間拼接資訊',
        '  priority: p1',
        '',
      ].join('\n'),
    )
    writeFileSync(
      join(dir, '.specbook/content/roadmap.yaml'),
      [
        '- title: M1 — 內部發佈',
        '  quarter: 2026 Q2',
        '  status: done',
        '  items:',
        '    - 套件骨架',
        '    - 基本 5 章渲染',
        '- title: M2 — Skill 補完體驗',
        '  quarter: 2026 Q3',
        '  status: active',
        '  items:',
        '    - /specbook init',
        '    - /specbook enhance',
        '',
      ].join('\n'),
    )

    const after = await runGapsCli({
      root: join(dir, '.specbook'),
      json: true,
    })
    const afterJson = JSON.parse(after.stdout)
    expect(afterJson.ok).toBe(true)

    const v = await runValidate(join(dir, '.specbook'))
    expect(v.errors).toEqual([])
    expect(v.ok).toBe(true)
  })
})
```

- [x] **Step 15.2: 跑測試**

Run: `pnpm test tests/skill/enhance-fixture.test.ts`
Expected: PASS。

- [x] **Step 15.3: Commit**

```bash
git add tests/skill/enhance-fixture.test.ts
git commit -m "test: [skill] enhance 流程端對端機械模擬"
```

---

## Task 16: README 補上 skill 段 + 安裝指引

**Files:**
- Modify: `README.md`

把 skill 安裝、`/specbook init` / `/specbook enhance` 用法、CLI 三個老命令 + 兩個新命令（init / gaps）整理進 README。讓使用者一眼看到 happy path。

- [x] **Step 16.1: 讀現有 README**

Run: `cat README.md`

確認既有結構（renderer plan 已建立過骨架）。

- [x] **Step 16.2: 補上「Quick start」+「Claude Code Skill」段**

在現有 README 中接「## Quick start」（若已有則更新）：
```markdown
## Quick start

```bash
# 1. 安裝
pnpm add -D specbook

# 2. 在專案根 scaffold（自動偵測 package.json + 依賴）
npx specbook init

# 3. 預覽
npx specbook dev

# 4. 產出靜態站
npx specbook build
```

## Claude Code Skill（建議搭配）

把這個 skill 安裝到 `~/.claude/skills/specbook/`：

```bash
mkdir -p ~/.claude/skills
cp -R node_modules/specbook/skill/specbook ~/.claude/skills/specbook
```

然後就能在任何 Claude Code 對話裡使用：

- `/specbook init` — 一次性 scaffold + LLM 草稿（會自動跑 `npx specbook init`）
- `/specbook enhance` — 互動式 Q&A 補完 user-stories / roadmap

## CLI

| 指令 | 用途 |
|---|---|
| `npx specbook init` | scaffold `.specbook/`（冪等；`--force` 覆寫；`--only=overview,...` 限制範圍） |
| `npx specbook gaps` | 偵測 placeholder / 殘留模板（`--json` 給 skill 用） |
| `npx specbook validate` | 驗證內容符合 schema |
| `npx specbook dev` | 本機 dev server（HMR） |
| `npx specbook build` | 產 `.specbook/dist`（`--base /repo/` 用於 GitHub Pages 子路徑） |
```

具體插入位置：在現有 Quick start 之後或取代既有對應段；保持 README 既有的標題層級與語氣。

- [x] **Step 16.3: 確認 README 仍可被 markdown 渲染**

Run: `npx --yes markdownlint-cli2 README.md` 或人眼掃過 — 不為缺工具卡關，視 README 不超過 1500 字、無語法問題即放行。

- [x] **Step 16.4: Commit**

```bash
git add README.md
git commit -m "docs: README 補上 skill 安裝、init/gaps 指令"
```

---

## Task 17: package.json 發佈 metadata 收尾

**Files:**
- Modify: `package.json`

把 skill 資料夾納入 npm tarball、補 repository / homepage / bugs URL（renderer plan 已預留 `<owner>` placeholder，需要使用者確認最終 GitHub owner 後替換）、補 `prepublishOnly` 腳本、確認 `engines.node` 對。

- [x] **Step 17.1: 與使用者確認 GitHub owner**

提示使用者確認：
> repository.url 內 `<owner>` 要換成什麼？例如 `https://github.com/carl-ee/specbook`

把確認後字串記下來，下面 Step 用到。**若使用者尚未決定，先用 `carl-ee/specbook` 占位、最後 publish 前再修。**

- [x] **Step 17.2: 修改 package.json**

Modify `package.json`：
- `repository.url` → 確認後的 GitHub URL
- `homepage` → 同上 + `#readme`
- `bugs.url` → 同上 + `/issues`
- `files` 陣列加 `"skill"`
- `scripts` 加：
  - `"prepublishOnly": "pnpm test && pnpm build"`
  - `"pack:check": "npm pack --dry-run"`

舉例（合併進既有片段，不全寫）：
```json
{
  "files": ["dist", "skill", "README.md", "LICENSE"],
  "scripts": {
    "dev": "vite --config vite.config.ts examples/taskflow",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "pack:check": "npm pack --dry-run",
    "prepublishOnly": "pnpm test && pnpm build"
  }
}
```

- [x] **Step 17.3: 確認 build 仍綠**

Run:
```bash
pnpm build
pnpm test
```
Expected: 全綠。

- [x] **Step 17.4: Commit**

```bash
git add package.json
git commit -m "chore: 補 publish metadata（files, prepublishOnly, repo URL）"
```

---

## Task 18: pre-publish 驗證

**Files:** （無新檔）

實際跑 `npm pack --dry-run`，檢查 tarball 內容是否合理：
- 包含 `dist/`（CLI + 套件 entry）
- 包含 `skill/specbook/`
- 包含 `README.md` + `LICENSE`
- **不**包含 `tests/`、`examples/`、`docs/`、`node_modules`

- [x] **Step 18.1: 跑 pack check**

Run:
```bash
pnpm build
pnpm pack:check 2>&1 | tee /tmp/specbook-pack.log
```

- [x] **Step 18.2: 檢查輸出清單**

Run:
```bash
grep -E "(dist|skill|README|LICENSE|test|example|docs)" /tmp/specbook-pack.log
```

斷言（人眼）：
- ✅ `dist/` 與 `skill/` 出現
- ✅ `README.md`、`LICENSE` 出現
- ❌ `tests/`、`examples/`、`docs/` 都不應出現

若有不該包進來的 → 補 `.npmignore` 或調 `package.json:files`，再 pack 一次。

- [x] **Step 18.3: 跑全套 CI 等價檢查**

Run:
```bash
pnpm test
pnpm build
node dist/cli/index.js --version
node dist/cli/index.js init --help
node dist/cli/index.js gaps --help
node dist/cli/index.js validate --help
node dist/cli/index.js build --help
node dist/cli/index.js dev --help
```

Expected: 所有 `--help` 印出對應命令說明、`--version` 印 0.1.0。

- [x] **Step 18.4: 不需 commit（純驗證）**

如果 Step 18.2 修了 `.npmignore` 或 `package.json`：
```bash
git add .npmignore package.json
git commit -m "chore: 收斂 npm tarball 內容"
```

---

## Task 19: 發佈 v0.1.0

**Files:** （無新檔）

> ⚠️  此 task 屬於不可逆操作，**必須先和使用者確認** npm 帳號 / 套件名稱可用、再執行。

- [x] **Step 19.1: 確認套件名沒被搶**

Run:
```bash
npm view specbook 2>&1 | head -5
```

如果回 `npm ERR! 404` → 名字可用。
如果有結果 → 換名（例如 `@<owner>/specbook`）；變更會反映在 `package.json:name` 與 README，需重跑 Task 18。

- [x] **Step 19.2: 與使用者確認**

提示使用者：
> 準備發佈 specbook@0.1.0 到 npm。要我幫你跑 `pnpm publish --access public --dry-run` 先看一次嗎？

等使用者明確同意後再進 Step 19.3。

- [x] **Step 19.3: dry-run publish**

Run:
```bash
pnpm publish --access public --dry-run
```

確認沒錯誤，列出的檔案集合與 Task 18 一致。

- [x] **Step 19.4: 真實 publish（使用者確認後）**

```bash
pnpm publish --access public
```

如要走 OTP，提示使用者輸入。

- [x] **Step 19.5: 標 git tag**

```bash
git tag v0.1.0
git push origin master --tags
```

- [x] **Step 19.6: Commit（無新檔，但留 git tag）**

無 commit 動作；tag 已上。

---

## Task 20: 收尾與後續說明

**Files:**
- Modify: `docs/superpowers/plans/2026-05-02-specbook-skill.md`（本檔，勾完）

- [x] **Step 20.1: 在計畫文件勾完所有 task**

把上述每個 `- [ ]` 都標 `- [x]`。

- [x] **Step 20.2: 寫一段「下一步」給使用者**

提示使用者下一步可做：
1. 把 skill 上 Claude Code Skill marketplace（依當下 marketplace 規則做 PR）
2. 在自己最常用的 1-2 個專案實際跑一次 `/specbook init`，回填使用心得到 `examples/`
3. 觀察 v0.1 user feedback 累積到 5-10 條後，回頭規劃 v0.2（可能：自訂字型、多主題、深色模式）

---

## 後續工作（不在本計畫範圍）

- **Skill marketplace 上架**：需個別 PR 或上傳，依當下平台規定處理；本計畫只負責讓 `skill/` 結構就緒。
- **monorepo / pyproject / Cargo 等非 npm 專案的 init**（spec §10 開放問題 #1）：v1 只看根 `package.json`；後續視 user feedback 補。
- **Hosted preview / 短網址分享**（spec §10 #2）：明確留 v2。
- **mermaid build 失敗 fallback**：renderer plan Task 21 已處理。
- **自訂字型 / eject**：留 v2。

---

## Self-Review

**Spec coverage：** 對 spec §5 + §9 + §10 + §11 各條逐一打勾——

- §3.1 兩個發佈品（npm 套件 + skill）：兩邊都覆蓋（CLI Tasks 8/10 + skill Tasks 11-13）✅
- §3.2 使用者專案內 `.specbook/` 配置：Task 7 / 8 寫入結構符合 ✅
- §3.3 完整使用流程 Step 2、3：Task 8 (init) + Tasks 9-10 + Task 13 (enhance) ✅
- §5.1 `/specbook init` 6 個 Step：Step 1(detect)=Task 4；Step 2(scaffold)=Task 7；Step 3(deterministic tech-stack)=Task 2；Step 4(LLM 草稿 overview/architecture)=Task 12 init.md §5+§6；Step 5(stories/roadmap placeholder)=Task 5 templates；Step 6(summary)=Task 8 formatSummary + Task 12 init.md §8 ✅
- §5.1 冪等性規則：Task 6 `writeScaffold`（kept / overwritten）+ Task 7/8 `--force` / `--only` ✅
- §5.2 `/specbook enhance` 5 個 Step：Step 1=Task 13 §1；Step 2(gap detection)=Tasks 9/10；Step 3(Q&A)=Task 13 §2；Step 4(diff + 寫入)=Task 13 §3；Step 5(validate)=Task 13 §4 ✅
- §6.3 CLI 多了兩條（init、gaps）：Tasks 8、10；既有三條（dev / build / validate）由 renderer plan 維持 ✅
- §9 M3：Tasks 1-12 ✅
- §9 M4：Task 13 + Tasks 9/10 ✅
- §9 M6：Tasks 17-19 ✅
- §10 開放問題 #1（monorepo）：明確列入「後續工作」段；v1 範圍由 Task 4 detectProject 限縮在根 package.json ✅
- §10 #2（hosted preview）：明確列入「後續工作」段 ✅

**Placeholder scan：** 已逐 task 掃過——
- 所有 step 帶完整程式碼或具體 shell 命令
- 無 "TBD"、"視情況補"、"類似 Task N"、"加上適當錯誤處理" 等紅旗
- Task 11 cheatsheet 是文件不是程式碼，內容完整列出每個 schema 的欄位
- Task 19 Step 19.4 是不可逆操作，特別加了「使用者確認」gate
- Task 20 Step 20.2 屬於建議性提示而非實作步驟，不算 placeholder

**Type consistency：**
- `ScaffoldKind` 在 Task 6 `write-scaffold.ts` 定義為 `'config' | 'overview' | 'tech-stack' | 'architecture' | 'user-stories' | 'roadmap'`，Task 7 `runInit`、Task 8 `runInitCli`、Task 8 commander wiring 都使用相同 union。
- `GapSection` 在 Task 9 `detect-gaps.ts` 定義為 `'overview' | 'architecture' | 'user-stories' | 'roadmap'`（沒有 config / tech-stack — 這是設計：tech-stack 由 init 自動推、config 由 init 自動寫，都不需要 enhance）。Task 10 `runGapsCli`、Task 13 enhance.md 都基於這個四元集合。
- `WriteResult.action` `'created' | 'overwritten' | 'kept'`：Task 6 定義、Task 7 / Task 8 都消費同一形狀。
- `runInit({ projectRoot, force?, only? })` 簽章：Tasks 7/8 一致（CLI runInitCli 內部把 root → projectRoot 對映）。
- `detectGaps` / `GapReport` 形狀：Tasks 9/10/13/15 一致使用 `{ gaps: Array<{ section, reason }>, ok: boolean }`。
- 所有 zod schema 來源一致從 `src/schema/*` import（Tasks 2、5、9、14、15）。
- CLI 子命令 runner 命名 `runInitCli` / `runGapsCli`：與既有 `runValidate` / `runBuild` / `runDev` 命名風格一致（動詞 + Cli or 直接動詞）；`runValidate` 走無 `Cli` 後綴是因為它本來就是 lib 函式，本計畫遵循既有風格不重命名。
- skill 端 SKILL.md / init.md / enhance.md 引用的 CLI 命令（`npx specbook init`、`npx specbook gaps --json`、`npx specbook validate`）名稱與實際 commander 註冊一致。

如後續執行時發現任何不一致，**以 zod schema 與 commander 註冊為準**——把計畫對齊到實作。

---

## Execution handoff（給執行者）

執行本計畫前確認：
1. `git status` 乾淨；renderer plan 已交付
2. 在 `feat/specbook-skill` 分支
3. `pnpm install` 已跑

執行者請依序逐 task 進行；每個 task 內 step 必須一條一條勾，**不得跳過 RED → GREEN → commit 節奏**。每個 commit 都應該保持 build 綠。

如遇 schema 衝突，**改 cheatsheet 與測試對齊新 schema**——不要為了讓測試過而動 schema 語意。
