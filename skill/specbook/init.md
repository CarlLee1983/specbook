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

- If the project clearly has multiple layers (UI ↔ API ↔ DB), set `diagram: mermaid` and add a ```mermaid ... ``` block in the body.
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
