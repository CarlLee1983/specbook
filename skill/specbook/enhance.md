# /specbook enhance — Procedure

Goal: fill in `user-stories.yaml` and `roadmap.yaml` through interactive Q&A, ensuring the final spec is professional and specific.

## Inputs you have at the start

- The user's current working directory (the project root).
- Tools: `Read`, `Write`, `Bash`.

## Steps

### 1. Run gap detection

```bash
npx specbook gaps --json --root .specbook
```

If it fails because `.specbook` doesn't exist, tell the user:
> 好像還沒跑過 init？請先執行 `/specbook init`。

If it returns `ok: true`, ask if the user wants to refine specific sections anyway:
> 目前沒有明顯缺口，要針對特定章節（如 User Stories 或 Roadmap）再優化嗎？

### 2. Prioritise gaps

Focus on `user-stories` and `roadmap` first. If `overview` or `architecture` are also flagged as placeholders, they are quick wins to include in the discussion.

### 3. Interactive Q&A

For each gap:
1.  **Draft a suggestion** based on what you already know about the project (README, file tree).
2.  **Ask the user** for confirmation or more details.
    *   *Bad:* "Please tell me the roadmap."
    *   *Good:* "I see this is a React + Supabase project. I've drafted M1 as 'MVP with Auth' and M2 as 'Realtime Sync'. Does that match your plan, or are there other priorities?"
3.  **Iterate** until the user is happy with the content for that section.

### 4. Write back

Once a section is agreed upon, use the `Write` tool to update the corresponding file in `.specbook/content/`.

- See [`reference/schema-cheatsheet.md`](./reference/schema-cheatsheet.md) for schemas.
- **Ensure no placeholder phrases remain** (e.g. "主要使用者角色", "M1 — 起手").

### 5. Validate

```bash
npx specbook validate --root .specbook
```

Fix any schema violations and repeat until valid.

### 6. Summary

Once all agreements are written and validated:
> ✅ Spec 已強化！User Stories 與 Roadmap 已更新並通過驗證。
> 下一步：`npx specbook dev` 預覽，或 `npx specbook build` 產出靜態站。
