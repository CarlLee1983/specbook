# SpecBook Agent Instructions

> This document is the operating guide for AI agents working on this project. Every agent contributing to development must follow these rules to keep system architecture, code quality, and visual style consistent.
>
> **Load path**: Claude Code loads this file via `CLAUDE.md → AGENTS.md`; other agents (Gemini, Codex, etc.) read this file directly. Do not put project rules in `CLAUDE.md`—keep all project rules here.
>
> **Precedence**: These rules override the user’s global defaults but are overridden by explicit user instructions in the conversation.

## 1. Antigravity Protocol (architecture–implementation split)

This project uses an **architect–builder** split. Before any task, decide which phase you are in:

- **Phase 1: The Architect**
  - **When to enter** (any one applies):
    - New features or new modules
    - Changes spanning more than three files
    - Edits to `src/schema/` or public types
    - Refactors to existing architecture or design patterns
  - **What to do**: Reason deeply about *why* and *what*. Produce a step-by-step implementation plan (Plan), including pseudocode or architectural logic. Get user approval before moving to Phase 2.
- **Phase 2: The Builder**
  - **When to enter**: The plan is approved, or you are making a targeted fix for a specific bug or instruction.
  - **What to do**: Execute the plan precisely and efficiently. Write production-quality code and run verification commands.

## 2. Visual style and UI rules (mandatory UI standards)

**Do not modify or add UI components without consulting `DESIGN.md`.**

- **Design system**: **PaperTech** (Vector-inspired).
- **Core philosophy**: Warm palette, information-dense layout, professional technical-doc feel (like a high-quality white paper).
- **Key principles**:
  - Warm base + dark text + a single accent color.
  - Spacing strictly on a 4px grid.
  - Borders consistently 1px hairlines.
- **Source of truth**: All concrete values for colors, typography, spacing, etc. live in `DESIGN.md`. Read `DESIGN.md` before changing UI, and avoid copying specific token values into this file (to prevent doc drift).

## 3. Engineering standards

- **Type safety**: TypeScript everywhere. Do not use `any`; when types are unknown, prefer `unknown` and narrow. Exemptions only in tests or rare edge cases with a stated reason.
- **Data validation**: All external input (md, yaml, config) must pass **Zod schemas** under `src/schema/`.
- **Schema coupling**: When you change `src/schema/`, update the related tests and `tests/fixtures/` sample data in the same change.
- **Test-driven development (TDD)**: Before implementing behavior, add tests (red phase), confirm they fail, then implement (green phase).
- **Verification**: After code changes, run `pnpm test` and confirm everything passes.

## 4. Workflow

Follow the **Research → Strategy → Execution** loop:

1. **Research**: Search the codebase and read files to learn existing patterns (map to your agent’s tools).
2. **Strategy**: Produce a short, clear plan.
3. **Execution**:
   - **Plan**: Bound a single coherent change set.
   - **Act**: Apply the changes.
   - **Validate**: Run `pnpm test` and lint; confirm all pass.

## 5. Context efficiency

- Batch tool calls when possible (e.g. parallel searches).
- When reading files, use line ranges so you do not load irrelevant sections.
- Stay on the task goal; avoid unrelated refactors.
