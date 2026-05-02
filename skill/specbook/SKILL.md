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
