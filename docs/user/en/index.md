# SpecBook

<!-- doc-key: overview -->
把專案 spec 變成有節奏感的單頁站

> Replace this paragraph with a one-paragraph overview of what
> SpecBook does and who it is for.

---

<!-- doc-key: install-setup -->
## Install & setup

SpecBook is published on npm. It requires **Node.js 20 or newer** plus pnpm (or npm/yarn). Check your toolchain first:

```bash
node --version   # v20.x or newer
pnpm --version   # any recent version
```

Install SpecBook as a dev dependency in the target project:

```bash
pnpm add -D specbook
```

Run the initializer. SpecBook detects your `package.json`, writes `.specbook/specbook.config.ts`, and scaffolds the five chapter placeholders (Overview, Tech Stack, Architecture, User Stories, Roadmap):

```bash
npx specbook init
```

`init` is idempotent — re-running it does not overwrite existing files. Pass `--force` if you need to re-scaffold from scratch.

Start the local dev server to preview:

```bash
npx specbook dev
```

Open `http://localhost:5173` to see the first render. Any edit under `.specbook/content/` triggers hot reload in the browser.

> Mermaid is opt-in: if `architecture.md` contains a ` ```mermaid` block, install the optional `playwright` peer dep (`pnpm add -D playwright`). Skip it if you have no diagrams.

<!-- doc-key: discovery-read -->
## Discovery / read

Two read-only commands let you inspect state without changing anything.

`specbook validate` runs the zod schemas across `.specbook/content/`. It prints `All content valid.` and exits 0 on success; on failure it prints each error and exits 1, so you can wire it directly into CI:

```bash
npx specbook validate
```

`specbook gaps` detects placeholders, leftover templates, and missing fields you still need to fill in. It prints a human-readable list by default; pass `--json` for LLM or automation consumers:

```bash
npx specbook gaps
npx specbook gaps --json
```

`gaps` always exits 0 (gaps are informational, not errors); it exits 2 only if `.specbook` is missing. Pair the two: `validate` enforces the schema, `gaps` tells you which chapter to write next.

<!-- doc-key: writes-mutations -->
## Writes / mutations

Three commands write files to disk.

`specbook init` scaffolds `.specbook/`. It is idempotent by default and will not overwrite existing files. Use `--force` to re-scaffold; use `--only` to limit the operation to specific chapters:

```bash
npx specbook init --force
npx specbook init --only overview,tech-stack
```

`specbook build` produces a deployable static site under `.specbook/dist/`, with `index.html`, `sitemap.xml`, and assets:

```bash
npx specbook build
```

`build` runs a full Vite production build and SSR-prerenders `index.html`. It prints `Built to <outDir>` when finished.

`specbook export` writes a client-facing system specification document under `.specbook/dist/client-spec/` (override with `-o`):

```bash
npx specbook export
npx specbook export --formats md
npx specbook export -o build/spec
```

The default output is both `system-spec.md` and `system-spec.html`; restrict with `--formats`. The HTML version stamps `<html lang="...">` from `theme.locale`, so the same content yields a `zh-TW` or `en` document depending on config.

<!-- doc-key: advanced-tools -->
## Advanced tools

`.specbook/specbook.config.ts` controls project-level settings and is validated by zod. Common knobs:

```ts
import { defineConfig } from 'specbook'

export default defineConfig({
  project: { name: 'TaskFlow', description: 'Project description', url: 'https://example.com' },
  theme: { accent: '#D97757', locale: 'zh-TW', mode: 'light' },
  document: { title: 'System Specification', version: 'v1.0', audience: 'Client' },
  sections: {
    order: ['overview', 'tech-stack', 'architecture', 'user-stories', 'roadmap'],
    hide: [],
  },
})
```

- `theme.locale`: switches between `zh-TW` and `en` with built-in string tables
- `theme.accent`: must be a 6-digit hex color
- `sections.hide`: applies to both the site and `export`
- `document.title`: drives the cover title of the exported spec

Deploying to a GitHub Pages subpath? Use `--base` to prefix asset URLs:

```bash
npx specbook build --base /my-repo/
```

`export` also accepts custom formats and output paths:

```bash
npx specbook export --formats md,html -o build/spec
npx specbook export --formats md      # markdown only
```

The built-in i18n strings live in `i18n/{zh-TW,en}.ts` inside the npm package. v1 does not yet support per-string overrides — open an issue if you need it.

<!-- doc-key: diagnostics-recovery -->
## Diagnostics / recovery

When `dev` or `build` prints errors, or the rendered site looks off, start with `validate` to find schema issues:

```bash
npx specbook validate
```

Common errors:

- `[overview] ...` / `[tech-stack] ...` prefix: a schema mismatch in that chapter's frontmatter or yaml (missing field, wrong type). Open `.specbook/content/<file>` and fix the field called out in the message.
- `找不到 .specbook 目錄` / `.specbook not found`: you are not at the project root, or `init` has not been run yet.
- `Cannot find module 'specbook'`: the dev dependency is not installed; rerun `pnpm install`.

`specbook gaps` can still report unfinished chapters (for example, all-placeholder user stories) even after `validate` passes. Gaps do not block `build`, but they leave the client-facing export incomplete:

```bash
npx specbook gaps
```

Before re-scaffolding, commit anything important. `init --force` overwrites existing files in `.specbook/content/` with no undo:

```bash
git status            # confirm no uncommitted changes
npx specbook init --force
```

Still stuck? File an issue: [github.com/carl-ee/specbook/issues](https://github.com/carl-ee/specbook/issues). Include the full `validate` / `gaps` output, your `.specbook/specbook.config.ts`, and `node --version`.

<!-- doc-key: ai-integration -->
## AI-agent integration

SpecBook's content format is LLM-friendly by design:

- `.specbook/content/*.md`: standard Markdown with YAML frontmatter
- `.specbook/content/*.yaml`: plain YAML, locked by zod schemas
- `.specbook/specbook.config.ts`: typed TypeScript configuration

Any AI agent can read and write these files without extra parsing. Recommended loop:

1. `npx specbook validate` — confirm the current schemas pass
2. `npx specbook gaps --json` — get a structured list of gaps
3. Edit the relevant file under `.specbook/content/`
4. `npx specbook validate` — confirm the edit still validates

Pass `--json` to `gaps` for machine-readable output that an agent can parse directly.

**For Claude Code users**: SpecBook ships a Claude Code skill inside the npm package at `node_modules/specbook/skill/specbook`. Copy it into `~/.claude/skills/specbook/`:

```bash
mkdir -p ~/.claude/skills
cp -R node_modules/specbook/skill/specbook ~/.claude/skills/specbook
```

- `/specbook init` — one-shot scaffold plus LLM-drafted overview and architecture
- `/specbook enhance` — interactive Q&A to fill in user-stories and roadmap

The skill ships `reference/schema-cheatsheet.md`, which the agent should read before writing to reduce schema violations. Compose it with other skills (`superpowers`, etc.) for a brainstorm → execute → validate loop.

<!-- doc-key: visual-surfaces -->
## Visual / dashboard surfaces

> Any HTML report, dashboard, or visual output the tool produces.

<!-- doc-key: documentation-maintenance -->
## Documentation maintenance

> How these docs stay aligned: the doc-key contract, multi-locale
> policy, and `bun run docs:check`.

