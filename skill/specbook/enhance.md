# /specbook enhance — Procedure

Goal: walk through `specbook enhance --json` output and fill in each item by
executing its `prompt`, then write back to `.specbook/content/*` and validate.

## Inputs you have at the start

- The user's current working directory (the project root).
- Tools: `Read`, `Write`, `Bash`.

## 1. Detect

```bash
npx specbook enhance --json --root .specbook
```

- exit 2 + `找不到 .specbook 目錄` → tell user to run `/specbook init`.
- `ok: true, items: []` → ask if they want to refine any specific section
  anyway:
  > 目前沒有明顯缺口，要針對特定章節再優化嗎？
- Otherwise → continue with the returned `items[]`.

## 2. Loop over items

For each `item` in `items[]` (already sorted by section, then `scope=section`
before `scope=item`):

1. Read `item.prompt` — it is an English instruction telling you exactly
   what to ask the user.
2. Draft a suggestion based on what you already know about the project
   (README, file tree, existing `.specbook/content/`).
3. Present the draft together with the prompt's question; iterate until the
   user is satisfied.
4. Plan the write: which file (`item.file`), and — if `scope='item'` —
   which path (`item.path`, e.g. `stories[0].soThat`, `milestones[1]`).

## 3. Write back

After a coherent batch is agreed (e.g. all of overview, or all user
stories), use `Write` to update the corresponding `.specbook/content/<file>`.

- See [`reference/schema-cheatsheet.md`](./reference/schema-cheatsheet.md)
  for schemas.
- Ensure no placeholder phrases remain.

## 4. Validate & finish

```bash
npx specbook validate --root .specbook
```

Fix any schema violations and repeat until clean. Then announce:

> ✅ Spec 已強化！下一步：`npx specbook dev` 預覽，或 `npx specbook build`。
