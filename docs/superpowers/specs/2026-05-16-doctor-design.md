# `specbook doctor` 設計

- **日期**：2026-05-16
- **狀態**：Design — 待 writing-plans 展開實作計畫
- **作者**：Carl（與 Claude 協作）
- **取代 / 影響**：擴充 `docs/user/*/index.md` 的 `diagnostics-recovery` 區塊；不取代 `validate` / `gaps` / `docs validate`，而是聚合它們。

## 1. 動機

目前使用者卡關時的 SOP 是手動串：

1. 確認 `.specbook` 存在
2. 確認 Node ≥ 20、依賴已安裝
3. `specbook validate`
4. `specbook gaps`
5. 若 docs.user 有啟用，再跑 `specbook docs validate`
6. 內容含 Mermaid 時，手動裝 `playwright`

每一步使用者都要記得跑、自己整合結論。`doctor` 把這串聚合成單一指令，並以結構化 `DoctorReport` 輸出，讓人類與 AI agent（Claude Code skill、CI workflow）都能消費。

非目標：

- **不做** 自動修復（`--fix`）。修復語義需要更深設計，v1 範圍外。
- **不取代** 個別子指令；`validate` 與 `gaps` 仍可獨立使用。
- **不引入新依賴**（不加 chalk、不加新的 schema 函式庫）。

## 2. 模組架構

```
src/
  cli/
    doctor.ts                     ← Commander 子指令，flag parse + 輸出格式化
  doctor/
    run-doctor.ts                 ← 純函式 runDoctor(input) → DoctorReport
    types.ts                      ← DoctorReport / DoctorFinding / Severity
    format-text.ts                ← TTY 友善的人類可讀輸出
    checks/
      node-version.ts
      specbook-root.ts
      validate.ts                 ← 薄殼 wrap runValidate
      gaps.ts                     ← 薄殼 wrap detectGaps
      mermaid-playwright.ts
      docs-user.ts                ← 薄殼 wrap validateUserDocs
tests/
  doctor/
    run-doctor.test.ts
    checks/
      node-version.test.ts
      mermaid-playwright.test.ts
      docs-user.test.ts
  cli/
    doctor.test.ts                ← CLI 整合，仿 docs.test.ts 風格
  fixtures/doctor/
    happy/
    no-specbook/
    bad-config/
    schema-error/
    has-gaps/
    mermaid-without-playwright/
```

### 邊界規則

- `run-doctor.ts` 是純函式：**不碰 `process.exit`、不碰 `console`**，只回傳 `DoctorReport`。
- 每個 check 是獨立 async function `(ctx) => Promise<DoctorFinding[]>`，可單獨測試。
- CLI 層（`src/cli/doctor.ts`）是唯一接觸 `process.exit` 與 stdout 的位置；對齊 `src/cli/validate.ts` 與 `src/cli/gaps.ts` 的習慣。
- 重用：`runValidate`、`detectGaps`、`validateUserDocs`、`loadConfig` 全部從既有模組 import，**不複製邏輯**。

## 3. 資料模型

```ts
// src/doctor/types.ts
export type Severity = 'error' | 'warn' | 'info'

export type Category =
  | 'environment'
  | 'project'
  | 'content'
  | 'optional-deps'
  | 'docs-user'

export interface DoctorFinding {
  /** 穩定的識別碼，方便 --json 消費者 grep / 比對 */
  id: string                  // e.g. 'node-version', 'specbook-missing', 'validate.overview'
  severity: Severity
  category: Category
  title: string               // 一行摘要
  detail?: string             // 多行細節（人類可讀；JSON 也保留）
  hint?: string               // 建議下一步
}

export interface DoctorReport {
  ok: boolean                 // = findings.every(f => f.severity !== 'error')
  findings: DoctorFinding[]
  meta: {
    nodeVersion: string       // process.version
    cwd: string
    specbookRoot: string      // 解析後的絕對路徑
    durationMs: number
  }
}

export interface RunDoctorInput {
  root?: string               // 預設 process.cwd()/.specbook
}
```

### 設計重點

- `id` 採點分層命名（`validate.overview`、`gaps.user-stories`），方便 AI / CI 寫規則。
- 沒有「success finding」；report 沒有 error 就是 `ok: true`。
- `info` 級僅用於正向確認資訊；預設 TTY 隱藏，`--verbose` 顯示。
- `category` 純粹用於人類可讀輸出分組，不影響退出碼。
- `meta.durationMs` 在 `--json` 模式可供 CI 監控退化。

## 4. 檢查清單與規則

執行順序：環境 → 專案 → 內容 → 可選依賴 → docs.user。

| # | id | severity 規則 | 行為 |
|---|---|---|---|
| 1 | `node-version` | `<20` → error（**跳過 2–7**）；`>=20` → info | 對照 `package.json` 的 `engines.node` |
| 2 | `specbook-missing` | 缺 `.specbook/` → error（**跳過 3–7**） | `existsSync(root)`；hint 建議跑 `specbook init` |
| 3 | `config-loadable` | `loadConfig` 拋例外 → error（**跳過 4–7**） | 例外訊息原樣放入 `detail` |
| 4 | `validate.<area>` | 任何 area 失敗 → error（per area 一筆） | 重用 `runValidate(root)`；從 `errors: string[]` 開頭的 `[area]` parse 出 `id` |
| 5 | `gaps.<section>` | 有 gap → warn（per section 一筆） | 重用 `detectGaps(root)` |
| 6 | `mermaid-playwright` | 內容含 mermaid + `playwright` 未安裝 → warn | 掃 `.specbook/content/*.md` 是否有 ` ```mermaid `；以 `await import('playwright')` 試載入 |
| 7 | `docs-user.*` | `docs.user.enabled === true` 才執行；失敗 → error | 重用 `validateUserDocs(<projectRoot>/docs/user/, userCfg)` |

### Skip 規則

下列任一前置條件失敗時，後續檢查不執行真實工作，改各自輸出一筆 `info` finding：

- `node-version` 失敗 → 跳過 2–7（後續全部不可信）
- `specbook-missing` 失敗 → 跳過 3–7
- `config-loadable` 失敗 → 跳過 4–7

對應 skip findings：

- `id: 'skipped.specbook-root'`（僅 #1 失敗時）
- `id: 'skipped.config'`（#1 或 #2 失敗時）
- `id: 'skipped.validate'`
- `id: 'skipped.gaps'`
- `id: 'skipped.mermaid-playwright'`
- `id: 'skipped.docs-user'`

效果：使用者第一眼看到根因，不會被一連串連帶錯誤淹沒。

### `--verbose`

- off（預設）：環境段的通過項目（`✓ Node v20`）隱藏。
- on：所有 info 顯示。
- 不影響 `--json` 輸出。

## 5. CLI 介面與退出碼

```bash
specbook doctor [options]

  -r, --root <dir>   Path to .specbook directory (default: ".specbook")
  --json             Emit JSON to stdout
  --verbose          Show passing checks (info-level findings)
  -h, --help
```

刻意**不加** `--strict` 與 `--fix`（YAGNI；後續再議）。

### 退出碼

| 條件 | exit code |
|---|---|
| 任一 finding severity = `error` | `1` |
| 全通過或僅有 `warn` / `info` | `0` |
| doctor 本身拋例外（不在預期內） | `2` |

### TTY 輸出範例（預設）

```
SpecBook doctor — .specbook (Node v20.11.0)

Environment
  ✓ Node version 20.11.0

Project
  ✓ .specbook/ found
  ✓ specbook.config.ts loaded

Content
  ✗ [validate.overview] frontmatter.title is required
      → Open .specbook/content/overview.md and add `title:` in frontmatter.
  ⚠ [gaps.user-stories] All user stories are placeholders
      → Run `specbook gaps` or `/specbook enhance` to fill in.

Optional dependencies
  ⚠ [mermaid-playwright] Mermaid blocks detected but `playwright` is not installed
      → Run `pnpm add -D playwright` to enable Mermaid rendering at build time.

docs.user
  ✓ docs.user OK

Summary: 1 error, 2 warnings.
```

符號：通過 `✓`、warn `⚠`、error `✗`。**不引入顏色 / chalk**，與既有 CLI 一致。

### `--json` 輸出範例

```json
{
  "ok": false,
  "findings": [
    {
      "id": "validate.overview",
      "severity": "error",
      "category": "content",
      "title": "frontmatter.title is required",
      "detail": "[overview] ZodError: ...",
      "hint": "Open .specbook/content/overview.md and add `title:` in frontmatter."
    }
  ],
  "meta": {
    "nodeVersion": "v20.11.0",
    "cwd": "/Users/.../my-project",
    "specbookRoot": "/Users/.../my-project/.specbook",
    "durationMs": 142
  }
}
```

`--json` 一律包含所有 findings（含 info），消費端自己決定顯示與否。

## 6. 測試策略

對齊既有測試慣例（vitest + fixture 目錄）。

### 6.1 單元測試（`tests/doctor/checks/*.test.ts`）

每個 check 一支檔，獨立輸入 → 獨立輸出：

- `node-version.test.ts`：`v18.20.0` → error；`v20.11.0` / `v22.5.0` → info。
- `mermaid-playwright.test.ts`：
  - 內容含 mermaid + stub「未安裝」→ warn。
  - 內容無 mermaid → zero findings。
  - 內容含 mermaid + stub「已安裝」→ zero findings。
  - 作法：以 dependency injection 注入 `tryImportPlaywright()`，避免動到 node_modules。
- `docs-user.test.ts`：
  - config 未啟用 → zero findings。
  - 啟用但 doc-key 不對齊 → error findings。
  - 啟用且通過 → zero findings（不留 info，避免雜訊）。

`validate.ts` / `gaps.ts` check 不另外寫單元測試——薄殼，覆蓋率由整合測試完成。

### 6.2 整合測試（`tests/doctor/run-doctor.test.ts`）

每種情境一個 fixture 資料夾：

| Fixture | 預期 |
|---|---|
| `happy/` | `ok: true`，findings 皆為 info（或 0），exit code 0 |
| `no-specbook/` | 一筆 `specbook-missing` error + 多筆 skipped info |
| `bad-config/` | 一筆 `config-loadable` error + skipped info |
| `schema-error/` | 一筆 `validate.overview` error |
| `has-gaps/` | 一筆 `gaps.user-stories` warn，`ok: true` |
| `mermaid-without-playwright/` | 一筆 `mermaid-playwright` warn |

驗證 `DoctorReport` 的 `findings` id / severity / category 與 `meta.specbookRoot`。

### 6.3 CLI 整合測試（`tests/cli/doctor.test.ts`）

仿 `tests/cli/docs.test.ts`：對 `dist/cli/index.js doctor -r <fixture>` 跑子程序，驗證：

- exit code（0 / 1）正確。
- 預設 stdout 含 `Summary:` 與 `✓ / ⚠ / ✗` 符號。
- `--json` stdout 是合法 JSON，含 `ok` / `findings` / `meta` 三個 top-level keys。
- `--verbose` 會多出環境段的通過行。

### 6.4 涵蓋率目標

- `src/doctor/run-doctor.ts` ≥ 90%（核心聚合邏輯）。
- 每個 check 模組 ≥ 80%。
- 與專案整體 80% 目標一致。

## 7. 文件同步（不在 doctor 程式碼測試範圍，但實作計畫納入）

- `README.md` Commands 區塊新增一行。
- `docs/RELEASE-READINESS.md` 把 doctor 列入「驗證範圍」。
- `docs/user/{en,zh-TW}/index.md` 的 `diagnostics-recovery` 區塊改寫為「先跑 `specbook doctor`」。

## 8. 風險與決策摘要

| 決策 | 替代方案 | 為何選此 |
|---|---|---|
| 重用 `runValidate` / `detectGaps` / `validateUserDocs` | 自己重跑 loader、自己掃 placeholder | 避免邏輯漂移；對齊既有測試 |
| 不加顏色 | chalk / picocolors | 既有 CLI 全部素文字；不增加 dep |
| 不加 `--fix` | 自動修補 placeholder / config | 修復語義太重；v1 範圍外 |
| 不加 `--strict` | warn → error 升級 | 真實需求未明；未來再說 |
| `info` 預設隱藏 | 永遠顯示 | 避免雜訊；`--verbose` 控制 |
| 退出碼 `2` 保留給內部例外 | 全部用 `1` | 與 `gaps` CLI 既有約定一致 |
