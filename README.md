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

# 3. 預覽
npx specbook dev

# 4. 產出靜態站
npx specbook build
```

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
| `npx specbook gaps` | 偵測 placeholder / 殘留模板（`--json` 給 skill 用） |
| `npx specbook validate` | 驗證內容符合 schema |
| `npx specbook dev` | 本機 dev server（HMR） |
| `npx specbook build` | 產 `.specbook/dist`（`--base /repo/` 用於 GitHub Pages 子路徑） |

## 客製化

```ts
// .specbook/specbook.config.ts
import { defineConfig } from 'specbook'

export default defineConfig({
  project: { name: 'TaskFlow', description: '...', url: '...' },
  theme: { accent: '#4f46e5', locale: 'zh-TW' },
  sections: { hide: [] },
})
```

## 部署

純靜態 `dist/` 適配任何 host：GitHub Pages、Vercel、Netlify、Cloudflare Pages、自家 nginx / S3。

## 進階

需要自訂元件 / 主題？v1 不開（保持骨架極簡），v2 將提供 `npx specbook eject`。

## License

MIT
