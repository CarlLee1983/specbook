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

> Commands that change state, plus safety mechanisms (`--dry-run`,
> previews, confirmations).

<!-- doc-key: advanced-tools -->
## Advanced tools

> Power-user commands. REPL, scripting, plugins, code generation.

<!-- doc-key: diagnostics-recovery -->
## Diagnostics / recovery

> `doctor`-style health checks, error recovery workflows, structured
> error output for AI consumers.

<!-- doc-key: ai-integration -->
## AI-agent integration

> How an LLM agent should use SpecBook: structured errors, skill
> packs, safe defaults, dry-run gates.

<!-- doc-key: visual-surfaces -->
## Visual / dashboard surfaces

> Any HTML report, dashboard, or visual output the tool produces.

<!-- doc-key: documentation-maintenance -->
## Documentation maintenance

> How these docs stay aligned: the doc-key contract, multi-locale
> policy, and `bun run docs:check`.

