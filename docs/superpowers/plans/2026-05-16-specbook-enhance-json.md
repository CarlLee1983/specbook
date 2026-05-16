# `specbook enhance --json` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `specbook enhance` CLI subcommand that emits a machine-readable checklist (with English AI-actionable prompts) for placeholder + schema-level gaps in `.specbook/content/`, and reroute the existing `gaps` command to consume the new `enhance` module internally without changing its external behavior.

**Architecture:** New `src/enhance/` module owns placeholder regex + schema-level checks; pure-function checks consume already-loaded content. `src/cli/enhance.ts` mirrors `runGapsCli`'s `{exitCode, stdout, stderr}` style. `src/gaps/detect-gaps.ts` is downgraded to a thin adapter that filters enhance items where `id.startsWith('placeholder.')` and `scope==='section'`, then maps them to the legacy `Gap` shape.

**Tech Stack:** TypeScript, Node.js, Vitest, Commander (already used). No new dependencies.

---

## Pre-flight reading

Skim these before starting:
- `docs/superpowers/specs/2026-05-16-specbook-enhance-json-design.md` — the design this plan implements
- `src/cli/gaps.ts` — the mirror pattern for `runEnhanceCli`
- `src/gaps/detect-gaps.ts` — the existing placeholder regex source, to be moved
- `src/content/paths.ts`, `src/content/load-{overview,architecture,user-stories,roadmap}.ts` — content loaders we will reuse
- `tests/gaps/detect-gaps.test.ts` and `tests/cli/gaps.test.ts` — regression tests that must stay green untouched
- `src/scaffold/templates.ts` — source of truth for placeholder phrases

Reference list of placeholder phrases (exact strings emitted by `specbook init`):

| Section | Phrases / regex |
|---|---|
| overview | `在這裡寫一段 1-3 段的散文` ; `這段文字會以 hero 區呈現在 SpecBook 站首屏` |
| architecture | `在這裡描述系統的整體架構` |
| user-stories (section-level) | `主要使用者角色` ; `次要使用者` ; `第三類使用者` |
| user-stories (item-level field placeholders) | `as`: `主要使用者角色` / `次要使用者` / `第三類使用者` &nbsp;·&nbsp; `want`: `想做什麼` &nbsp;·&nbsp; `soThat`: `達成什麼` / `達成什麼成果` |
| roadmap (section-level) | `M1\s*—\s*起手` ; `第一個工作項` |
| roadmap (item-level title placeholder) | `^M\d+\s*—\s*起手$` |

---

## File Structure

**New files:**

```
src/enhance/types.ts                            # EnhanceItem / EnhanceReport / Section / Severity / Scope
src/enhance/detect.ts                           # detectEnhanceItems(root) -> EnhanceReport
src/enhance/checks/placeholder-overview.ts
src/enhance/checks/placeholder-architecture.ts
src/enhance/checks/placeholder-user-stories.ts
src/enhance/checks/placeholder-roadmap.ts
src/enhance/checks/schema-user-stories.ts
src/enhance/checks/schema-roadmap.ts
src/cli/enhance.ts                              # runEnhanceCli({root, json})

tests/enhance/detect.test.ts
tests/enhance/checks/placeholder-overview.test.ts
tests/enhance/checks/placeholder-architecture.test.ts
tests/enhance/checks/placeholder-user-stories.test.ts
tests/enhance/checks/placeholder-roadmap.test.ts
tests/enhance/checks/schema-user-stories.test.ts
tests/enhance/checks/schema-roadmap.test.ts
tests/cli/enhance.test.ts

tests/fixtures/enhance-all-placeholders/.specbook/specbook.config.ts
tests/fixtures/enhance-all-placeholders/.specbook/content/overview.md
tests/fixtures/enhance-all-placeholders/.specbook/content/architecture.md
tests/fixtures/enhance-all-placeholders/.specbook/content/user-stories.yaml
tests/fixtures/enhance-all-placeholders/.specbook/content/roadmap.yaml
tests/fixtures/enhance-all-placeholders/.specbook/content/tech-stack.yaml
tests/fixtures/enhance-all-placeholders/package.json

tests/fixtures/enhance-item-level/.specbook/specbook.config.ts
tests/fixtures/enhance-item-level/.specbook/content/overview.md
tests/fixtures/enhance-item-level/.specbook/content/architecture.md
tests/fixtures/enhance-item-level/.specbook/content/user-stories.yaml
tests/fixtures/enhance-item-level/.specbook/content/roadmap.yaml
tests/fixtures/enhance-item-level/.specbook/content/tech-stack.yaml
tests/fixtures/enhance-item-level/package.json
```

**Modified files:**

```
src/gaps/detect-gaps.ts                         # rewrite as adapter over detectEnhanceItems
src/cli/index.ts                                # register `enhance` command
```

**Not touched (regression surface):**

```
src/cli/gaps.ts, src/doctor/checks/gaps.ts
skill/specbook/enhance.md, README.md
tests/gaps/detect-gaps.test.ts, tests/cli/gaps.test.ts
```

The "clean" fixture for enhance tests reuses `examples/taskflow` (same pattern as the existing gaps tests).

---

## Task 1: `src/enhance/types.ts` — shared types

**Files:**
- Create: `src/enhance/types.ts`

- [ ] **Step 1: Create the file with all shared types**

```ts
// src/enhance/types.ts

export type Section = 'overview' | 'architecture' | 'user-stories' | 'roadmap'
export type Severity = 'warn' | 'info'
export type Scope = 'section' | 'item'

export interface EnhanceItem {
  id: string
  section: Section
  severity: Severity
  scope: Scope
  file: string
  path?: string
  problem: string
  prompt: string
}

export interface EnhanceReport {
  ok: boolean
  items: EnhanceItem[]
  meta: {
    specbookRoot: string
    durationMs: number
    schemaVersion: 1
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/enhance/types.ts
git commit -m "feat: [enhance] add EnhanceItem / EnhanceReport types"
```

---

## Task 2: `placeholder-overview` check (TDD)

**Files:**
- Test: `tests/enhance/checks/placeholder-overview.test.ts`
- Create: `src/enhance/checks/placeholder-overview.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/enhance/checks/placeholder-overview.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { checkPlaceholderOverview } from '../../../src/enhance/checks/placeholder-overview.js'
import type { Overview } from '../../../src/schema/overview.js'

const PROMPT =
  "Ask the user for a 1–3 paragraph project overview that explains what this project is, who it serves, and why it exists. Rewrite .specbook/content/overview.md so no placeholder phrases remain."

function makeOverview(body: string): Overview {
  return { tagline: 't', title: 'T', body } as Overview
}

describe('checkPlaceholderOverview', () => {
  it('hits when body contains 散文 placeholder', () => {
    const doc = makeOverview('在這裡寫一段 1-3 段的散文，blah blah')
    const items = checkPlaceholderOverview(doc)
    expect(items).toEqual([
      {
        id: 'placeholder.overview',
        section: 'overview',
        severity: 'warn',
        scope: 'section',
        file: '.specbook/content/overview.md',
        problem: 'Overview file still contains template placeholders.',
        prompt: PROMPT,
      },
    ])
  })

  it('hits when body contains hero placeholder', () => {
    const doc = makeOverview('foo\n這段文字會以 hero 區呈現在 SpecBook 站首屏\nbar')
    const items = checkPlaceholderOverview(doc)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('placeholder.overview')
  })

  it('returns [] when body is clean', () => {
    const doc = makeOverview('This is a real overview describing the project.')
    expect(checkPlaceholderOverview(doc)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/enhance/checks/placeholder-overview.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the check**

Create `src/enhance/checks/placeholder-overview.ts`:

```ts
import type { Overview } from '../../schema/overview.js'
import type { EnhanceItem } from '../types.js'

const PATTERNS: RegExp[] = [
  /在這裡寫一段 1-3 段的散文/,
  /這段文字會以 hero 區呈現在 SpecBook 站首屏/,
]

const PROMPT =
  "Ask the user for a 1–3 paragraph project overview that explains what this project is, who it serves, and why it exists. Rewrite .specbook/content/overview.md so no placeholder phrases remain."

export function checkPlaceholderOverview(doc: Overview): EnhanceItem[] {
  const hit = PATTERNS.some((re) => re.test(doc.body))
  if (!hit) return []
  return [
    {
      id: 'placeholder.overview',
      section: 'overview',
      severity: 'warn',
      scope: 'section',
      file: '.specbook/content/overview.md',
      problem: 'Overview file still contains template placeholders.',
      prompt: PROMPT,
    },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/enhance/checks/placeholder-overview.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/enhance/checks/placeholder-overview.ts tests/enhance/checks/placeholder-overview.test.ts
git commit -m "feat: [enhance] add placeholder-overview check"
```

---

## Task 3: `placeholder-architecture` check (TDD)

**Files:**
- Test: `tests/enhance/checks/placeholder-architecture.test.ts`
- Create: `src/enhance/checks/placeholder-architecture.ts`

Before writing the test, open `src/schema/architecture.ts` and confirm the field name that holds the prose body. The test and implementation below assume that field is `body`. If the schema names it differently, substitute that name in both files.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { checkPlaceholderArchitecture } from '../../../src/enhance/checks/placeholder-architecture.js'
import type { Architecture } from '../../../src/schema/architecture.js'

const PROMPT =
  "Ask the user for the system's high-level architecture: main components, how they communicate, and key external dependencies. Rewrite .specbook/content/architecture.md so no placeholder phrases remain."

function makeArch(body: string): Architecture {
  return { diagram: 'none', body } as Architecture
}

describe('checkPlaceholderArchitecture', () => {
  it('hits when body contains 整體架構 placeholder', () => {
    const items = checkPlaceholderArchitecture(makeArch('在這裡描述系統的整體架構：foo'))
    expect(items).toEqual([
      {
        id: 'placeholder.architecture',
        section: 'architecture',
        severity: 'warn',
        scope: 'section',
        file: '.specbook/content/architecture.md',
        problem: 'Architecture file still contains template placeholders.',
        prompt: PROMPT,
      },
    ])
  })

  it('returns [] when body is clean', () => {
    expect(checkPlaceholderArchitecture(makeArch('We use a three-tier architecture.'))).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/enhance/checks/placeholder-architecture.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the check**

```ts
// src/enhance/checks/placeholder-architecture.ts
import type { Architecture } from '../../schema/architecture.js'
import type { EnhanceItem } from '../types.js'

const PATTERNS: RegExp[] = [/在這裡描述系統的整體架構/]

const PROMPT =
  "Ask the user for the system's high-level architecture: main components, how they communicate, and key external dependencies. Rewrite .specbook/content/architecture.md so no placeholder phrases remain."

export function checkPlaceholderArchitecture(doc: Architecture): EnhanceItem[] {
  const hit = PATTERNS.some((re) => re.test(doc.body))
  if (!hit) return []
  return [
    {
      id: 'placeholder.architecture',
      section: 'architecture',
      severity: 'warn',
      scope: 'section',
      file: '.specbook/content/architecture.md',
      problem: 'Architecture file still contains template placeholders.',
      prompt: PROMPT,
    },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/enhance/checks/placeholder-architecture.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add src/enhance/checks/placeholder-architecture.ts tests/enhance/checks/placeholder-architecture.test.ts
git commit -m "feat: [enhance] add placeholder-architecture check"
```

---

## Task 4: `placeholder-user-stories` check (TDD)

**Files:**
- Test: `tests/enhance/checks/placeholder-user-stories.test.ts`
- Create: `src/enhance/checks/placeholder-user-stories.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { checkPlaceholderUserStories } from '../../../src/enhance/checks/placeholder-user-stories.js'
import type { UserStories } from '../../../src/schema/user-stories.js'

const PROMPT =
  'Ask the user for the primary, secondary, and tertiary actors and what each wants to accomplish. Rewrite .specbook/content/user-stories.yaml so no placeholder phrases remain.'

describe('checkPlaceholderUserStories', () => {
  it('hits when 主要使用者角色 appears anywhere', () => {
    const stories: UserStories = [
      { as: '主要使用者角色', want: 'x', soThat: 'y', priority: 'p1' },
    ]
    expect(checkPlaceholderUserStories(stories)).toEqual([
      {
        id: 'placeholder.user-stories',
        section: 'user-stories',
        severity: 'warn',
        scope: 'section',
        file: '.specbook/content/user-stories.yaml',
        problem: 'User stories file still contains template placeholders.',
        prompt: PROMPT,
      },
    ])
  })

  it('hits when 次要使用者 appears', () => {
    const stories: UserStories = [
      { as: '次要使用者', want: 'x', soThat: 'y', priority: 'p1' },
    ]
    expect(checkPlaceholderUserStories(stories)).toHaveLength(1)
  })

  it('hits when 第三類使用者 appears', () => {
    const stories: UserStories = [
      { as: '第三類使用者', want: 'x', soThat: 'y', priority: 'p1' },
    ]
    expect(checkPlaceholderUserStories(stories)).toHaveLength(1)
  })

  it('returns [] when all stories are real', () => {
    const stories: UserStories = [
      { as: '工程師', want: '寫程式', soThat: '解決問題', priority: 'p1' },
    ]
    expect(checkPlaceholderUserStories(stories)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/enhance/checks/placeholder-user-stories.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the check**

```ts
// src/enhance/checks/placeholder-user-stories.ts
import type { UserStories } from '../../schema/user-stories.js'
import type { EnhanceItem } from '../types.js'

const PATTERNS: RegExp[] = [/主要使用者角色/, /次要使用者/, /第三類使用者/]

const PROMPT =
  'Ask the user for the primary, secondary, and tertiary actors and what each wants to accomplish. Rewrite .specbook/content/user-stories.yaml so no placeholder phrases remain.'

export function checkPlaceholderUserStories(stories: UserStories): EnhanceItem[] {
  const text = JSON.stringify(stories)
  const hit = PATTERNS.some((re) => re.test(text))
  if (!hit) return []
  return [
    {
      id: 'placeholder.user-stories',
      section: 'user-stories',
      severity: 'warn',
      scope: 'section',
      file: '.specbook/content/user-stories.yaml',
      problem: 'User stories file still contains template placeholders.',
      prompt: PROMPT,
    },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/enhance/checks/placeholder-user-stories.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/enhance/checks/placeholder-user-stories.ts tests/enhance/checks/placeholder-user-stories.test.ts
git commit -m "feat: [enhance] add placeholder-user-stories check"
```

---

## Task 5: `placeholder-roadmap` check (TDD)

**Files:**
- Test: `tests/enhance/checks/placeholder-roadmap.test.ts`
- Create: `src/enhance/checks/placeholder-roadmap.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { checkPlaceholderRoadmap } from '../../../src/enhance/checks/placeholder-roadmap.js'
import type { Roadmap } from '../../../src/schema/roadmap.js'

const PROMPT =
  'Ask the user for 2–4 concrete milestones (title + deliverables + status). Rewrite .specbook/content/roadmap.yaml so no placeholder phrases remain.'

describe('checkPlaceholderRoadmap', () => {
  it('hits when title is M1 — 起手', () => {
    const roadmap: Roadmap = [
      { title: 'M1 — 起手', status: 'active', items: ['x'] },
    ]
    expect(checkPlaceholderRoadmap(roadmap)).toEqual([
      {
        id: 'placeholder.roadmap',
        section: 'roadmap',
        severity: 'warn',
        scope: 'section',
        file: '.specbook/content/roadmap.yaml',
        problem: 'Roadmap file still contains template placeholders.',
        prompt: PROMPT,
      },
    ])
  })

  it('hits when an item equals 第一個工作項', () => {
    const roadmap: Roadmap = [
      { title: 'Real Milestone', status: 'active', items: ['第一個工作項'] },
    ]
    expect(checkPlaceholderRoadmap(roadmap)).toHaveLength(1)
  })

  it('returns [] for a real roadmap', () => {
    const roadmap: Roadmap = [
      { title: 'M1 — Local MVP', status: 'done', items: ['real deliverable'] },
    ]
    expect(checkPlaceholderRoadmap(roadmap)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/enhance/checks/placeholder-roadmap.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the check**

```ts
// src/enhance/checks/placeholder-roadmap.ts
import type { Roadmap } from '../../schema/roadmap.js'
import type { EnhanceItem } from '../types.js'

const PATTERNS: RegExp[] = [/M1\s*—\s*起手/, /第一個工作項/]

const PROMPT =
  'Ask the user for 2–4 concrete milestones (title + deliverables + status). Rewrite .specbook/content/roadmap.yaml so no placeholder phrases remain.'

export function checkPlaceholderRoadmap(roadmap: Roadmap): EnhanceItem[] {
  const text = JSON.stringify(roadmap)
  const hit = PATTERNS.some((re) => re.test(text))
  if (!hit) return []
  return [
    {
      id: 'placeholder.roadmap',
      section: 'roadmap',
      severity: 'warn',
      scope: 'section',
      file: '.specbook/content/roadmap.yaml',
      problem: 'Roadmap file still contains template placeholders.',
      prompt: PROMPT,
    },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/enhance/checks/placeholder-roadmap.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/enhance/checks/placeholder-roadmap.ts tests/enhance/checks/placeholder-roadmap.test.ts
git commit -m "feat: [enhance] add placeholder-roadmap check"
```

---

## Task 6: `schema-user-stories` check (TDD)

This check is **item-level**: it iterates each story and emits one item per offending field. Placeholder field-value tables:

- `as` placeholders: `主要使用者角色`, `次要使用者`, `第三類使用者`
- `want` placeholders: `想做什麼`
- `soThat` placeholders: `達成什麼`, `達成什麼成果`

A field is considered "placeholder" if it is empty string OR exactly equals one of the strings above.

**Files:**
- Test: `tests/enhance/checks/schema-user-stories.test.ts`
- Create: `src/enhance/checks/schema-user-stories.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { checkSchemaUserStories } from '../../../src/enhance/checks/schema-user-stories.js'
import type { UserStories } from '../../../src/schema/user-stories.js'

describe('checkSchemaUserStories', () => {
  it('emits one item per offending field; multiple offenders in same story → multiple items', () => {
    const stories: UserStories = [
      { as: 'Engineer', want: '想做什麼', soThat: '達成什麼', priority: 'p1' },
    ]
    const items = checkSchemaUserStories(stories)
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.path)).toEqual(['stories[0].want', 'stories[0].soThat'])
    for (const it of items) {
      expect(it.id).toBe('schema.user-stories.story-incomplete')
      expect(it.section).toBe('user-stories')
      expect(it.severity).toBe('warn')
      expect(it.scope).toBe('item')
      expect(it.file).toBe('.specbook/content/user-stories.yaml')
    }
    expect(items[0].problem).toBe(
      "User story at stories[0] is missing a concrete 'want' value.",
    )
    expect(items[0].prompt).toBe(
      'Ask the user for a concrete `want` value for stories[0] (the actor / motivation / outcome). Update stories[0].want.',
    )
  })

  it('handles empty-string fields', () => {
    const stories: UserStories = [
      { as: '', want: 'x', soThat: 'y', priority: 'p1' },
    ]
    const items = checkSchemaUserStories(stories)
    expect(items).toHaveLength(1)
    expect(items[0].path).toBe('stories[0].as')
  })

  it('multiple stories, only offending ones emit items', () => {
    const stories: UserStories = [
      { as: 'Engineer', want: 'real want', soThat: 'real value', priority: 'p1' },
      { as: '次要使用者', want: 'real', soThat: 'real', priority: 'p1' },
      { as: '工程師', want: 'real', soThat: '達成什麼成果', priority: 'p2' },
    ]
    const items = checkSchemaUserStories(stories)
    expect(items.map((i) => i.path)).toEqual(['stories[1].as', 'stories[2].soThat'])
  })

  it('returns [] for fully real stories', () => {
    const stories: UserStories = [
      { as: 'Engineer', want: 'real', soThat: 'real', priority: 'p1' },
    ]
    expect(checkSchemaUserStories(stories)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/enhance/checks/schema-user-stories.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the check**

```ts
// src/enhance/checks/schema-user-stories.ts
import type { UserStories } from '../../schema/user-stories.js'
import type { EnhanceItem } from '../types.js'

const PLACEHOLDERS: Record<'as' | 'want' | 'soThat', readonly string[]> = {
  as: ['主要使用者角色', '次要使用者', '第三類使用者'],
  want: ['想做什麼'],
  soThat: ['達成什麼', '達成什麼成果'],
}

const FIELDS: Array<'as' | 'want' | 'soThat'> = ['as', 'want', 'soThat']

function isPlaceholder(field: 'as' | 'want' | 'soThat', value: string): boolean {
  if (value === '') return true
  return PLACEHOLDERS[field].includes(value)
}

export function checkSchemaUserStories(stories: UserStories): EnhanceItem[] {
  const items: EnhanceItem[] = []
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i]
    for (const field of FIELDS) {
      const value = story[field]
      if (typeof value !== 'string') continue
      if (!isPlaceholder(field, value)) continue
      const path = `stories[${i}].${field}`
      items.push({
        id: 'schema.user-stories.story-incomplete',
        section: 'user-stories',
        severity: 'warn',
        scope: 'item',
        file: '.specbook/content/user-stories.yaml',
        path,
        problem: `User story at stories[${i}] is missing a concrete '${field}' value.`,
        prompt: `Ask the user for a concrete \`${field}\` value for stories[${i}] (the actor / motivation / outcome). Update ${path}.`,
      })
    }
  }
  return items
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/enhance/checks/schema-user-stories.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/enhance/checks/schema-user-stories.ts tests/enhance/checks/schema-user-stories.test.ts
git commit -m "feat: [enhance] add schema-user-stories item-level check"
```

---

## Task 7: `schema-roadmap` check (TDD)

Two sub-rules per milestone:
- `milestone-title-placeholder`: title matches `^M\d+\s*—\s*起手$`
- `milestone-empty`: `items` array is empty

**Files:**
- Test: `tests/enhance/checks/schema-roadmap.test.ts`
- Create: `src/enhance/checks/schema-roadmap.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { checkSchemaRoadmap } from '../../../src/enhance/checks/schema-roadmap.js'
import type { Roadmap } from '../../../src/schema/roadmap.js'

describe('checkSchemaRoadmap', () => {
  it('emits milestone-title-placeholder when title matches M\\d — 起手', () => {
    const roadmap: Roadmap = [
      { title: 'M2 — 起手', status: 'active', items: ['real'] },
    ]
    const items = checkSchemaRoadmap(roadmap)
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      id: 'schema.roadmap.milestone-title-placeholder',
      section: 'roadmap',
      severity: 'warn',
      scope: 'item',
      file: '.specbook/content/roadmap.yaml',
      path: 'milestones[0].title',
      problem: "Milestone at milestones[0] still has a placeholder title.",
      prompt:
        'Ask the user for a concrete milestone title for milestones[0] (a short, specific theme — not "M… — 起手"). Update milestones[0].title.',
    })
  })

  it('emits milestone-empty when items is empty array', () => {
    const roadmap: Roadmap = [
      { title: 'Real Title', status: 'active', items: [] },
    ]
    const items = checkSchemaRoadmap(roadmap)
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      id: 'schema.roadmap.milestone-empty',
      section: 'roadmap',
      severity: 'warn',
      scope: 'item',
      file: '.specbook/content/roadmap.yaml',
      path: 'milestones[0]',
      problem: "Milestone 'Real Title' has an empty items list.",
      prompt:
        "Ask the user for 2–5 concrete deliverables for milestone 'Real Title'. Update milestones[0].items.",
    })
  })

  it('emits both rules for a milestone that triggers both', () => {
    const roadmap: Roadmap = [
      { title: 'M3 — 起手', status: 'future', items: [] },
    ]
    const items = checkSchemaRoadmap(roadmap)
    expect(items.map((i) => i.id)).toEqual([
      'schema.roadmap.milestone-title-placeholder',
      'schema.roadmap.milestone-empty',
    ])
  })

  it('returns [] for a real roadmap with non-empty items', () => {
    const roadmap: Roadmap = [
      { title: 'M1 — Local MVP', status: 'done', items: ['a'] },
    ]
    expect(checkSchemaRoadmap(roadmap)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/enhance/checks/schema-roadmap.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the check**

```ts
// src/enhance/checks/schema-roadmap.ts
import type { Roadmap } from '../../schema/roadmap.js'
import type { EnhanceItem } from '../types.js'

const TITLE_PLACEHOLDER = /^M\d+\s*—\s*起手$/

export function checkSchemaRoadmap(roadmap: Roadmap): EnhanceItem[] {
  const items: EnhanceItem[] = []
  for (let i = 0; i < roadmap.length; i++) {
    const m = roadmap[i]
    if (TITLE_PLACEHOLDER.test(m.title)) {
      const path = `milestones[${i}].title`
      items.push({
        id: 'schema.roadmap.milestone-title-placeholder',
        section: 'roadmap',
        severity: 'warn',
        scope: 'item',
        file: '.specbook/content/roadmap.yaml',
        path,
        problem: `Milestone at milestones[${i}] still has a placeholder title.`,
        prompt: `Ask the user for a concrete milestone title for milestones[${i}] (a short, specific theme — not "M… — 起手"). Update ${path}.`,
      })
    }
    if (Array.isArray(m.items) && m.items.length === 0) {
      const path = `milestones[${i}]`
      items.push({
        id: 'schema.roadmap.milestone-empty',
        section: 'roadmap',
        severity: 'warn',
        scope: 'item',
        file: '.specbook/content/roadmap.yaml',
        path,
        problem: `Milestone '${m.title}' has an empty items list.`,
        prompt: `Ask the user for 2–5 concrete deliverables for milestone '${m.title}'. Update ${path}.items.`,
      })
    }
  }
  return items
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/enhance/checks/schema-roadmap.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/enhance/checks/schema-roadmap.ts tests/enhance/checks/schema-roadmap.test.ts
git commit -m "feat: [enhance] add schema-roadmap item-level check"
```

---

## Task 8: Test fixtures

Two new fixture directories. The clean-state fixture is `examples/taskflow` (reused, no changes).

**Files:**
- Create: 7 files under `tests/fixtures/enhance-all-placeholders/`
- Create: 7 files under `tests/fixtures/enhance-item-level/`

- [ ] **Step 1: Create `enhance-all-placeholders` fixture**

`tests/fixtures/enhance-all-placeholders/package.json`:

```json
{ "name": "enhance-all-placeholders", "version": "0.0.0" }
```

`tests/fixtures/enhance-all-placeholders/.specbook/specbook.config.ts`:

```ts
import { defineConfig } from 'specbook'
export default defineConfig({ project: { name: 'all-placeholders' } })
```

`tests/fixtures/enhance-all-placeholders/.specbook/content/overview.md`:

```markdown
---
tagline: 一句話描述這個專案要解決什麼問題
---

# all-placeholders

在這裡寫一段 1-3 段的散文，說明專案要解決的問題、
為什麼這個問題重要、以及為什麼這個方案是合適的。
這段文字會以 hero 區呈現在 SpecBook 站首屏。
```

`tests/fixtures/enhance-all-placeholders/.specbook/content/architecture.md`:

```markdown
---
diagram: none
---

在這裡描述系統的整體架構：有哪幾層、彼此如何通訊、
與哪些外部系統互動。
```

`tests/fixtures/enhance-all-placeholders/.specbook/content/user-stories.yaml`:

```yaml
- as: 主要使用者角色
  want: 想做什麼
  soThat: 達成什麼成果
  priority: p0
- as: 次要使用者
  want: 想做什麼
  soThat: 達成什麼
  priority: p1
- as: 第三類使用者
  want: 想做什麼
  soThat: 達成什麼
  priority: p2
```

`tests/fixtures/enhance-all-placeholders/.specbook/content/roadmap.yaml`:

```yaml
- title: M1 — 起手
  quarter: 2026 Q1
  status: active
  items:
    - 第一個工作項
    - 第二個工作項
```

`tests/fixtures/enhance-all-placeholders/.specbook/content/tech-stack.yaml`:

Copy the file `tests/fixtures/partial-specbook/.specbook/content/tech-stack.yaml` verbatim into this location. (Read it first, then write the same content.)

- [ ] **Step 2: Create `enhance-item-level` fixture**

`tests/fixtures/enhance-item-level/package.json`:

```json
{ "name": "enhance-item-level", "version": "0.0.0" }
```

`tests/fixtures/enhance-item-level/.specbook/specbook.config.ts`:

```ts
import { defineConfig } from 'specbook'
export default defineConfig({ project: { name: 'item-level' } })
```

`tests/fixtures/enhance-item-level/.specbook/content/overview.md`:

```markdown
---
tagline: A real tagline for this project.
---

# Item Level Fixture

This is a real overview paragraph describing what the project does.
```

`tests/fixtures/enhance-item-level/.specbook/content/architecture.md`:

```markdown
---
diagram: none
---

We use a three-tier architecture: UI, Service, Data.
```

`tests/fixtures/enhance-item-level/.specbook/content/user-stories.yaml`:

```yaml
- as: Engineer
  want: Write fast code
  soThat: 達成什麼成果
  priority: p0
- as: Designer
  want: Create mockups
  soThat: Validate the design with users
  priority: p1
```

`tests/fixtures/enhance-item-level/.specbook/content/roadmap.yaml`:

```yaml
- title: M1 — Local MVP
  quarter: 2026 Q1
  status: done
  items:
    - Implement core feature
- title: M2 — Cloud
  quarter: 2026 Q2
  status: active
  items: []
```

`tests/fixtures/enhance-item-level/.specbook/content/tech-stack.yaml`:

Copy the file `tests/fixtures/partial-specbook/.specbook/content/tech-stack.yaml` verbatim.

- [ ] **Step 3: Verify fixtures parse (quick sanity)**

Skip this step if `dist/` is stale; Task 9's integration test will catch parse errors. If `dist/` is fresh:

```bash
node -e "import('./dist/content/load-user-stories.js').then(m => m.loadUserStories('tests/fixtures/enhance-item-level/.specbook/content/user-stories.yaml').then(console.log))"
```

Expected: 2-element array with the two stories.

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/enhance-all-placeholders tests/fixtures/enhance-item-level
git commit -m "test: [enhance] add fixtures for all-placeholders and item-level scenarios"
```

---

## Task 9: `src/enhance/detect.ts` orchestrator (TDD)

Loads the four content files via existing loaders, dispatches all six checks, sorts items per the design spec's §3 ordering rules (section order `overview → architecture → user-stories → roadmap`; within a section, `scope='section'` items before `scope='item'`), returns `EnhanceReport`.

**Files:**
- Test: `tests/enhance/detect.test.ts`
- Create: `src/enhance/detect.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { detectEnhanceItems } from '../../src/enhance/detect.js'

const ALL = resolve(__dirname, '../fixtures/enhance-all-placeholders/.specbook')
const ITEM = resolve(__dirname, '../fixtures/enhance-item-level/.specbook')
const CLEAN = resolve(__dirname, '../../examples/taskflow')

describe('detectEnhanceItems', () => {
  it('all-placeholders fixture → 4 section-level items in canonical order (before item-level)', async () => {
    const r = await detectEnhanceItems(ALL)
    expect(r.ok).toBe(false)
    const sectionIds = r.items
      .filter((i) => i.scope === 'section')
      .map((i) => i.id)
    expect(sectionIds).toEqual([
      'placeholder.overview',
      'placeholder.architecture',
      'placeholder.user-stories',
      'placeholder.roadmap',
    ])
    expect(r.meta.schemaVersion).toBe(1)
    expect(r.meta.specbookRoot).toBe(ALL)
    expect(typeof r.meta.durationMs).toBe('number')
  })

  it('item-level fixture → 0 section + 2 item-level items', async () => {
    const r = await detectEnhanceItems(ITEM)
    expect(r.ok).toBe(false)
    const ids = r.items.map((i) => i.id)
    expect(ids).toEqual([
      'schema.user-stories.story-incomplete',
      'schema.roadmap.milestone-empty',
    ])
    expect(r.items[0].path).toBe('stories[0].soThat')
    expect(r.items[1].path).toBe('milestones[1]')
  })

  it('clean fixture → ok: true, no items', async () => {
    const r = await detectEnhanceItems(CLEAN)
    expect(r.ok).toBe(true)
    expect(r.items).toEqual([])
  })

  it('section-level placeholder does NOT short-circuit item-level checks', async () => {
    // all-placeholders has placeholder user-stories AND every story has
    // per-field placeholders, so item-level checks must also fire.
    const r = await detectEnhanceItems(ALL)
    const itemLevel = r.items.filter((i) => i.scope === 'item')
    // 3 stories × 3 placeholder fields = 9 user-story items + 1 roadmap title item.
    expect(itemLevel.length).toBeGreaterThanOrEqual(10)
  })

  it('ordering: within a section, scope=section items come before scope=item items', async () => {
    const r = await detectEnhanceItems(ALL)
    const userStoryItems = r.items.filter((i) => i.section === 'user-stories')
    expect(userStoryItems[0].scope).toBe('section')
    for (let i = 1; i < userStoryItems.length; i++) {
      expect(userStoryItems[i].scope).toBe('item')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/enhance/detect.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the orchestrator**

```ts
// src/enhance/detect.ts
import { resolvePaths } from '../content/paths.js'
import { loadOverview } from '../content/load-overview.js'
import { loadArchitecture } from '../content/load-architecture.js'
import { loadUserStories } from '../content/load-user-stories.js'
import { loadRoadmap } from '../content/load-roadmap.js'
import { checkPlaceholderOverview } from './checks/placeholder-overview.js'
import { checkPlaceholderArchitecture } from './checks/placeholder-architecture.js'
import { checkPlaceholderUserStories } from './checks/placeholder-user-stories.js'
import { checkPlaceholderRoadmap } from './checks/placeholder-roadmap.js'
import { checkSchemaUserStories } from './checks/schema-user-stories.js'
import { checkSchemaRoadmap } from './checks/schema-roadmap.js'
import type { EnhanceItem, EnhanceReport, Section } from './types.js'

const SECTION_ORDER: Section[] = ['overview', 'architecture', 'user-stories', 'roadmap']

function sortItems(items: EnhanceItem[]): EnhanceItem[] {
  const sectionIndex = (s: Section) => SECTION_ORDER.indexOf(s)
  const scopeRank = (s: 'section' | 'item') => (s === 'section' ? 0 : 1)
  return [...items].sort((a, b) => {
    const ds = sectionIndex(a.section) - sectionIndex(b.section)
    if (ds !== 0) return ds
    return scopeRank(a.scope) - scopeRank(b.scope)
  })
}

export async function detectEnhanceItems(specbookRoot: string): Promise<EnhanceReport> {
  const started = Date.now()
  const paths = resolvePaths(specbookRoot)
  const [overview, architecture, stories, roadmap] = await Promise.all([
    loadOverview(paths.files.overview),
    loadArchitecture(paths.files.architecture),
    loadUserStories(paths.files.userStories),
    loadRoadmap(paths.files.roadmap),
  ])
  const items: EnhanceItem[] = [
    ...checkPlaceholderOverview(overview),
    ...checkPlaceholderArchitecture(architecture),
    ...checkPlaceholderUserStories(stories),
    ...checkPlaceholderRoadmap(roadmap),
    ...checkSchemaUserStories(stories),
    ...checkSchemaRoadmap(roadmap),
  ]
  const sorted = sortItems(items)
  return {
    ok: sorted.length === 0,
    items: sorted,
    meta: {
      specbookRoot: paths.root,
      durationMs: Date.now() - started,
      schemaVersion: 1,
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/enhance/detect.test.ts`
Expected: PASS (5/5).

If the clean-fixture test fails because `examples/taskflow` triggers one of the new item-level rules (e.g. a milestone with `items: []`), **do not relax the test**. Investigate the fixture: either fix `examples/taskflow`'s data, or switch the clean-fixture path to a dedicated `tests/fixtures/enhance-clean/.specbook` directory copied from taskflow with the offending row fixed. Whichever path you take, keep the test assertion `ok=true, items=[]`.

- [ ] **Step 5: Commit**

```bash
git add src/enhance/detect.ts tests/enhance/detect.test.ts
git commit -m "feat: [enhance] add detect orchestrator with ordering rules"
```

---

## Task 10: `src/cli/enhance.ts` CLI (TDD)

Mirrors `runGapsCli` style. Pure function returning `{exitCode, stdout, stderr}`. No `process.exit` inside.

**Files:**
- Test: `tests/cli/enhance.test.ts`
- Create: `src/cli/enhance.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { runEnhanceCli } from '../../src/cli/enhance.js'

const ALL = resolve(__dirname, '../fixtures/enhance-all-placeholders/.specbook')
const ITEM = resolve(__dirname, '../fixtures/enhance-item-level/.specbook')
const CLEAN = resolve(__dirname, '../../examples/taskflow')

describe('runEnhanceCli', () => {
  it('--json on all-placeholders → exit 0 + parseable JSON with ok=false', async () => {
    const r = await runEnhanceCli({ root: ALL, json: true })
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toBe('')
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(false)
    expect(Array.isArray(parsed.items)).toBe(true)
    expect(parsed.items[0].id).toBe('placeholder.overview')
    expect(parsed.meta.schemaVersion).toBe(1)
  })

  it('--json on clean fixture → ok=true, items=[]', async () => {
    const r = await runEnhanceCli({ root: CLEAN, json: true })
    expect(r.exitCode).toBe(0)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.ok).toBe(true)
    expect(parsed.items).toEqual([])
  })

  it('--json on item-level → contains item-level paths', async () => {
    const r = await runEnhanceCli({ root: ITEM, json: true })
    const parsed = JSON.parse(r.stdout)
    const paths = parsed.items.map((i: { path?: string }) => i.path)
    expect(paths).toContain('stories[0].soThat')
    expect(paths).toContain('milestones[1]')
  })

  it('no --json on clean → green check message', async () => {
    const r = await runEnhanceCli({ root: CLEAN, json: false })
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toMatch(/✅/)
    expect(r.stdout).toMatch(/Spec 已完整/)
  })

  it('no --json on non-clean → human-readable list', async () => {
    const r = await runEnhanceCli({ root: ALL, json: false })
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toMatch(/偵測到以下可補齊項/)
    expect(r.stdout).toMatch(/user-stories/)
    expect(r.stdout).toMatch(/\[warn\]/)
  })

  it('root does not exist → exit 2 + stderr message, empty stdout', async () => {
    const r = await runEnhanceCli({ root: '/tmp/specbook-does-not-exist-enhance', json: false })
    expect(r.exitCode).toBe(2)
    expect(r.stdout).toBe('')
    expect(r.stderr).toMatch(/找不到 \.specbook 目錄/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cli/enhance.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the CLI module**

```ts
// src/cli/enhance.ts
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { detectEnhanceItems } from '../enhance/detect.js'
import type { EnhanceReport } from '../enhance/types.js'

export interface EnhanceCliInput {
  root: string
  json: boolean
}

export interface EnhanceCliOutput {
  exitCode: number
  stdout: string
  stderr: string
}

function formatText(report: EnhanceReport): string {
  if (report.ok) return '✅ Spec 已完整，沒有可補齊項。'
  const lines = [`偵測到以下可補齊項（${report.items.length}）：`, '']
  for (const it of report.items) {
    const where = it.path ? `${it.section} › ${it.path}` : it.section
    lines.push(`  [${it.severity}] ${where}`)
    lines.push(`    ${it.problem}`)
    lines.push('    → 跑 /specbook enhance 互動補完。')
    lines.push('')
  }
  lines.push('說明：可補齊項不會擋住 specbook dev / build；JSON 模式請加 --json。')
  return lines.join('\n')
}

export async function runEnhanceCli(input: EnhanceCliInput): Promise<EnhanceCliOutput> {
  const root = resolve(input.root)
  if (!existsSync(root)) {
    return { exitCode: 2, stdout: '', stderr: `找不到 .specbook 目錄：${root}` }
  }
  try {
    const report = await detectEnhanceItems(root)
    if (input.json) {
      return { exitCode: 0, stdout: JSON.stringify(report, null, 2), stderr: '' }
    }
    return { exitCode: 0, stdout: formatText(report), stderr: '' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { exitCode: 2, stdout: '', stderr: `enhance crashed: ${msg}` }
  }
}

```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cli/enhance.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add src/cli/enhance.ts tests/cli/enhance.test.ts
git commit -m "feat: [enhance] add runEnhanceCli with --json and text formatters"
```

---

## Task 11: Register `enhance` in `src/cli/index.ts`

**Files:**
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Add the new command registration**

Open `src/cli/index.ts`. Locate the existing `program.command('gaps')` block (ends with `process.exit(r.exitCode) })`). Immediately after that block, insert:

```ts
program
  .command('enhance')
  .description('List remaining placeholders and schema gaps with AI-actionable prompts')
  .option('-r, --root <dir>', 'Path to .specbook directory', '.specbook')
  .option('--json', 'Emit JSON to stdout', false)
  .action(async (opts: { root: string; json: boolean }) => {
    const { runEnhanceCli } = await import('./enhance.js')
    const r = await runEnhanceCli({ root: opts.root, json: opts.json })
    if (r.stdout) process.stdout.write(r.stdout + '\n')
    if (r.stderr) process.stderr.write(r.stderr + '\n')
    process.exit(r.exitCode)
  })
```

Keep the existing `gaps` block in place.

- [ ] **Step 2: Build and smoke-test the CLI**

```bash
pnpm build
node dist/cli/index.js enhance --help
```

Expected: help text shows `--root` and `--json` options. No crash.

```bash
node dist/cli/index.js enhance --root tests/fixtures/enhance-all-placeholders/.specbook --json | head -30
```

Expected: JSON with `"ok": false` and items starting with `placeholder.overview`.

- [ ] **Step 3: Run the full vitest suite to confirm no regressions**

Run: `pnpm test`
Expected: ALL tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/cli/index.ts
git commit -m "feat: [cli] register specbook enhance subcommand"
```

---

## Task 12: Rewrite `src/gaps/detect-gaps.ts` as an enhance adapter

The existing `detectGaps` keeps its public signature (`(root: string) => Promise<GapReport>`) but is rebuilt as a thin filter over `detectEnhanceItems`. The existing `Gap.reason` regex test (`/placeholder|預設/`) matches the new English problem strings (e.g. `"User stories file still contains template placeholders."` contains "placeholder"), so existing tests pass unmodified.

**Files:**
- Modify: `src/gaps/detect-gaps.ts`

- [ ] **Step 1: Verify existing gaps tests pass against the current implementation (baseline)**

Run: `pnpm vitest run tests/gaps tests/cli/gaps.test.ts`
Expected: PASS. Note the test count so you can confirm it stays the same after the rewrite.

- [ ] **Step 2: Rewrite `detect-gaps.ts`**

Replace the entire contents of `src/gaps/detect-gaps.ts` with:

```ts
import { detectEnhanceItems } from '../enhance/detect.js'

export type GapSection = 'overview' | 'architecture' | 'user-stories' | 'roadmap'

export interface Gap {
  section: GapSection
  reason: string
}

export interface GapReport {
  gaps: Gap[]
  ok: boolean
}

export async function detectGaps(specbookRoot: string): Promise<GapReport> {
  const report = await detectEnhanceItems(specbookRoot)
  const gaps: Gap[] = report.items
    .filter((i) => i.scope === 'section' && i.id.startsWith('placeholder.'))
    .map((i) => ({ section: i.section as GapSection, reason: i.problem }))
  return { gaps, ok: gaps.length === 0 }
}
```

- [ ] **Step 3: Run the gaps regression tests**

Run: `pnpm vitest run tests/gaps tests/cli/gaps.test.ts`
Expected: PASS — same count as Step 1, zero changes to test files.

If a test fails because the new `reason` doesn't match the regex `/placeholder|預設/`, **do not change the test**. Confirm the placeholder check `problem` strings still contain the substring "placeholder" — they do per Tasks 2–5 — and re-run.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm test`
Expected: ALL tests pass (enhance + gaps + everything else).

- [ ] **Step 5: Verify TypeScript still compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/gaps/detect-gaps.ts
git commit -m "refactor: [gaps] rewrite detectGaps as adapter over detectEnhanceItems"
```

---

## Task 13: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: ALL tests pass.

- [ ] **Step 2: Type check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: success, `dist/cli/index.js` exists.

- [ ] **Step 4: End-to-end smoke tests**

```bash
node dist/cli/index.js enhance --root tests/fixtures/enhance-all-placeholders/.specbook --json
```

Expected: JSON with `ok: false`, 4+ items, first id `placeholder.overview`.

```bash
node dist/cli/index.js enhance --root tests/fixtures/enhance-item-level/.specbook --json
```

Expected: JSON with `ok: false`, item-level items at `stories[0].soThat` and `milestones[1]`.

```bash
node dist/cli/index.js enhance --root examples/taskflow --json
```

Expected: JSON with `ok: true`, `items: []`.

```bash
node dist/cli/index.js enhance --root tests/fixtures/enhance-all-placeholders/.specbook
```

Expected: text output starting with `偵測到以下可補齊項`.

```bash
node dist/cli/index.js gaps --root tests/fixtures/partial-specbook/.specbook --json
```

Expected: gaps output, behavior unchanged from before.

- [ ] **Step 5: Confirm spec's Definition of Done is met**

Open `docs/superpowers/specs/2026-05-16-specbook-enhance-json-design.md` §10 and confirm each bullet is satisfied:
- `npx specbook enhance --json` outputs schema-compliant JSON for all three fixtures (all-placeholders / item-level / clean)
- Plain `npx specbook enhance` outputs the human list
- `npx specbook gaps` byte-equivalent behavior; original tests untouched
- All new modules have unit tests; CLI has integration tests
- `pnpm test` green, `tsc --noEmit` no errors
- README / skill / doctor untouched

- [ ] **Step 6: Final commit (if any uncommitted changes remain)**

```bash
git status
```

If anything is uncommitted, group it logically and commit. Otherwise this step is a no-op.

---

## Out-of-scope reminders

These are NOT in this PR (see §8 of the spec):
- `gaps` deprecation warning to stderr — phase 2
- Switching `skill/specbook/enhance.md` to call `npx specbook enhance --json` — phase 2
- Renaming/rewiring `src/doctor/checks/gaps.ts` — phase 2
- LLM-augmented prompt generation — never in scope
- Multi-language prompts (`prompt_en` / `prompt_zh`) — future schema bump
- `severity: 'error'` — not introduced

If you discover something during implementation that you think belongs in this PR but isn't listed above, stop and check with the user before adding it.
