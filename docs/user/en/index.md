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

> Read-only / inspection commands. Listing, describing, exploring.

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

