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
