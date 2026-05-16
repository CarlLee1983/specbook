# SpecBook

> 把專案 spec 變成有節奏感的單頁站。

SpecBook 是一個專為「軟體專案規格書」設計的靜態站產生器。它把任何專案的 spec 收斂成 5 個有故事感的章節（Overview, Tech Stack, Architecture, User Stories, Roadmap），產出可直接部署的單頁站。

## 為什麼不是 README？

README 資訊密度低、缺乏節奏。Notion / Docusaurus 又托管在外或設定昂貴。SpecBook：
- **結構化**：5 章固定 schema，由 zod 驗證
- **視覺差異化**：每章對應專屬元件（Tech Stack 是卡片陣列、Roadmap 是時間軸）
- **零部署設定**：產出純靜態 `dist/`，丟到任何 host 都能跑

## Quick start

```bash
# 1. 安裝
pnpm add -D specbook

# 2. 在專案根 scaffold（自動偵測 package.json + 依賴）
npx specbook init

# 3. 驗證內容
npx specbook validate

# 4. 預覽
npx specbook dev

# 5. 產出靜態站
npx specbook build
```

`init` 會產生 `.specbook/specbook.config.ts`，並使用：

```ts
import { defineConfig } from 'specbook'
```

這個設定檔可在已安裝的 npm package 環境中直接被 `validate` / `dev` / `build` / `export` 載入，不需要引用專案內部 `src/` 路徑。

> **Mermaid 圖（選用）**：若 `architecture.md` 含 ` ```mermaid` 區塊，請另外安裝 `playwright` peer dep — `pnpm add -D playwright`。沒有 mermaid 區塊時不需要。

## User documentation（選用）

如果你想要把使用者文件也託管在 SpecBook 內：

```bash
npx specbook docs init --locales zh-TW,en --tagline "..."
npx specbook docs validate
npx specbook docs dev
npx specbook docs build
```

`docs validate` / `docs build` 會讀取專案根目錄的 `.specbook/specbook.config.ts`。
若你是第一次啟用 user docs，請在 config 內加入：

```ts
import { defineConfig } from 'specbook'

export default defineConfig({
  project: { name: 'Your Project' },
  docs: {
    user: {
      enabled: true,
      locales: ['zh-TW', 'en'],
      theme: 'anthropic-warm',
      coverage: 'all',
    },
  },
})
```

詳見 `docs/superpowers/specs/2026-05-15-user-docs-integration-design.md`。

## Claude Code Skill（建議搭配）

把這個 skill 安裝到 `~/.claude/skills/specbook/`：

```bash
mkdir -p ~/.claude/skills
cp -R node_modules/specbook/skill/specbook ~/.claude/skills/specbook
```

然後就能在任何 Claude Code 對話裡使用：

- `/specbook init` — 一次性 scaffold + LLM 草稿（會自動跑 `npx specbook init`）
- `/specbook enhance` — 互動式 Q&A 補完 user-stories / roadmap

## 內容結構

```
your-project/
└── .specbook/
    ├── specbook.config.ts
    ├── content/
    │   ├── overview.md       # tagline 在 frontmatter，第一個 H1 = 專案名
    │   ├── tech-stack.yaml   # layer/items[] 結構
    │   ├── architecture.md   # diagram: mermaid|image|none
    │   ├── user-stories.yaml # As / Want / SoThat / priority
    │   └── roadmap.yaml      # title / quarter / status / items
    └── assets/
```

完整 schema 與範例見 [`docs/superpowers/specs/2026-05-02-specbook-design.md`](./docs/superpowers/specs/2026-05-02-specbook-design.md)。

## CLI

| 指令 | 用途 |
|---|---|
| `npx specbook init` | scaffold `.specbook/`（冪等；`--force` 覆寫；`--only=overview,...` 限制範圍） |
| `npx specbook enhance` | 偵測殘留 placeholder 與未完成欄位（`--json` 給 skill 用） |
| `npx specbook doctor` | 聚合健康檢查：environment / schemas / gaps / optional deps / docs.user（`--json` 機讀；`--verbose` 顯示通過項） |
| `npx specbook validate` | 驗證內容符合 schema |
| `npx specbook dev` | 本機 dev server（HMR） |
| `npx specbook build` | 產 `.specbook/dist`（`--base /repo/` 用於 GitHub Pages 子路徑） |
| `npx specbook export` | 輸出客戶交付用系統規格書（Markdown / HTML） |

> `specbook gaps` 仍可用但已 deprecated；輸出與 `enhance --json` 經過 `placeholder.*` section-level 過濾後一致。phase 3 將整支移除。

## 客製化

```ts
// .specbook/specbook.config.ts
import { defineConfig } from 'specbook'

export default defineConfig({
  project: { name: 'TaskFlow', description: '...', url: '...' },
  theme: { accent: '#4f46e5', locale: 'zh-TW' },
  document: { version: 'v1.0', audience: 'Client', confidentiality: 'confidential' },
  sections: { hide: [] },
})
```

## 部署

純靜態 `dist/` 適配任何 host：GitHub Pages、Vercel、Netlify、Cloudflare Pages、自家 nginx / S3。

## 文件輸出（提交客戶）

如果你要把 SpecBook 內容整理成可提交客戶的系統規格書，使用：

```bash
npx specbook export --root .specbook --out .specbook/dist/client-spec --formats md,html
```

這會輸出：

- `system-spec.md`：適合審閱、版本控管與內部簽核
- `system-spec.html`：可列印、可直接分享的正式文件

`build` 仍然只負責網站版 SpecBook；`export` 則負責文件交付版本。

`system-spec.html` 會使用 `theme.locale` 輸出 `<html lang="...">`，因此同一份內容可以依設定產生 `zh-TW` 或 `en` 語系標記。

## 品質與發佈檢查

目前專案以 Vitest 驗證核心路徑：

- schema 驗證：config / overview / tech-stack / architecture / user-stories / roadmap
- CLI 行為：`init` / `validate` / `enhance` / `dev` / `build` / `export`
- SSG 與元件：章節渲染、響應式樣式、Mermaid render、scrollspy
- npm package smoke test：`npm pack` 後安裝到乾淨 app，驗證 installed CLI 可執行 `validate` / `build` / `export`
- scaffold-generated config smoke test：installed CLI 產生的 `.specbook/specbook.config.ts` 可正常 `import { defineConfig } from 'specbook'`

建議發佈前執行：

```bash
pnpm lint
pnpm build
pnpm test
pnpm docs:check
pnpm test:packaging
pnpm pack:check
```

更多發佈狀態與已知邊界見 [`docs/RELEASE-READINESS.md`](./docs/RELEASE-READINESS.md)。

## 進階

需要自訂元件 / 主題？v1 不開（保持骨架極簡），v2 將提供 `npx specbook eject`。

## License

MIT
