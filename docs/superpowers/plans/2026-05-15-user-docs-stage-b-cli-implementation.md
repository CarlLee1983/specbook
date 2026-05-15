# User Docs — Stage B (specbook docs CLI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 SpecBook 內實作 `specbook docs <action>` 子命令樹（init / validate / dev / build），把 writing-user-docs skill 的「md+html 雙格式 + doc-key 對齊 + locale parity + coverage」契約內化為 TypeScript 模組，無需 bun / 外部 skill 依賴。

**Architecture:** 新 `src/docs/` 模組（與 `src/export/` 平行）持有：scaffold templates、doc-key parser、validator、build。新 `src/cli/docs.ts` 提供 commander 子命令樹，於 `src/cli/index.ts` 註冊。Config 透過 `src/schema/docs.ts` 描述 `docs.user`。錯誤訊息透過既有 `src/i18n/` namespace `docs.user.*`。

**Tech Stack:** TypeScript ESM、vitest、commander、zod、Node.js built-in http (dev server)。不引入新 runtime 依賴。

**Upstream spec:** `docs/superpowers/specs/2026-05-15-user-docs-integration-design.md`

---

## File Map

### Create
- `src/schema/docs.ts` — `DocsUserSchema` zod
- `src/docs/coverage.ts` — 10 類別 + helpers
- `src/docs/doc-keys.ts` — parser / duplicates / format check
- `src/docs/validator.ts` — `validateUserDocs(rootDir, config) → ValidationResult`
- `src/docs/scaffold.ts` — `scaffoldUserDocs(opts) → ScaffoldResult`
- `src/docs/build.ts` — `buildUserDocs(opts) → void`
- `src/docs/index.ts` — barrel for `specbook/docs` subpath export
- `src/docs/templates/index.md.tmpl`
- `src/docs/templates/index.html.tmpl`
- `src/docs/templates/themes/anthropic-warm.css`
- `src/cli/docs.ts` — commander subcommand group
- `tests/schema/docs.test.ts`
- `tests/docs/coverage.test.ts`
- `tests/docs/doc-keys.test.ts`
- `tests/docs/validator.test.ts`
- `tests/docs/scaffold.test.ts`
- `tests/docs/build.test.ts`
- `tests/cli/docs.test.ts`
- `tests/fixtures/user-docs/happy/{en,zh-TW}/{index.md,index.html}`
- `tests/fixtures/user-docs/order-mismatch/{en,zh-TW}/{index.md,index.html}`
- `tests/fixtures/user-docs/locale-drift/{en,zh-TW}/{index.md,index.html}`
- `tests/fixtures/user-docs/duplicate/{en,zh-TW}/{index.md,index.html}`
- `tests/fixtures/user-docs/missing-key/{en,zh-TW}/{index.md,index.html}`
- `tests/fixtures/user-docs/missing-file/en/index.md` (zh-TW 目錄整個缺)

### Modify
- `src/schema/config.ts` — 加 `docs?: DocsSchema`
- `src/schema/index.ts` — re-export
- `src/cli/index.ts` — 註冊 `docs` 子命令
- `src/i18n/zh-TW.ts` — 加 `docs.user.*` namespace
- `src/i18n/en.ts` — 同上
- `package.json` — `exports` 加 `./docs` subpath
- `scripts/copy-build-assets.mjs` — 複製 `src/docs/templates/` 到 `dist/docs/templates/`

---

### Task 1: Schema — DocsUserSchema 與 config 整合

**Files:**
- Create: `src/schema/docs.ts`
- Create: `tests/schema/docs.test.ts`
- Modify: `src/schema/config.ts`
- Modify: `src/schema/index.ts`

- [ ] **Step 1: 寫 failing test**

`tests/schema/docs.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { DocsUserSchema, DocsSchema, THEMES } from '../../src/schema/docs'

describe('DocsUserSchema', () => {
  it('accepts minimal valid input', () => {
    const r = DocsUserSchema.parse({
      enabled: true,
      locales: ['zh-TW', 'en'],
      theme: 'anthropic-warm',
      coverage: 'all',
    })
    expect(r.locales).toEqual(['zh-TW', 'en'])
    expect(r.theme).toBe('anthropic-warm')
    expect(r.coverage).toBe('all')
  })

  it('defaults enabled=false, theme=anthropic-warm, coverage=all', () => {
    const r = DocsUserSchema.parse({ locales: ['zh-TW'] })
    expect(r.enabled).toBe(false)
    expect(r.theme).toBe('anthropic-warm')
    expect(r.coverage).toBe('all')
  })

  it('accepts coverage as kebab-case string array', () => {
    const r = DocsUserSchema.parse({
      locales: ['zh-TW'],
      coverage: ['install-setup', 'discovery-read'],
    })
    expect(r.coverage).toEqual(['install-setup', 'discovery-read'])
  })

  it('rejects empty locales', () => {
    expect(() => DocsUserSchema.parse({ locales: [] })).toThrow(/locale/i)
  })

  it('rejects invalid locale tags', () => {
    expect(() => DocsUserSchema.parse({ locales: ['ZH_TW'] })).toThrow()
  })

  it('rejects unknown theme', () => {
    expect(() =>
      DocsUserSchema.parse({ locales: ['zh-TW'], theme: 'cool-tech' })
    ).toThrow(/theme/i)
  })

  it('rejects coverage strings that are not kebab-case', () => {
    expect(() =>
      DocsUserSchema.parse({ locales: ['zh-TW'], coverage: ['Install_Setup'] })
    ).toThrow()
  })

  it('THEMES contains anthropic-warm only in V1', () => {
    expect([...THEMES]).toEqual(['anthropic-warm'])
  })
})

describe('DocsSchema', () => {
  it('user is optional', () => {
    const r = DocsSchema.parse({})
    expect(r.user).toBeUndefined()
  })

  it('wraps a valid user config', () => {
    const r = DocsSchema.parse({ user: { locales: ['en'] } })
    expect(r.user?.locales).toEqual(['en'])
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
pnpm test tests/schema/docs.test.ts
```
Expected: Module not found error or all 9 tests failing.

- [ ] **Step 3: Implement `src/schema/docs.ts`**

```typescript
import { z } from 'zod'

export const THEMES = ['anthropic-warm'] as const
export type Theme = (typeof THEMES)[number]

const LOCALE_RE = /^[a-z]{2}(-[A-Z]{2})?$/
const KEBAB_RE = /^[a-z0-9-]+$/

export const DocsUserSchema = z.object({
  enabled: z.boolean().default(false),
  locales: z
    .array(z.string().regex(LOCALE_RE, 'locale must be like "en" or "zh-TW"'))
    .min(1, 'at least one locale required'),
  theme: z.enum(THEMES).default('anthropic-warm'),
  coverage: z
    .union([z.literal('all'), z.array(z.string().regex(KEBAB_RE)).min(1)])
    .default('all'),
})

export type DocsUserConfig = z.infer<typeof DocsUserSchema>

export const DocsSchema = z.object({
  user: DocsUserSchema.optional(),
})

export type DocsConfig = z.infer<typeof DocsSchema>
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm test tests/schema/docs.test.ts
```
Expected: 9 tests pass.

- [ ] **Step 5: 整合進 config schema**

Read `src/schema/config.ts`。在 root config object 加 `docs` 欄位（optional）：

```typescript
import { DocsSchema } from './docs.js'

// 在 ConfigSchema 內加：
docs: DocsSchema.optional(),
```

- [ ] **Step 6: 從 src/schema/index.ts re-export**

加入：
```typescript
export * from './docs.js'
```

- [ ] **Step 7: 跑全測試確認沒打壞**

```bash
pnpm test
```
Expected: 既有 145 + 新 9 個全 pass。

- [ ] **Step 8: Commit**

```bash
git add src/schema/docs.ts src/schema/config.ts src/schema/index.ts tests/schema/docs.test.ts
git commit -m "feat: [schema] add docs.user config schema"
```

---

### Task 2: Coverage mapping

**Files:**
- Create: `src/docs/coverage.ts`
- Create: `tests/docs/coverage.test.ts`

- [ ] **Step 1: Failing test**

`tests/docs/coverage.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import {
  ALL_CATEGORIES,
  OVERVIEW_KEY,
  resolveCoverage,
  normalizeCoverageFlag,
} from '../../src/docs/coverage'

describe('ALL_CATEGORIES', () => {
  it('lists 10 categories in skill order', () => {
    expect(ALL_CATEGORIES).toEqual([
      'install-setup',
      'connections',
      'discovery-read',
      'writes-mutations',
      'advanced-tools',
      'diagnostics-recovery',
      'engine-support',
      'ai-integration',
      'visual-surfaces',
      'documentation-maintenance',
    ])
  })
})

describe('resolveCoverage', () => {
  it('expands "all" to overview + 10 categories', () => {
    const r = resolveCoverage('all')
    expect('keys' in r).toBe(true)
    if ('keys' in r) {
      expect(r.keys[0]).toBe(OVERVIEW_KEY)
      expect(r.keys.length).toBe(11)
    }
  })

  it('accepts array subset and prepends overview', () => {
    const r = resolveCoverage(['install-setup', 'discovery-read'])
    if ('keys' in r) {
      expect(r.keys).toEqual(['overview', 'install-setup', 'discovery-read'])
    } else {
      throw new Error('expected ok result')
    }
  })

  it('rejects unknown doc-key', () => {
    const r = resolveCoverage(['not-a-real-key'])
    expect('error' in r).toBe(true)
  })
})

describe('normalizeCoverageFlag', () => {
  it('passes through "all"', () => {
    expect(normalizeCoverageFlag('all')).toBe('all')
  })

  it('converts numeric list to kebab-case array', () => {
    const r = normalizeCoverageFlag('1,3,4')
    expect(r).toEqual(['install-setup', 'discovery-read', 'writes-mutations'])
  })

  it('keeps kebab-case list as array', () => {
    const r = normalizeCoverageFlag('install-setup,discovery-read')
    expect(r).toEqual(['install-setup', 'discovery-read'])
  })

  it('errors on out-of-range index', () => {
    const r = normalizeCoverageFlag('99')
    expect(typeof r === 'object' && 'error' in r).toBe(true)
  })

  it('errors on empty input', () => {
    const r = normalizeCoverageFlag('')
    expect(typeof r === 'object' && 'error' in r).toBe(true)
  })

  it('errors on mixed numeric + kebab-case', () => {
    const r = normalizeCoverageFlag('1,install-setup')
    expect(typeof r === 'object' && 'error' in r).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
pnpm test tests/docs/coverage.test.ts
```

- [ ] **Step 3: Implement `src/docs/coverage.ts`**

```typescript
export const ALL_CATEGORIES = [
  'install-setup',
  'connections',
  'discovery-read',
  'writes-mutations',
  'advanced-tools',
  'diagnostics-recovery',
  'engine-support',
  'ai-integration',
  'visual-surfaces',
  'documentation-maintenance',
] as const

export type Category = (typeof ALL_CATEGORIES)[number]

export const OVERVIEW_KEY = 'overview' as const

export type CoverageResult =
  | { keys: readonly string[] }
  | { error: string }

export function resolveCoverage(
  coverage: 'all' | readonly string[],
): CoverageResult {
  if (coverage === 'all') {
    return { keys: [OVERVIEW_KEY, ...ALL_CATEGORIES] }
  }
  const invalid = coverage.filter(
    (k) => !ALL_CATEGORIES.includes(k as Category),
  )
  if (invalid.length > 0) {
    return { error: `Invalid coverage doc-keys: ${invalid.join(', ')}` }
  }
  return { keys: [OVERVIEW_KEY, ...coverage] }
}

export type NormalizeFlagResult = 'all' | string[] | { error: string }

export function normalizeCoverageFlag(input: string): NormalizeFlagResult {
  const trimmed = input.trim()
  if (trimmed === 'all') return 'all'
  if (trimmed === '') return { error: 'coverage cannot be empty' }

  const parts = trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) return { error: 'coverage cannot be empty' }

  const allNumeric = parts.every((p) => /^\d+$/.test(p))
  const allKebab = parts.every((p) => /^[a-z][a-z0-9-]*$/.test(p))

  if (!allNumeric && !allKebab) {
    return { error: 'coverage must be all-numeric or all-kebab-case, not mixed' }
  }

  if (allNumeric) {
    const result: string[] = []
    for (const p of parts) {
      const n = Number(p)
      if (n < 1 || n > ALL_CATEGORIES.length) {
        return {
          error: `coverage index out of range: ${n} (valid 1-${ALL_CATEGORIES.length})`,
        }
      }
      result.push(ALL_CATEGORIES[n - 1]!)
    }
    return result
  }

  return parts
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test tests/docs/coverage.test.ts
```
Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/docs/coverage.ts tests/docs/coverage.test.ts
git commit -m "feat: [docs] add coverage category mapping"
```

---

### Task 3: doc-keys parser

**Files:**
- Create: `src/docs/doc-keys.ts`
- Create: `tests/docs/doc-keys.test.ts`

- [ ] **Step 1: Failing test**

`tests/docs/doc-keys.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import {
  parseDocKeys,
  findDuplicates,
  isValidDocKeyFormat,
  ordersMatch,
} from '../../src/docs/doc-keys'

describe('parseDocKeys', () => {
  it('extracts doc-keys in order', () => {
    const src = `
# Title
<!-- doc-key: overview -->
## A
<!-- doc-key: install-setup -->
## B
`
    expect(parseDocKeys(src)).toEqual(['overview', 'install-setup'])
  })

  it('returns empty array for content without markers', () => {
    expect(parseDocKeys('no markers here')).toEqual([])
  })

  it('handles whitespace tolerance', () => {
    const src = `<!--   doc-key:   install-setup   -->`
    expect(parseDocKeys(src)).toEqual(['install-setup'])
  })

  it('ignores markers with capital letters (regex requires lowercase)', () => {
    expect(parseDocKeys('<!-- doc-key: Install-Setup -->')).toEqual([])
  })
})

describe('findDuplicates', () => {
  it('returns empty for unique', () => {
    expect(findDuplicates(['a', 'b', 'c'])).toEqual([])
  })

  it('returns deduped list of repeated keys', () => {
    expect(findDuplicates(['a', 'b', 'a', 'c', 'b', 'a'])).toEqual(['a', 'b'])
  })
})

describe('isValidDocKeyFormat', () => {
  it('accepts kebab-case alphanumerics', () => {
    expect(isValidDocKeyFormat('install-setup-1')).toBe(true)
  })

  it('rejects capitals', () => {
    expect(isValidDocKeyFormat('Install-Setup')).toBe(false)
  })

  it('rejects spaces', () => {
    expect(isValidDocKeyFormat('install setup')).toBe(false)
  })

  it('rejects underscores', () => {
    expect(isValidDocKeyFormat('install_setup')).toBe(false)
  })

  it('rejects empty', () => {
    expect(isValidDocKeyFormat('')).toBe(false)
  })
})

describe('ordersMatch', () => {
  it('returns ok:true when sequences are identical', () => {
    expect(ordersMatch(['a', 'b'], ['a', 'b'])).toEqual({ ok: true })
  })

  it('returns position of first divergence', () => {
    expect(ordersMatch(['a', 'b', 'c'], ['a', 'c', 'b'])).toEqual({
      ok: false,
      position: 1,
      left: 'b',
      right: 'c',
    })
  })

  it('treats length mismatch as divergence at min-length', () => {
    expect(ordersMatch(['a', 'b'], ['a'])).toEqual({
      ok: false,
      position: 1,
      left: 'b',
      right: undefined,
    })
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
pnpm test tests/docs/doc-keys.test.ts
```

- [ ] **Step 3: Implement `src/docs/doc-keys.ts`**

```typescript
const DOC_KEY_RE = /<!--\s*doc-key:\s*([a-z0-9-]+)\s*-->/g
const FORMAT_RE = /^[a-z0-9-]+$/

export function parseDocKeys(content: string): string[] {
  const keys: string[] = []
  for (const m of content.matchAll(DOC_KEY_RE)) {
    keys.push(m[1]!)
  }
  return keys
}

export function findDuplicates(keys: readonly string[]): string[] {
  const seen = new Set<string>()
  const dups = new Set<string>()
  for (const k of keys) {
    if (seen.has(k)) dups.add(k)
    else seen.add(k)
  }
  return [...dups]
}

export function isValidDocKeyFormat(s: string): boolean {
  return s.length > 0 && FORMAT_RE.test(s)
}

export type OrderResult =
  | { ok: true }
  | {
      ok: false
      position: number
      left: string | undefined
      right: string | undefined
    }

export function ordersMatch(
  left: readonly string[],
  right: readonly string[],
): OrderResult {
  const max = Math.max(left.length, right.length)
  for (let i = 0; i < max; i++) {
    if (left[i] !== right[i]) {
      return { ok: false, position: i, left: left[i], right: right[i] }
    }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test tests/docs/doc-keys.test.ts
```
Expected: all 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/docs/doc-keys.ts tests/docs/doc-keys.test.ts
git commit -m "feat: [docs] add doc-key parser + helpers"
```

---

### Task 4: i18n strings (docs.user.* tokens)

**Files:**
- Modify: `src/i18n/zh-TW.ts`
- Modify: `src/i18n/en.ts`

- [ ] **Step 1: 讀現有 zh-TW.ts 結構**

```bash
head -60 src/i18n/zh-TW.ts
```

確認結構（nested object 或 flat map）。後續加入需符合既有風格。

- [ ] **Step 2: 加入 zh-TW.ts**

於既有 strings object 加入 `docs.user.*` namespace：

```typescript
docs: {
  user: {
    invalidDocKey: (locale: string, file: string, key: string) =>
      `[docs.user.invalidDocKey] ${locale}/${file}: doc-key "${key}" 格式不合法（需為 kebab-case [a-z0-9-]+）`,
    duplicateDocKey: (locale: string, file: string, key: string) =>
      `[docs.user.duplicateDocKey] ${locale}/${file}: doc-key "${key}" 重複出現`,
    missingDocKey: (locale: string, key: string) =>
      `[docs.user.missingDocKey] ${locale}: 缺少 required doc-key "${key}"`,
    orderMismatch: (
      locale: string,
      position: number,
      md: string | undefined,
      html: string | undefined,
    ) =>
      `[docs.user.orderMismatch] ${locale}: md/html doc-key 順序在位置 ${position} 不一致\n  index.md  位置 ${position}: ${md ?? '(無)'}\n  index.html 位置 ${position}: ${html ?? '(無)'}`,
    localeDriftDocKey: (
      locale: string,
      missing: readonly string[],
      extra: readonly string[],
    ) =>
      `[docs.user.localeDriftDocKey] ${locale}: 與其他 locale 的 doc-key 集合不一致\n  缺少: ${missing.join(', ') || '(無)'}\n  多餘: ${extra.join(', ') || '(無)'}`,
    missingFile: (locale: string, path: string) =>
      `[docs.user.missingFile] ${locale}: 缺少必要檔案 ${path}`,
  },
},
```

- [ ] **Step 3: 加入 en.ts（同 keys、英文文案）**

```typescript
docs: {
  user: {
    invalidDocKey: (locale: string, file: string, key: string) =>
      `[docs.user.invalidDocKey] ${locale}/${file}: doc-key "${key}" has invalid format (must be kebab-case [a-z0-9-]+)`,
    duplicateDocKey: (locale: string, file: string, key: string) =>
      `[docs.user.duplicateDocKey] ${locale}/${file}: doc-key "${key}" appears more than once`,
    missingDocKey: (locale: string, key: string) =>
      `[docs.user.missingDocKey] ${locale}: missing required doc-key "${key}"`,
    orderMismatch: (
      locale: string,
      position: number,
      md: string | undefined,
      html: string | undefined,
    ) =>
      `[docs.user.orderMismatch] ${locale}: md/html doc-key order diverges at position ${position}\n  index.md  position ${position}: ${md ?? '(none)'}\n  index.html position ${position}: ${html ?? '(none)'}`,
    localeDriftDocKey: (
      locale: string,
      missing: readonly string[],
      extra: readonly string[],
    ) =>
      `[docs.user.localeDriftDocKey] ${locale}: doc-key set differs from other locales\n  missing: ${missing.join(', ') || '(none)'}\n  extra: ${extra.join(', ') || '(none)'}`,
    missingFile: (locale: string, path: string) =>
      `[docs.user.missingFile] ${locale}: required file missing: ${path}`,
  },
},
```

- [ ] **Step 4: 確認 `Strings` 型別自動推導包含新 namespace**

若 zh-TW.ts 用 `as const` 或 `satisfies` 推導 type，會自動含 `docs.user`。若手寫 type alias，需擴充對應介面。

- [ ] **Step 5: 跑全測試**

```bash
pnpm test
```
Expected: 既有測試全綠（i18n 純擴充，不影響既有 reader）。

- [ ] **Step 6: Commit**

```bash
git add src/i18n/zh-TW.ts src/i18n/en.ts
git commit -m "feat: [i18n] add docs.user.* error message tokens"
```

---

### Task 5: Validator + fixtures

**Files:**
- Create: `src/docs/validator.ts`
- Create: `tests/docs/validator.test.ts`
- Create: `tests/fixtures/user-docs/happy/{en,zh-TW}/{index.md,index.html}`
- Create: `tests/fixtures/user-docs/order-mismatch/{en,zh-TW}/{index.md,index.html}`
- Create: `tests/fixtures/user-docs/locale-drift/{en,zh-TW}/{index.md,index.html}`
- Create: `tests/fixtures/user-docs/duplicate/{en,zh-TW}/{index.md,index.html}`
- Create: `tests/fixtures/user-docs/missing-key/{en,zh-TW}/{index.md,index.html}`
- Create: `tests/fixtures/user-docs/missing-file/en/index.md` (zh-TW 目錄整個缺)

- [ ] **Step 1: 建立 happy fixture**

`tests/fixtures/user-docs/happy/en/index.md`：

```markdown
# Example

<!-- doc-key: overview -->
Overview text.

<!-- doc-key: install-setup -->
## Install
Install steps.
```

`tests/fixtures/user-docs/happy/en/index.html`：

```html
<!DOCTYPE html>
<html>
<body>
<!-- doc-key: overview -->
<section>Overview text.</section>

<!-- doc-key: install-setup -->
<section><h2>Install</h2><p>Install steps.</p></section>
</body>
</html>
```

複製成 `zh-TW/` 對應檔（prose 改繁中，doc-key 順序一致）。

- [ ] **Step 2: 建立其餘五個失敗 fixtures**

每個 fixture 只破壞一條規則：
- `order-mismatch/en/index.html`：兩個 doc-key 區塊順序顛倒（vs 同 locale 的 index.md）
- `locale-drift/zh-TW/index.md` + `.html`：多一個 doc-key（如 `extra-key`）不在 en 裡
- `duplicate/en/index.md`：`<!-- doc-key: install-setup -->` 重複貼兩次
- `missing-key/en/index.md` + `.html`：拿掉 `<!-- doc-key: install-setup -->` marker（保留標題）
- `missing-file/`：只建 `en/index.md` 與 `en/index.html`，整個 `zh-TW/` 目錄不存在

每份 fixture 都要兩個 locales（除了 missing-file），否則會誤判為 missing-file 失敗。

- [ ] **Step 3: 寫 failing test**

`tests/docs/validator.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { validateUserDocs } from '../../src/docs/validator'
import type { DocsUserConfig } from '../../src/schema/docs'

const fx = (name: string) => resolve(__dirname, '../fixtures/user-docs', name)

const baseConfig: DocsUserConfig = {
  enabled: true,
  locales: ['en', 'zh-TW'],
  theme: 'anthropic-warm',
  coverage: ['install-setup'],
}

describe('validateUserDocs', () => {
  it('passes for happy fixture', async () => {
    const r = await validateUserDocs(fx('happy'), baseConfig)
    expect(r.ok).toBe(true)
  })

  it('detects md/html order mismatch', async () => {
    const r = await validateUserDocs(fx('order-mismatch'), baseConfig)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.token === 'docs.user.orderMismatch')).toBe(true)
    }
  })

  it('detects locale drift (extra key in one locale)', async () => {
    const r = await validateUserDocs(fx('locale-drift'), baseConfig)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.token === 'docs.user.localeDriftDocKey')).toBe(true)
    }
  })

  it('detects duplicate doc-key in single file', async () => {
    const r = await validateUserDocs(fx('duplicate'), baseConfig)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.token === 'docs.user.duplicateDocKey')).toBe(true)
    }
  })

  it('detects missing required doc-key', async () => {
    const r = await validateUserDocs(fx('missing-key'), baseConfig)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.token === 'docs.user.missingDocKey')).toBe(true)
    }
  })

  it('detects missing locale directory / file', async () => {
    const r = await validateUserDocs(fx('missing-file'), baseConfig)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some((e) => e.token === 'docs.user.missingFile')).toBe(true)
    }
  })
})
```

- [ ] **Step 4: Run — expect fail**

```bash
pnpm test tests/docs/validator.test.ts
```

- [ ] **Step 5: Implement `src/docs/validator.ts`**

```typescript
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DocsUserConfig } from '../schema/docs.js'
import { parseDocKeys, findDuplicates, ordersMatch } from './doc-keys.js'
import { resolveCoverage } from './coverage.js'

export type ValidationError =
  | { token: 'docs.user.invalidDocKey'; locale: string; file: string; key: string }
  | { token: 'docs.user.duplicateDocKey'; locale: string; file: string; key: string }
  | { token: 'docs.user.missingDocKey'; locale: string; key: string }
  | {
      token: 'docs.user.orderMismatch'
      locale: string
      position: number
      md: string | undefined
      html: string | undefined
    }
  | {
      token: 'docs.user.localeDriftDocKey'
      locale: string
      missing: readonly string[]
      extra: readonly string[]
    }
  | { token: 'docs.user.missingFile'; locale: string; path: string }

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] }

async function readMaybe(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

export async function validateUserDocs(
  rootDir: string,
  config: DocsUserConfig,
): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const coverage = resolveCoverage(config.coverage)
  if ('error' in coverage) {
    // Coverage 解析失敗：schema 應該已擋；不應走到這
    return { ok: false, errors: [] }
  }
  const requiredKeys = coverage.keys

  const perLocaleKeys: Record<string, string[]> = {}

  for (const locale of config.locales) {
    const mdPath = join(rootDir, locale, 'index.md')
    const htmlPath = join(rootDir, locale, 'index.html')

    const mdContent = await readMaybe(mdPath)
    const htmlContent = await readMaybe(htmlPath)

    if (mdContent === null) {
      errors.push({ token: 'docs.user.missingFile', locale, path: `${locale}/index.md` })
    }
    if (htmlContent === null) {
      errors.push({ token: 'docs.user.missingFile', locale, path: `${locale}/index.html` })
    }
    if (mdContent === null || htmlContent === null) continue

    const mdKeys = parseDocKeys(mdContent)
    const htmlKeys = parseDocKeys(htmlContent)

    for (const dup of findDuplicates(mdKeys)) {
      errors.push({ token: 'docs.user.duplicateDocKey', locale, file: 'index.md', key: dup })
    }
    for (const dup of findDuplicates(htmlKeys)) {
      errors.push({ token: 'docs.user.duplicateDocKey', locale, file: 'index.html', key: dup })
    }

    for (const k of requiredKeys) {
      if (!mdKeys.includes(k) || !htmlKeys.includes(k)) {
        errors.push({ token: 'docs.user.missingDocKey', locale, key: k })
      }
    }

    const order = ordersMatch(mdKeys, htmlKeys)
    if (!order.ok) {
      errors.push({
        token: 'docs.user.orderMismatch',
        locale,
        position: order.position,
        md: order.left,
        html: order.right,
      })
    }

    perLocaleKeys[locale] = mdKeys
  }

  const localeNames = Object.keys(perLocaleKeys)
  if (localeNames.length > 1) {
    const reference = new Set(perLocaleKeys[localeNames[0]!])
    for (const locale of localeNames.slice(1)) {
      const current = new Set(perLocaleKeys[locale]!)
      const missing = [...reference].filter((k) => !current.has(k))
      const extra = [...current].filter((k) => !reference.has(k))
      if (missing.length > 0 || extra.length > 0) {
        errors.push({ token: 'docs.user.localeDriftDocKey', locale, missing, extra })
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}
```

- [ ] **Step 6: Run — expect pass**

```bash
pnpm test tests/docs/validator.test.ts
```
Expected: 6 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/docs/validator.ts tests/docs/validator.test.ts tests/fixtures/user-docs/
git commit -m "feat: [docs] add validator with 6-rule coverage + fixtures"
```

---

### Task 6: Templates + theme

**Files:**
- Create: `src/docs/templates/index.md.tmpl`
- Create: `src/docs/templates/index.html.tmpl`
- Create: `src/docs/templates/themes/anthropic-warm.css`

模板邏輯參考 skill 既有 `~/.claude/skills/writing-user-docs/scaffold/{index.md.tmpl,index.html.tmpl}` 與 `references/visual-themes/anthropic-warm.css`，**重新撰寫不複製**。

支援的變數佔位符：`{{PROJECT_NAME}}`、`{{TAGLINE}}`、`{{GITHUB_URL}}`、`{{LOCALE}}`、`{{THEME_CSS}}`（html only）。

支援的 section block 標記：
```
<!-- BEGIN:<doc-key> -->
... section body ...
<!-- END:<doc-key> -->
```

- [ ] **Step 1: 撰寫 `src/docs/templates/index.md.tmpl`**

```markdown
# {{PROJECT_NAME}}

<!-- doc-key: overview -->
{{TAGLINE}}

> Replace this paragraph with a one-paragraph overview of what
> {{PROJECT_NAME}} does and who it is for.

---

<!-- BEGIN:install-setup -->
<!-- doc-key: install-setup -->
## Install & setup

> How to install and run {{PROJECT_NAME}} for the first time.

<!-- END:install-setup -->

<!-- BEGIN:connections -->
<!-- doc-key: connections -->
## Connections / initialisation

> How to point {{PROJECT_NAME}} at the user's environment.

<!-- END:connections -->

<!-- BEGIN:discovery-read -->
<!-- doc-key: discovery-read -->
## Discovery / read

> Read-only / inspection commands.

<!-- END:discovery-read -->

<!-- BEGIN:writes-mutations -->
<!-- doc-key: writes-mutations -->
## Writes / mutations

> Commands that change state, plus safety mechanisms.

<!-- END:writes-mutations -->

<!-- BEGIN:advanced-tools -->
<!-- doc-key: advanced-tools -->
## Advanced tools

> Power-user commands and configuration.

<!-- END:advanced-tools -->

<!-- BEGIN:diagnostics-recovery -->
<!-- doc-key: diagnostics-recovery -->
## Diagnostics / recovery

> Something is wrong — what to try.

<!-- END:diagnostics-recovery -->

<!-- BEGIN:engine-support -->
<!-- doc-key: engine-support -->
## Engine / platform support

> What works on which backend / runtime.

<!-- END:engine-support -->

<!-- BEGIN:ai-integration -->
<!-- doc-key: ai-integration -->
## AI agent integration

> How LLM agents should use {{PROJECT_NAME}}.

<!-- END:ai-integration -->

<!-- BEGIN:visual-surfaces -->
<!-- doc-key: visual-surfaces -->
## Visual / dashboard surfaces

> UI / HTML / dashboard outputs.

<!-- END:visual-surfaces -->

<!-- BEGIN:documentation-maintenance -->
<!-- doc-key: documentation-maintenance -->
## Documentation maintenance

> How these docs are kept honest (doc-key contract + validator).

<!-- END:documentation-maintenance -->

---

Project: {{PROJECT_NAME}}  ·  Source: {{GITHUB_URL}}
```

- [ ] **Step 2: 撰寫 `src/docs/templates/index.html.tmpl`**

```html
<!DOCTYPE html>
<html lang="{{LOCALE}}">
<head>
<meta charset="utf-8">
<title>{{PROJECT_NAME}} — User Guide</title>
<style>{{THEME_CSS}}</style>
</head>
<body>
<aside class="sidebar">
  <h1>{{PROJECT_NAME}}</h1>
  <nav>
    <ul>
      <li><a href="#overview">Overview</a></li>
      <!-- BEGIN:install-setup -->
      <li><a href="#install-setup">Install &amp; setup</a></li>
      <!-- END:install-setup -->
      <!-- BEGIN:connections -->
      <li><a href="#connections">Connections</a></li>
      <!-- END:connections -->
      <!-- BEGIN:discovery-read -->
      <li><a href="#discovery-read">Discovery</a></li>
      <!-- END:discovery-read -->
      <!-- BEGIN:writes-mutations -->
      <li><a href="#writes-mutations">Writes</a></li>
      <!-- END:writes-mutations -->
      <!-- BEGIN:advanced-tools -->
      <li><a href="#advanced-tools">Advanced</a></li>
      <!-- END:advanced-tools -->
      <!-- BEGIN:diagnostics-recovery -->
      <li><a href="#diagnostics-recovery">Diagnostics</a></li>
      <!-- END:diagnostics-recovery -->
      <!-- BEGIN:engine-support -->
      <li><a href="#engine-support">Engine support</a></li>
      <!-- END:engine-support -->
      <!-- BEGIN:ai-integration -->
      <li><a href="#ai-integration">AI integration</a></li>
      <!-- END:ai-integration -->
      <!-- BEGIN:visual-surfaces -->
      <li><a href="#visual-surfaces">Visual surfaces</a></li>
      <!-- END:visual-surfaces -->
      <!-- BEGIN:documentation-maintenance -->
      <li><a href="#documentation-maintenance">Doc maintenance</a></li>
      <!-- END:documentation-maintenance -->
    </ul>
  </nav>
</aside>
<main>
<!-- doc-key: overview -->
<section id="overview">
  <h1>{{PROJECT_NAME}}</h1>
  <p class="tagline">{{TAGLINE}}</p>
  <p>Replace this paragraph with a one-paragraph overview of what {{PROJECT_NAME}} does and who it is for.</p>
</section>

<!-- BEGIN:install-setup -->
<!-- doc-key: install-setup -->
<section id="install-setup">
  <h2>Install &amp; setup</h2>
  <p>How to install and run {{PROJECT_NAME}} for the first time.</p>
</section>
<!-- END:install-setup -->

<!-- BEGIN:connections -->
<!-- doc-key: connections -->
<section id="connections">
  <h2>Connections / initialisation</h2>
  <p>How to point {{PROJECT_NAME}} at the user's environment.</p>
</section>
<!-- END:connections -->

<!-- BEGIN:discovery-read -->
<!-- doc-key: discovery-read -->
<section id="discovery-read">
  <h2>Discovery / read</h2>
  <p>Read-only / inspection commands.</p>
</section>
<!-- END:discovery-read -->

<!-- BEGIN:writes-mutations -->
<!-- doc-key: writes-mutations -->
<section id="writes-mutations">
  <h2>Writes / mutations</h2>
  <p>Commands that change state.</p>
</section>
<!-- END:writes-mutations -->

<!-- BEGIN:advanced-tools -->
<!-- doc-key: advanced-tools -->
<section id="advanced-tools">
  <h2>Advanced tools</h2>
  <p>Power-user commands and configuration.</p>
</section>
<!-- END:advanced-tools -->

<!-- BEGIN:diagnostics-recovery -->
<!-- doc-key: diagnostics-recovery -->
<section id="diagnostics-recovery">
  <h2>Diagnostics / recovery</h2>
  <p>Something is wrong — what to try.</p>
</section>
<!-- END:diagnostics-recovery -->

<!-- BEGIN:engine-support -->
<!-- doc-key: engine-support -->
<section id="engine-support">
  <h2>Engine / platform support</h2>
  <p>What works on which backend / runtime.</p>
</section>
<!-- END:engine-support -->

<!-- BEGIN:ai-integration -->
<!-- doc-key: ai-integration -->
<section id="ai-integration">
  <h2>AI agent integration</h2>
  <p>How LLM agents should use {{PROJECT_NAME}}.</p>
</section>
<!-- END:ai-integration -->

<!-- BEGIN:visual-surfaces -->
<!-- doc-key: visual-surfaces -->
<section id="visual-surfaces">
  <h2>Visual / dashboard surfaces</h2>
  <p>UI / HTML / dashboard outputs.</p>
</section>
<!-- END:visual-surfaces -->

<!-- BEGIN:documentation-maintenance -->
<!-- doc-key: documentation-maintenance -->
<section id="documentation-maintenance">
  <h2>Documentation maintenance</h2>
  <p>How these docs are kept honest.</p>
</section>
<!-- END:documentation-maintenance -->
</main>
</body>
</html>
```

- [ ] **Step 3: 撰寫 `src/docs/templates/themes/anthropic-warm.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;700&display=swap');

:root {
  --bg: #F5EFE6;
  --fg: #1F1B16;
  --muted: #6B5F50;
  --accent: #D97757;
  --border: rgba(31, 27, 22, 0.12);
  --font-body: 'Inter', system-ui, sans-serif;
  --font-display: 'Outfit', system-ui, sans-serif;
}

* { box-sizing: border-box; margin: 0; }

body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
  line-height: 1.6;
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

.sidebar { padding: 24px; border-right: 1px solid var(--border); }
.sidebar h1 { font-family: var(--font-display); font-size: 1.25rem; margin-bottom: 16px; }
.sidebar nav ul { list-style: none; padding: 0; }
.sidebar nav li { padding: 4px 0; }
.sidebar nav a { display: block; color: var(--fg); text-decoration: none; }
.sidebar nav a:hover { color: var(--accent); }

main { padding: 48px 64px; max-width: 760px; }
main h1 { font-family: var(--font-display); font-size: 2rem; margin-bottom: 8px; }
main h2 { font-family: var(--font-display); font-size: 1.5rem; margin: 32px 0 12px; }

.tagline { color: var(--muted); margin-bottom: 24px; }
p { margin-bottom: 12px; }

pre, code { font-family: ui-monospace, 'JetBrains Mono', monospace; }
pre { background: rgba(31, 27, 22, 0.04); border: 1px solid var(--border); padding: 12px 16px; border-radius: 4px; overflow-x: auto; }

section { margin-bottom: 32px; }
```

- [ ] **Step 4: Smoke**

```bash
ls src/docs/templates/
ls src/docs/templates/themes/
```
Expected:
```
src/docs/templates/:
index.html.tmpl
index.md.tmpl
themes/

src/docs/templates/themes/:
anthropic-warm.css
```

- [ ] **Step 5: Commit**

```bash
git add src/docs/templates/
git commit -m "feat: [docs] add scaffold templates + anthropic-warm theme"
```

---

### Task 7: Scaffold module

**Files:**
- Create: `src/docs/scaffold.ts`
- Create: `tests/docs/scaffold.test.ts`

**型別合約**：

```typescript
export type ScaffoldOptions = {
  rootDir: string
  outDir: string          // e.g. 'docs/user/'
  projectName: string
  tagline: string
  githubUrl: string
  locales: readonly string[]
  theme: 'anthropic-warm'
  coverage: 'all' | readonly string[]
  force: boolean
}

export type ScaffoldResult =
  | { ok: true; writtenFiles: string[] }
  | { ok: false; error: string }
```

- [ ] **Step 1: Failing test**

`tests/docs/scaffold.test.ts`：

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scaffoldUserDocs } from '../../src/docs/scaffold'
import { parseDocKeys } from '../../src/docs/doc-keys'

let tmp: string
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'specbook-scaffold-'))
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('scaffoldUserDocs', () => {
  it('writes md + html for each locale with matching doc-keys', async () => {
    const r = await scaffoldUserDocs({
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'Example',
      tagline: 'A test project',
      githubUrl: 'https://example.com/repo',
      locales: ['en', 'zh-TW'],
      theme: 'anthropic-warm',
      coverage: 'all',
      force: false,
    })
    expect(r.ok).toBe(true)
    const mdEn = await readFile(join(tmp, 'docs/user/en/index.md'), 'utf8')
    const htmlEn = await readFile(join(tmp, 'docs/user/en/index.html'), 'utf8')
    const mdKeys = parseDocKeys(mdEn)
    const htmlKeys = parseDocKeys(htmlEn)
    expect(mdKeys).toEqual(htmlKeys)
    expect(mdKeys.length).toBe(11) // overview + 10
    expect(mdEn).toContain('Example')
    expect(htmlEn).toContain('Example')
  })

  it('substitutes project / tagline / github vars', async () => {
    await scaffoldUserDocs({
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'MyApp',
      tagline: 'tagline-text',
      githubUrl: 'https://github.com/me/myapp',
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: 'all',
      force: false,
    })
    const md = await readFile(join(tmp, 'docs/user/en/index.md'), 'utf8')
    expect(md).toContain('MyApp')
    expect(md).toContain('tagline-text')
    expect(md).toContain('https://github.com/me/myapp')
    expect(md).not.toMatch(/\{\{[A-Z_]+\}\}/)
  })

  it('strips unselected coverage blocks', async () => {
    const r = await scaffoldUserDocs({
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'X',
      tagline: '',
      githubUrl: '',
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: ['install-setup', 'discovery-read'],
      force: false,
    })
    expect(r.ok).toBe(true)
    const md = await readFile(join(tmp, 'docs/user/en/index.md'), 'utf8')
    const keys = parseDocKeys(md)
    expect(keys).toEqual(['overview', 'install-setup', 'discovery-read'])
  })

  it('refuses to overwrite when force=false and file exists', async () => {
    const opts = {
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'X',
      tagline: '',
      githubUrl: '',
      locales: ['en'] as const,
      theme: 'anthropic-warm' as const,
      coverage: 'all' as const,
      force: false,
    }
    await scaffoldUserDocs(opts)
    const second = await scaffoldUserDocs(opts)
    expect(second.ok).toBe(false)
  })

  it('overwrites when force=true', async () => {
    const opts = {
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'X',
      tagline: '',
      githubUrl: '',
      locales: ['en'] as const,
      theme: 'anthropic-warm' as const,
      coverage: 'all' as const,
      force: true,
    }
    await scaffoldUserDocs(opts)
    const second = await scaffoldUserDocs(opts)
    expect(second.ok).toBe(true)
  })

  it('embeds theme css inline in html', async () => {
    await scaffoldUserDocs({
      rootDir: tmp,
      outDir: 'docs/user/',
      projectName: 'X',
      tagline: '',
      githubUrl: '',
      locales: ['en'],
      theme: 'anthropic-warm',
      coverage: 'all',
      force: false,
    })
    const html = await readFile(join(tmp, 'docs/user/en/index.html'), 'utf8')
    expect(html).toContain('<style>')
    expect(html).toContain('--accent')
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
pnpm test tests/docs/scaffold.test.ts
```

- [ ] **Step 3: Implement `src/docs/scaffold.ts`**

```typescript
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveCoverage } from './coverage.js'

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = resolve(MODULE_DIR, 'templates')

export type ScaffoldOptions = {
  rootDir: string
  outDir: string
  projectName: string
  tagline: string
  githubUrl: string
  locales: readonly string[]
  theme: 'anthropic-warm'
  coverage: 'all' | readonly string[]
  force: boolean
}

export type ScaffoldResult =
  | { ok: true; writtenFiles: string[] }
  | { ok: false; error: string }

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key: string) => {
    if (!(key in vars)) {
      throw new Error(`Template variable not provided: {{${key}}}`)
    }
    return vars[key]!
  })
}

function stripUnselected(template: string, selected: readonly string[]): string {
  const set = new Set(selected)
  const blockRe = /[ \t]*<!--\s*BEGIN:([a-z0-9-]+)\s*-->\n([\s\S]*?)\n[ \t]*<!--\s*END:\1\s*-->\n?/g
  let result = template.replace(blockRe, (_match, key: string, body: string) => {
    if (!set.has(key)) return ''
    return `${body}\n`
  })
  result = result.replace(/\n{3,}/g, '\n\n')
  return result
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function scaffoldUserDocs(opts: ScaffoldOptions): Promise<ScaffoldResult> {
  const coverage = resolveCoverage(opts.coverage)
  if ('error' in coverage) return { ok: false, error: coverage.error }

  const mdTmpl = await readFile(join(TEMPLATES_DIR, 'index.md.tmpl'), 'utf8')
  const htmlTmpl = await readFile(join(TEMPLATES_DIR, 'index.html.tmpl'), 'utf8')
  const themeCss = await readFile(
    join(TEMPLATES_DIR, 'themes', `${opts.theme}.css`),
    'utf8',
  )

  const written: string[] = []

  for (const locale of opts.locales) {
    const localeDir = join(opts.rootDir, opts.outDir, locale)
    const mdPath = join(localeDir, 'index.md')
    const htmlPath = join(localeDir, 'index.html')

    if (!opts.force) {
      if ((await fileExists(mdPath)) || (await fileExists(htmlPath))) {
        return {
          ok: false,
          error: `Refusing to overwrite existing files at ${localeDir} (use --force to override)`,
        }
      }
    }

    const baseVars = {
      PROJECT_NAME: opts.projectName,
      TAGLINE: opts.tagline,
      GITHUB_URL: opts.githubUrl,
      LOCALE: locale,
    }

    const mdOut = applyVars(stripUnselected(mdTmpl, coverage.keys), {
      ...baseVars,
      THEME_CSS: '',
    })
    const htmlOut = applyVars(stripUnselected(htmlTmpl, coverage.keys), {
      ...baseVars,
      THEME_CSS: themeCss,
    })

    await mkdir(localeDir, { recursive: true })
    await writeFile(mdPath, mdOut, 'utf8')
    await writeFile(htmlPath, htmlOut, 'utf8')
    written.push(mdPath, htmlPath)
  }

  return { ok: true, writtenFiles: written }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test tests/docs/scaffold.test.ts
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/docs/scaffold.ts tests/docs/scaffold.test.ts
git commit -m "feat: [docs] add scaffold module"
```

---

### Task 8: Build module

**Files:**
- Create: `src/docs/build.ts`
- Create: `tests/docs/build.test.ts`

**型別合約**：

```typescript
export type BuildOptions = {
  rootDir: string
  srcDir: string         // 'docs/user/'
  outDir: string         // 'dist/user/'
  locales: readonly string[]
  primaryLocale: string  // fallback for locale chooser
}

export type BuildResult =
  | { ok: true; writtenFiles: string[] }
  | { ok: false; error: string }
```

- [ ] **Step 1: Failing test**

`tests/docs/build.test.ts`：

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildUserDocs } from '../../src/docs/build'

let tmp: string
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'specbook-build-'))
  for (const l of ['en', 'zh-TW']) {
    await mkdir(join(tmp, 'docs/user', l), { recursive: true })
    await writeFile(
      join(tmp, 'docs/user', l, 'index.md'),
      `<!-- doc-key: overview -->\nhi`,
    )
    await writeFile(
      join(tmp, 'docs/user', l, 'index.html'),
      `<!-- doc-key: overview -->\n<p>hi</p>`,
    )
  }
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('buildUserDocs', () => {
  it('copies html files to dist/user/<locale>/', async () => {
    const r = await buildUserDocs({
      rootDir: tmp,
      srcDir: 'docs/user/',
      outDir: 'dist/user/',
      locales: ['en', 'zh-TW'],
      primaryLocale: 'zh-TW',
    })
    expect(r.ok).toBe(true)
    await access(join(tmp, 'dist/user/en/index.html'))
    await access(join(tmp, 'dist/user/zh-TW/index.html'))
  })

  it('generates dist/user/index.html locale chooser', async () => {
    await buildUserDocs({
      rootDir: tmp,
      srcDir: 'docs/user/',
      outDir: 'dist/user/',
      locales: ['en', 'zh-TW'],
      primaryLocale: 'zh-TW',
    })
    const chooser = await readFile(join(tmp, 'dist/user/index.html'), 'utf8')
    expect(chooser).toContain('zh-TW/index.html')
    expect(chooser).toContain('en/index.html')
    expect(chooser).toContain('navigator.language')
  })

  it('does not copy index.md', async () => {
    await buildUserDocs({
      rootDir: tmp,
      srcDir: 'docs/user/',
      outDir: 'dist/user/',
      locales: ['en'],
      primaryLocale: 'en',
    })
    let exists = true
    try {
      await access(join(tmp, 'dist/user/en/index.md'))
    } catch {
      exists = false
    }
    expect(exists).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
pnpm test tests/docs/build.test.ts
```

- [ ] **Step 3: Implement `src/docs/build.ts`**

```typescript
import { writeFile, mkdir, copyFile } from 'node:fs/promises'
import { join } from 'node:path'

export type BuildOptions = {
  rootDir: string
  srcDir: string
  outDir: string
  locales: readonly string[]
  primaryLocale: string
}

export type BuildResult =
  | { ok: true; writtenFiles: string[] }
  | { ok: false; error: string }

function renderChooser(locales: readonly string[], primary: string): string {
  return `<!DOCTYPE html>
<html lang="${primary}">
<head>
<meta charset="utf-8">
<title>User Guide — Select language</title>
<script>
(function () {
  var locales = ${JSON.stringify(locales)};
  var primary = ${JSON.stringify(primary)};
  var lang = (navigator.language || primary);
  var target = locales.indexOf(lang) !== -1 ? lang : primary;
  if (target === primary && lang !== primary) {
    for (var i = 0; i < locales.length; i++) {
      if (locales[i].toLowerCase().split('-')[0] === lang.toLowerCase().split('-')[0]) {
        target = locales[i];
        break;
      }
    }
  }
  location.replace(target + '/index.html');
})();
</script>
<noscript>
<ul>
${locales.map((l) => `  <li><a href="${l}/index.html">${l}</a></li>`).join('\n')}
</ul>
</noscript>
</head>
<body>
<p>Redirecting…</p>
</body>
</html>
`
}

export async function buildUserDocs(opts: BuildOptions): Promise<BuildResult> {
  const written: string[] = []
  const outRoot = join(opts.rootDir, opts.outDir)
  await mkdir(outRoot, { recursive: true })

  for (const locale of opts.locales) {
    const srcHtml = join(opts.rootDir, opts.srcDir, locale, 'index.html')
    const dstDir = join(outRoot, locale)
    const dstHtml = join(dstDir, 'index.html')
    await mkdir(dstDir, { recursive: true })
    await copyFile(srcHtml, dstHtml)
    written.push(dstHtml)
  }

  const chooserPath = join(outRoot, 'index.html')
  await writeFile(chooserPath, renderChooser(opts.locales, opts.primaryLocale), 'utf8')
  written.push(chooserPath)

  return { ok: true, writtenFiles: written }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test tests/docs/build.test.ts
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/docs/build.ts tests/docs/build.test.ts
git commit -m "feat: [docs] add build module with locale chooser"
```

---

### Task 9: Package subpath export `specbook/docs`

**Files:**
- Modify: `package.json`
- Create: `src/docs/index.ts`

- [ ] **Step 1: 建立 `src/docs/index.ts` (barrel)**

```typescript
export { validateUserDocs } from './validator.js'
export type { ValidationResult, ValidationError } from './validator.js'
export { scaffoldUserDocs } from './scaffold.js'
export type { ScaffoldOptions, ScaffoldResult } from './scaffold.js'
export { buildUserDocs } from './build.js'
export type { BuildOptions, BuildResult } from './build.js'
export {
  resolveCoverage,
  normalizeCoverageFlag,
  ALL_CATEGORIES,
  OVERVIEW_KEY,
} from './coverage.js'
```

- [ ] **Step 2: 修改 package.json `exports`**

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  },
  "./docs": {
    "types": "./dist/docs/index.d.ts",
    "import": "./dist/docs/index.js"
  }
}
```

- [ ] **Step 3: Build + smoke**

```bash
pnpm build
node -e "import('./dist/docs/index.js').then(m => console.log(Object.keys(m).sort()))"
```
Expected: 輸出包含 `ALL_CATEGORIES`、`OVERVIEW_KEY`、`buildUserDocs`、`normalizeCoverageFlag`、`resolveCoverage`、`scaffoldUserDocs`、`validateUserDocs`。

- [ ] **Step 4: Commit**

```bash
git add package.json src/docs/index.ts
git commit -m "feat: [docs] expose specbook/docs subpath export"
```

---

### Task 10: CLI module `src/cli/docs.ts`

**Files:**
- Create: `src/cli/docs.ts`

**API**：對外 export `createDocsCommand()` 回傳 commander Command instance。由 `src/cli/index.ts` 註冊。

- [ ] **Step 1: 確認既有 config loader 名稱與路徑**

```bash
grep -n 'export' src/content/load-config.ts | head -10
```

記下 exported loader 名稱（假設為 `loadConfig`；若不同則於下面 import 對應替換）。

- [ ] **Step 2: Implement**

```typescript
import { Command } from 'commander'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, join, extname } from 'node:path'
import { scaffoldUserDocs } from '../docs/scaffold.js'
import { buildUserDocs } from '../docs/build.js'
import { validateUserDocs } from '../docs/validator.js'
import { normalizeCoverageFlag } from '../docs/coverage.js'
import { loadConfig } from '../content/load-config.js'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

export function createDocsCommand(): Command {
  const cmd = new Command('docs').description(
    'Manage user-facing documentation (docs/user/)',
  )

  cmd
    .command('init')
    .description('Scaffold docs/user/<locale>/{index.md,index.html}')
    .option('-r, --root <dir>', 'Project root', process.cwd())
    .option('--locales <list>', 'Comma-separated locales (e.g. en,zh-TW)')
    .option('--theme <name>', 'Theme name', 'anthropic-warm')
    .option(
      '--coverage <list>',
      'Coverage: "all" | "1,3,5" | "install-setup,..."',
      'all',
    )
    .option('--project <name>', 'Project name (defaults to package.json name)')
    .option('--tagline <text>', 'One-line tagline', '')
    .option('--github <url>', 'GitHub URL', '')
    .option('--force', 'Overwrite existing files', false)
    .action(async (opts) => {
      const cfg = await loadConfig(opts.root).catch(() => null)
      const locales =
        (opts.locales as string | undefined)
          ?.split(',')
          .map((s) => s.trim()) ??
        cfg?.docs?.user?.locales ??
        ['zh-TW', 'en']
      const cov = normalizeCoverageFlag(String(opts.coverage))
      if (typeof cov === 'object' && 'error' in cov) {
        console.error(cov.error)
        process.exit(1)
      }
      const pkg = await readFile(resolve(opts.root, 'package.json'), 'utf8')
        .then((s) => JSON.parse(s))
        .catch(() => ({}))
      const projectName = opts.project ?? pkg.name ?? 'Project'

      const r = await scaffoldUserDocs({
        rootDir: opts.root,
        outDir: 'docs/user/',
        projectName,
        tagline: opts.tagline ?? '',
        githubUrl: opts.github ?? '',
        locales,
        theme: opts.theme,
        coverage: cov,
        force: !!opts.force,
      })
      if (!r.ok) {
        console.error(r.error)
        process.exit(1)
      }
      for (const f of r.writtenFiles) console.log('wrote', f)
    })

  cmd
    .command('validate')
    .description('Validate doc-key alignment in docs/user/')
    .option('-r, --root <dir>', 'Project root', process.cwd())
    .action(async (opts) => {
      const cfg = await loadConfig(opts.root)
      const userCfg = cfg?.docs?.user
      if (!userCfg || !userCfg.enabled) {
        console.error('docs.user not enabled in config; see specbook docs init')
        process.exit(1)
      }
      const r = await validateUserDocs(
        resolve(opts.root, 'docs/user/'),
        userCfg,
      )
      if (r.ok) {
        console.log('docs.user OK')
        process.exit(0)
      }
      for (const err of r.errors) console.error(JSON.stringify(err))
      process.exit(1)
    })

  cmd
    .command('dev')
    .description('Preview docs/user/ in a local browser')
    .option('-r, --root <dir>', 'Project root', process.cwd())
    .option('-p, --port <port>', 'Port', (v) => Number(v), 4123)
    .action(async (opts) => {
      const baseDir = resolve(opts.root, 'docs/user/')
      const server = createServer(async (req, res) => {
        let urlPath = req.url ?? '/'
        if (urlPath === '/') urlPath = '/index.html'
        const filePath = join(baseDir, urlPath)
        try {
          const data = await readFile(filePath)
          const mime = MIME[extname(filePath)] ?? 'application/octet-stream'
          res.writeHead(200, { 'Content-Type': mime })
          res.end(data)
        } catch {
          res.writeHead(404)
          res.end('Not found')
        }
      })
      server.listen(opts.port, () => {
        console.log(`docs.user preview at http://localhost:${opts.port}/`)
      })
    })

  cmd
    .command('build')
    .description('Build docs/user/ into dist/user/')
    .option('-r, --root <dir>', 'Project root', process.cwd())
    .option('--skip-validate', 'Skip validate before build', false)
    .action(async (opts) => {
      const cfg = await loadConfig(opts.root)
      const userCfg = cfg?.docs?.user
      if (!userCfg || !userCfg.enabled) {
        console.error('docs.user not enabled in config')
        process.exit(1)
      }
      if (!opts.skipValidate) {
        const v = await validateUserDocs(
          resolve(opts.root, 'docs/user/'),
          userCfg,
        )
        if (!v.ok) {
          console.error(
            'validate failed; aborting build (use --skip-validate to bypass)',
          )
          for (const e of v.errors) console.error(JSON.stringify(e))
          process.exit(1)
        }
      }
      const r = await buildUserDocs({
        rootDir: opts.root,
        srcDir: 'docs/user/',
        outDir: 'dist/user/',
        locales: userCfg.locales,
        primaryLocale: userCfg.locales[0]!,
      })
      if (!r.ok) {
        console.error(r.error)
        process.exit(1)
      }
      for (const f of r.writtenFiles) console.log('wrote', f)
    })

  return cmd
}
```

> **Note**：validate / build 命令的錯誤輸出目前以 `console.error(JSON.stringify(err))` 簡化；Task 13 的整合測試以 exit code 為主驗證。若日後要美化，於 `src/docs/format-error.ts` 加 `formatError(strings, err): string` helper。

- [ ] **Step 3: Type check**

```bash
pnpm build
```
Expected: 編譯成功。

- [ ] **Step 4: Commit**

```bash
git add src/cli/docs.ts
git commit -m "feat: [cli] add specbook docs subcommand module"
```

---

### Task 11: 在 `src/cli/index.ts` 註冊 docs 子命令

**Files:**
- Modify: `src/cli/index.ts`

- [ ] **Step 1: 修改**

於 `src/cli/index.ts` 開頭加 import：

```typescript
import { createDocsCommand } from './docs.js'
```

於 `program.parseAsync(process.argv)` 之前加：

```typescript
program.addCommand(createDocsCommand())
```

- [ ] **Step 2: Smoke**

```bash
pnpm build
node ./dist/cli/index.js docs --help
```
Expected: 顯示 `docs` 子命令樹（init / validate / dev / build）。

- [ ] **Step 3: Commit**

```bash
git add src/cli/index.ts
git commit -m "feat: [cli] register docs subcommand"
```

---

### Task 12: 確保 templates / themes 被打包進 dist/

**Files:**
- Modify: `scripts/copy-build-assets.mjs`

- [ ] **Step 1: 讀現況**

```bash
cat scripts/copy-build-assets.mjs
```

確認該 script 既有 asset copy 行為（依 release readiness packaging plan，已複製 styles）。

- [ ] **Step 2: 加入 templates / themes 複製**

於該 script 內加入（若已有 cp helper 套用同樣風格）：

```javascript
import { cp } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

await cp(
  join(root, 'src/docs/templates'),
  join(root, 'dist/docs/templates'),
  { recursive: true },
)
```

- [ ] **Step 3: Build + verify**

```bash
pnpm build
ls dist/docs/templates/
ls dist/docs/templates/themes/
```
Expected:
```
dist/docs/templates/:
index.html.tmpl
index.md.tmpl
themes/

dist/docs/templates/themes/:
anthropic-warm.css
```

- [ ] **Step 4: 跑 packaging smoke**

```bash
pnpm test:packaging
```
Expected: pass。

- [ ] **Step 5: 確認 `package.json` 的 `files` 涵蓋 dist**

```bash
grep -A 6 '"files"' package.json
```
Expected: `dist` 在 list 內；新加入的 `dist/docs/templates/` 自動被涵蓋。

- [ ] **Step 6: Commit**

```bash
git add scripts/copy-build-assets.mjs
git commit -m "build: [docs] copy templates + themes into dist/"
```

---

### Task 13: Integration test — `tests/cli/docs.test.ts`

**Files:**
- Create: `tests/cli/docs.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtemp,
  rm,
  writeFile,
  mkdir,
  readFile,
  access,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const CLI = resolve(__dirname, '../../dist/cli/index.js')

let tmp: string
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'specbook-cli-docs-'))
  await writeFile(
    join(tmp, 'package.json'),
    JSON.stringify({ name: 'fixture-proj', version: '0.0.0' }),
  )
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

function runCli(args: string[], cwd: string) {
  return spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf8' })
}

describe('specbook docs CLI', () => {
  it('docs --help shows subcommands', () => {
    const r = runCli(['docs', '--help'], tmp)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('init')
    expect(r.stdout).toContain('validate')
    expect(r.stdout).toContain('dev')
    expect(r.stdout).toContain('build')
  })

  it('docs init scaffolds files', async () => {
    const r = runCli(
      [
        'docs',
        'init',
        '--locales',
        'en',
        '--coverage',
        'all',
        '--tagline',
        'hi',
        '--github',
        'https://x',
        '--project',
        'X',
      ],
      tmp,
    )
    expect(r.status).toBe(0)
    await access(join(tmp, 'docs/user/en/index.md'))
    await access(join(tmp, 'docs/user/en/index.html'))
  })

  it('docs validate exits 0 on scaffolded happy path with config enabled', async () => {
    runCli(
      ['docs', 'init', '--locales', 'en', '--coverage', 'all', '--project', 'X'],
      tmp,
    )
    await mkdir(join(tmp, '.specbook'), { recursive: true })
    await writeFile(
      join(tmp, '.specbook/specbook.config.ts'),
      `export default { docs: { user: { enabled: true, locales: ['en'], theme: 'anthropic-warm', coverage: 'all' } } }`,
    )
    const r = runCli(['docs', 'validate'], tmp)
    expect(r.status).toBe(0)
  })

  it('docs validate exits 1 when doc-key removed from md only', async () => {
    runCli(
      ['docs', 'init', '--locales', 'en', '--coverage', 'all', '--project', 'X'],
      tmp,
    )
    await mkdir(join(tmp, '.specbook'), { recursive: true })
    await writeFile(
      join(tmp, '.specbook/specbook.config.ts'),
      `export default { docs: { user: { enabled: true, locales: ['en'], theme: 'anthropic-warm', coverage: 'all' } } }`,
    )
    const mdPath = join(tmp, 'docs/user/en/index.md')
    const md = await readFile(mdPath, 'utf8')
    await writeFile(
      mdPath,
      md.replace(/<!--\s*doc-key:\s*install-setup\s*-->\n?/, ''),
    )
    const r = runCli(['docs', 'validate'], tmp)
    expect(r.status).toBe(1)
  })

  it('docs build writes dist/user/<locale>/ and chooser', async () => {
    runCli(
      [
        'docs',
        'init',
        '--locales',
        'en,zh-TW',
        '--coverage',
        'all',
        '--project',
        'X',
      ],
      tmp,
    )
    await mkdir(join(tmp, '.specbook'), { recursive: true })
    await writeFile(
      join(tmp, '.specbook/specbook.config.ts'),
      `export default { docs: { user: { enabled: true, locales: ['zh-TW','en'], theme: 'anthropic-warm', coverage: 'all' } } }`,
    )
    const r = runCli(['docs', 'build'], tmp)
    expect(r.status).toBe(0)
    await access(join(tmp, 'dist/user/index.html'))
    await access(join(tmp, 'dist/user/zh-TW/index.html'))
    await access(join(tmp, 'dist/user/en/index.html'))
  })
})
```

- [ ] **Step 2: Build then run test**

```bash
pnpm build && pnpm test tests/cli/docs.test.ts
```
Expected: 5 tests pass.

> 若 validate 對 .specbook/specbook.config.ts 的載入路徑與既有 `loadConfig` 不一致（例如它預設讀 `.specbook/specbook.config.ts` 但測試把 cwd 設成 tmp），需於測試中以 `--root` 旗標明確傳入，或在 `loadConfig` 對該情境的行為與既有 `validate` 命令一致。出錯時讀錯誤訊息對症處理。

- [ ] **Step 3: Commit**

```bash
git add tests/cli/docs.test.ts
git commit -m "test: [cli] add docs subcommand integration tests"
```

---

### Task 14: 最終驗證、文件更新、PR 邊界

- [ ] **Step 1: 跑所有測試**

```bash
pnpm test
```
Expected: 既有 145 + 新加 ≈ 51（9 schema + 10 coverage + 12 doc-keys + 6 validator + 6 scaffold + 3 build + 5 integration）= 196 tests 全綠。

- [ ] **Step 2: 跑 packaging smoke**

```bash
pnpm test:packaging
```
Expected: pass，`dist` 內含 `docs/templates/`。

- [ ] **Step 3: 更新 `docs/RELEASE-READINESS.md` 測試數字**

```bash
grep -n 'Tests       ' docs/RELEASE-READINESS.md
```
找到對應行，把 `Tests 145` 更新到實際數量（依 Step 1 印出的數字）。

- [ ] **Step 4: 更新 README.md 加 User documentation quick start**

於 README 既有 Quick start 之後加：

```markdown
## User documentation (optional)

如果你想要把使用者文件也託管在 SpecBook 內：

\`\`\`bash
npx specbook docs init --locales zh-TW,en --tagline "..."
npx specbook docs validate
npx specbook docs dev
npx specbook docs build
\`\`\`

詳見 `docs/superpowers/specs/2026-05-15-user-docs-integration-design.md`。
```

- [ ] **Step 5: Commit docs 更新**

```bash
git add docs/RELEASE-READINESS.md README.md
git commit -m "docs: [release] update test count + add user docs quick start"
```

- [ ] **Step 6: 手動 smoke**

```bash
# 在 throwaway 專案：
mkdir -p /tmp/specbook-docs-smoke && cd /tmp/specbook-docs-smoke
pnpm init
pnpm add -D /path/to/SpecBook   # 或 npm link
npx specbook docs init --locales en --tagline test --project smoke
npx specbook docs validate   # docs.user 未在 config 啟用 → exit 1，期望行為
mkdir -p .specbook
echo "export default { docs: { user: { enabled: true, locales: ['en'], theme: 'anthropic-warm', coverage: 'all' } } }" > .specbook/specbook.config.ts
npx specbook docs validate   # pass
npx specbook docs build
ls dist/user/
```

- [ ] **Step 7: Plan B 完成；準備 PR**

Plan B 的所有變更應只在：`src/`、`tests/`、`package.json`、`scripts/copy-build-assets.mjs`、`docs/RELEASE-READINESS.md`、`README.md`。**不應修改 `docs/user/`**（那是 Plan A / A′ 範圍）。

依專案 workflow 開 PR。

---

## Notes / Risks

1. **`src/cli/docs.ts` 在 Task 10 用 `loadConfig` 引入既有 config 讀取邏輯**。若該 helper 名稱/路徑不同，調整 import 但維持「讀 `.specbook/specbook.config.ts` → 取 `docs.user`」的語意。
2. **i18n 錯誤訊息渲染**目前簡化為 JSON 輸出。後續若要美化，於 `src/docs/format-error.ts` 加 `formatError(strings, err): string` helper，集中分派每個 token 的參數到對應 i18n 函式。
3. **Templates 路徑解析**（Task 7 的 `TEMPLATES_DIR`）依賴 `import.meta.url`。Dev 與 packaged 環境路徑都解析為「same dir as scaffold.js」/`templates/`，所以 Task 12 必須把 templates 複製到 `dist/docs/templates/`，與 `dist/docs/scaffold.js` 同層。
4. **`dist/user/index.html` locale chooser** 採 client-side `navigator.language` 偵測（依 spec §12 開放問題的預設選擇）。
5. **`docs.user.enabled: false` 是預設**。`specbook docs validate / build` 在未啟用時直接 exit 1 + 提示訊息；`specbook docs init` 不需要 config 即可跑。
