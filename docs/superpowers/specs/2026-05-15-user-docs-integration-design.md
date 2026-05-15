# User Docs Integration — Design

> 日期：2026-05-15
> 狀態：待實作（spec → plan → 三階段 PR）
> 上游 skill：`~/.claude/skills/writing-user-docs/`（v1）

## 1. 目的

把 `writing-user-docs` skill 的「md+html 雙格式 + doc-key 對齊 + 多 locale parity + 10 類別 coverage」契約納入 SpecBook，讓本 repo 同時：

1. 作為**使用者**：為 SpecBook 本身產出 `docs/user/`。
2. 作為**工具**：提供 `specbook docs <action>` 子命令，讓任何 SpecBook 安裝者都能以同樣契約管理 user docs，不需安裝 skill。

Spec docs（5 章 schema）與 user docs（手寫 prose）**並存但獨立**：受眾不同（技術讀者 vs 產品使用者）、撰寫流程不同（schema-driven render vs 手寫 prose）、輸出路徑不同（`dist/` vs `dist/user/`）。

## 2. 設計決策軌跡

| # | 決策 | 摘要 |
|---|------|------|
| 1 | spec vs user docs 關係 | 並存但獨立；不共用 schema、不共用渲染管線、不互相依賴 |
| 2 | 內容模式 | 手寫 md+html，SpecBook 只管 contract（不做 schema-driven prose 渲染） |
| 3 | CLI 形式 | 新增子命令分群 `specbook docs <action>`；既有 `specbook validate/dev/build` 行為不變 |
| 4 | 交付節奏 | 三階段：A（skill scaffold SpecBook 自己） → B（specbook docs CLI） → A′（dogfood 收回） |
| 5 | Locales | zh-TW + en |
| 6 | B 階段實作策略 | Re-implement in TypeScript：內化 skill 契約到 `src/docs/`，無 bun / 外部 skill 依賴 |

## 3. 架構

### 模組邊界

新增 `src/docs/`（與 `src/export/`、`src/scaffold/` 平行）：

```
src/docs/
├── scaffold.ts        # 產生 docs/user/<locale>/{index.md, index.html}
├── templates/         # 模板來源
│   ├── index.md.tmpl
│   ├── index.html.tmpl
│   └── themes/
│       └── anthropic-warm.css
├── doc-keys.ts        # 解析 + 對齊驗證
├── validator.ts       # 對外 API：validateUserDocs(rootDir, config) → Result
├── coverage.ts        # 10 類別 metadata + doc-key 對應表
└── build.ts           # 複製/最佳化到 dist/user/
```

新增 schema：`src/schema/docs.ts`，描述 `docs.user`。

CLI 入口：`src/cli/docs.ts`，於 `src/cli/index.ts` 註冊 `docs` 子命令樹。

既有 `src/cli/{init,validate,dev,build,export,gaps}.ts` **不改**；只在 config `docs.user.enabled === true` 時，新的 `specbook docs <action>` 才負責 user docs。

### 系統圖

```
.specbook/specbook.config.ts (docs.user)  ─┐
                                            │
docs/user/<locale>/{index.md,index.html} ──┼──→ validator.ts  → exit 0/1
                                            │
                                            ├──→ build.ts     → dist/user/
                                            │
                                            └──→ scaffold.ts  ← CLI flags
```

## 4. CLI 介面

```
specbook docs init
  --locales en,zh-TW
  --theme anthropic-warm
  --coverage all | "1,3,4,6,8,9,10" | "install-setup,discovery-read,..."
  --force

specbook docs validate
specbook docs dev     [--port 4123]
specbook docs build   [--skip-validate]
```

`--coverage` 旗標接受三種形式：`all`、編號清單（`"1,3,5"`，對應 `coverage-checklist.md` 表格的 #）、或 kebab-case doc-key 清單。前兩種會在內部 normalize 為 kebab-case，再寫進 config（§5 schema 只接受 `'all'` 或 kebab-case `string[]`）。

`specbook docs build` 預設先跑 validate，失敗 exit 1。

`dist/user/index.html`：locale 選擇/重定向頁，依 `navigator.language` 路由到對應 locale；fallback 為 config 第一個 locale。

## 5. Config Schema

`.specbook/specbook.config.ts`：

```ts
export default defineConfig({
  // ...既有
  docs: {
    user: {
      enabled: true,
      locales: ['zh-TW', 'en'],
      theme: 'anthropic-warm',
      coverage: 'all',  // 或 ['install-setup', 'discovery-read', ...]
    },
  },
})
```

V1 `theme` 僅接受 `anthropic-warm`；`cool-tech` 與 `minimal` 是 V2 預定 placeholder，validate 時明確拒絕。

`coverage` 接受：
- `'all'` — 10 個 doc-key 全選
- `string[]` — kebab-case doc-key 子集，必須屬於 10 類別

`enabled: false`（預設）時，新 CLI 動作會以友善訊息提示開啟設定後再用。

## 6. 檔案佈局

**作者端**：

```
docs/user/
├── en/
│   ├── index.md
│   └── index.html
└── zh-TW/
    ├── index.md
    └── index.html
```

**Build 輸出**：

```
dist/user/
├── index.html          # locale 選擇/重定向
├── zh-TW/
│   ├── index.html
│   └── theme.css
└── en/
    ├── index.html
    └── theme.css
```

## 7. 驗證規則

| # | 規則 | 失敗 error token |
|---|------|------------------|
| 1 | doc-key 格式 `[a-z0-9-]+` | `docs.user.invalidDocKey` |
| 2 | 每檔 doc-key 唯一 | `docs.user.duplicateDocKey` |
| 3 | 各 locale 必含 `requiredDocKeys` | `docs.user.missingDocKey` |
| 4 | 同 locale 內 md/html 順序一致 | `docs.user.orderMismatch` |
| 5 | 所有 locale 共享同一 doc-key 集 | `docs.user.localeDriftDocKey` |
| 6 | locale 目錄含 `index.md` + `index.html` | `docs.user.missingFile` |

`requiredDocKeys` 從 `config.docs.user.coverage` 推導（與 skill 不同，skill 寫死在 `scripts/check-user-docs.ts`）。

錯誤訊息走 `src/i18n/`，新增 `docs.user.*` namespace；輸出格式含位置編號與修正提示。

對外 API：`import { validateUserDocs } from 'specbook/docs'` → `{ ok: boolean; errors: ValidationError[] }`。

## 8. 測試策略

```
tests/docs/
├── doc-keys.test.ts
├── validator.test.ts
├── scaffold.test.ts
├── coverage.test.ts
└── build.test.ts

tests/schema/docs.test.ts

tests/fixtures/user-docs/
├── happy/
├── order-mismatch/
├── locale-drift/
├── duplicate/
├── missing-key/
└── missing-file/
```

TDD 順序：doc-keys → validator → scaffold → build → CLI 整合。

新增 `tests/cli/docs.test.ts`（spawn 子進程驗 exit code 與 stdout）。

覆蓋率目標 80%+，重點在 `validator.ts` 與 `doc-keys.ts`。

E2E（dev server preview）暫不在 V1。

## 9. 交付節奏

每階段獨立 PR，可分別 merge。

### 階段 A — skill 一次性 scaffold

**動作**：在 SpecBook repo 跑 skill scaffold：

```bash
bun run ~/.claude/skills/writing-user-docs/scaffold/scaffold.ts \
  --project "SpecBook" \
  --tagline "把專案 spec 變成有節奏感的單頁站" \
  --github "<github-url-待確認>" \
  --outdir docs/user/ \
  --locales en,zh-TW \
  --theme anthropic-warm \
  --coverage "1,3,4,5,6,8,9,10"
```

**Skip 的 coverage 類別**：
- 2 `connections` — SpecBook 無外部後端
- 7 `engine-support` — 純 Node.js，無多 engine 差異

**產出**：`docs/user/{en,zh-TW}/{index.md,index.html}` + `scripts/check-user-docs.ts` + `package.json` 加 `docs:check`。

**Prose**：8 類別各填繁中 + 英文；`pnpm docs:check` 通過。

**PR 邊界**：純 docs + 一個 npm script，不動 `src/`。

**Merge 條件**：`pnpm test && pnpm docs:check` 皆綠。

### 階段 B — specbook docs CLI

**動作**：依本 spec §3–§8 實作 `src/docs/`、`src/cli/docs.ts`、`src/schema/docs.ts`、`tests/docs/`、`tests/cli/docs.test.ts`。

**TDD 順序**：doc-keys → validator → scaffold → build → CLI 整合。

**驗證**：所有新測試綠燈、`pnpm test` 通過。

**PR 邊界**：純 `src/` + `tests/` 擴充，不動 `docs/user/`。

### 階段 A′ — dogfood

**動作**：
1. 在 `.specbook/specbook.config.ts` 加 `docs.user` 區塊
2. 刪除階段 A 留下的 `scripts/check-user-docs.ts` 與 `docs:check` script
3. 用 `specbook docs validate` 取代

**驗證**：新舊驗證結果一致（可在實作期間以 diff 對照）。

**PR 邊界**：config + script 替換。

### 摘要

| 階段 | 主要產出 | 改動範圍 |
|------|---------|---------|
| A | SpecBook 自己的 user docs | docs/ + 一個 script |
| B | specbook docs CLI + schema | src/ + tests/ |
| A′ | 取代 skill 一次性 script | config + script |

## 10. 範圍外（Out of scope, V1）

- `cool-tech` / `minimal` 主題（V2 placeholder）
- dev server preview 的 E2E 測試
- Schema-driven user-doc prose 渲染
- `specbook build --all`（同時 build spec + user docs）
- 把 user docs 加入既有 `specbook validate`、`specbook build`
- 自動翻譯 / locale 同步工具

## 11. 風險與權衡

| 風險 | 緩解 |
|------|------|
| Skill V2 更新時 SpecBook 模板可能脫節 | 在 `src/docs/templates/` 留 header 註明對應 skill 版本；定期同步 |
| `requiredDocKeys` 推導邏輯與 skill 寫死方式不同，使用者切換 A→A′ 時行為可能微差 | A′ 階段以 fixture 對照新舊驗證輸出 |
| 10 類別中部分對 SpecBook 不適用，但對下游使用者適用 | `coverage` 支援子集；scaffold 與 validate 都尊重 config |

## 12. 開放問題

- GitHub URL（A 階段 scaffold 的 `--github` 參數）待確認。
- `dist/user/index.html` locale 選擇頁的偵測策略細節（純 client-side JS vs server-side hint）—B 階段實作時再決定，預設 client-side。
