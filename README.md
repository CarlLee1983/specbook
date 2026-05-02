# SpecBook

> 把專案 spec 變成有節奏感的單頁站。

SpecBook 是一個專為「軟體專案規格書」設計的靜態站產生器。它把任何專案的 spec 收斂成 5 個有故事感的章節（Overview, Tech Stack, Architecture, User Stories, Roadmap），產出可直接部署的單頁站。

## 為什麼不是 README？

README 資訊密度低、缺乏節奏。Notion / Docusaurus 又托管在外或設定昂貴。SpecBook：
- **結構化**：5 章固定 schema，由 zod 驗證
- **視覺差異化**：每章對應專屬元件（Tech Stack 是卡片陣列、Roadmap 是時間軸）
- **零部署設定**：產出純靜態 `dist/`，丟到任何 host 都能跑

## 安裝 / 使用

```bash
# 在你的專案目錄
mkdir -p .specbook/content
# 寫 5 個內容檔（見下文）

npx specbook validate   # 檢查 schema
npx specbook dev        # 本地預覽（HMR）
npx specbook build      # 輸出 .specbook/dist
```

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
| `npx specbook dev` | Vite dev server + HMR（編輯 yaml/md 自動 reload） |
| `npx specbook build` | 輸出 `.specbook/dist/` |
| `npx specbook build --base /repo/` | 子路徑部署用（GitHub Pages） |
| `npx specbook validate` | 只跑 zod 驗證，給 CI 用 |

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
