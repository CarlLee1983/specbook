# SpecBook — Design Specification

| | |
|---|---|
| **建立日期** | 2026-05-02 |
| **狀態** | Draft（待 review）|
| **作者** | Carl + Claude |
| **下一步** | 經 review 通過後 → `writing-plans` 產實作計畫 |

---

## 1. 問題與願景

### 1.1 問題

軟體專案常常需要把 spec 文件分享出去（給同事、合作夥伴、面試官、社群）。今天最常見的做法是：

- 推一份 README 或 md 檔案 → **資訊密度低、缺乏節奏**
- 用 Notion / GitBook → **托管在外部、版本與專案脫鉤**
- 自架文件站（Docusaurus 等）→ **要學一整套工具、設定昂貴**

開發者其實只想要：把專案的核心 spec（這是什麼、用什麼做、怎麼運作、給誰用、要做到哪）以**一個有節奏的單頁站**呈現出來。

### 1.2 願景

**SpecBook** 是一個專為「軟體專案規格書」設計的靜態站產生器。它不是萬用文件工具——而是把任何專案的 spec 收斂成 **5 個有故事感的章節**，產出可直接部署的單頁站。

差異化來自：**結構化資料 → 專屬視覺元件**（Tech Stack 不是清單而是卡片陣列、Roadmap 不是表格而是時間軸、User Stories 不是條目而是故事卡）。這是「閱讀性更佳」具體兌現的地方。

### 1.3 成功標準

1. 任何具備 `package.json`（或同等專案描述檔）的專案，**3 分鐘內** 能跑出第一份可看的 SpecBook 站。
2. 產出的 `dist/` 可直接丟到 GitHub Pages / Vercel / Netlify 部署，**零額外設定**。
3. 章節視覺顯著區別於「md 渲染器」——使用者看完 mockup 同意「這比 README 好讀很多」。

---

## 2. 範圍

### 2.1 In Scope（v1）

- 5 個固定章節：Overview, Tech Stack, Architecture, User Stories, Roadmap
- 兩個發佈品：`specbook` npm 套件 + `specbook` Claude Code skill
- Hybrid 內容格式：`.md`（散文章節）+ `.yaml`（結構化章節）
- Skill 兩個指令：`/specbook init`（一次性 scaffold + 自動萃取 + LLM 草稿）、`/specbook enhance`（互動補完）
- CLI 三指令：`dev`、`build`、`validate`
- 簡單客製化：`specbook.config.ts`（站點 metadata、accent 色、章節順序/隱藏、locale）
- 介面 i18n：UI 字串 zh-TW / en
- 部署支援：純靜態 `dist/`，含 OG meta、favicon、`--base` 子路徑

### 2.2 Out of Scope（明確不做）

- ❌ 萬用文件站（不取代 Mintlify / GitBook / Docusaurus）
- ❌ 雲端託管 / CMS（產出純靜態，使用者自行部署）
- ❌ 即時協作 / 多版本（靠 git 管版本）
- ❌ 內容多語系（章節內容只有一語；UI 才有 i18n）
- ❌ 自訂章節類型（v1 鎖定 5 章）
- ❌ 自訂元件覆寫（要改 → 用 `eject` 攤開骨架，留 v2）
- ❌ 主題市集 / 多主題切換
- ❌ 線上分享連結 / 雲端短網址

---

## 3. 架構

### 3.1 兩個發佈品

```
┌──────────────────────────────┐         ┌─────────────────────────────┐
│  Claude Code Skill           │         │  npm Package                │
│  名稱：specbook              │         │  名稱：specbook             │
│                              │  寫入   │                             │
│  /specbook init              │ ──────► │  npx specbook dev           │
│  /specbook enhance           │  讀取   │  npx specbook build         │
│                              │ ◄────── │  npx specbook validate      │
│                              │         │                             │
│  職責：解析專案、互動式產    │         │  職責：把 .specbook/content │
│       .specbook/content/*    │         │       渲染成靜態站          │
└──────────────────────────────┘         └─────────────────────────────┘
```

### 3.2 使用者專案內的檔案配置

```
使用者專案/
├── .specbook/
│   ├── specbook.config.ts        ← 設定（站點 metadata、theme、章節）
│   ├── content/                  ← skill 寫入、CLI 讀取
│   │   ├── overview.md
│   │   ├── tech-stack.yaml
│   │   ├── architecture.md
│   │   ├── user-stories.yaml
│   │   └── roadmap.yaml
│   ├── assets/                   ← logo、screenshots、favicon
│   └── dist/                     ← build 輸出（gitignored）
├── src/                          ← 使用者自己的程式碼
└── package.json
```

`.specbook/dist/` 與 `.superpowers/`（如有）建議加入 `.gitignore`。

### 3.3 完整使用流程

```
1. 在使用者專案目錄
2. /specbook init        → skill 掃 package.json/檔案樹/README，產 .specbook/content/ 草稿
3. /specbook enhance     → skill 互動式補完 user-stories、roadmap
4. npx specbook dev      → 本地預覽（HMR）
5. npx specbook build    → 產 .specbook/dist/
6. 部署 dist/            → GitHub Pages / Vercel / Netlify / 任何靜態主機
```

---

## 4. 內容 Schema

每一章對應一個檔案，schema 由 `specbook` 套件以 zod 驗證；驗證失敗時 `dev` / `build` 直接報錯不渲染。

### 4.1 `overview.md`

```markdown
---
tagline: 同步至雲端的極簡待辦工具
---

# TaskFlow

多數待辦工具都在加功能；專業使用者真正缺的是
「快速進入、即時同步、出門也能離線」的體驗。
TaskFlow 把所有非核心功能拿掉，只保留三件事：擷取、分類、完成。
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `tagline`（frontmatter） | 是 | 一句話描述，顯示在大標下 |
| `# 標題` | 是 | 第一個 H1 = 專案名（也可由 `specbook.config.ts` 蓋過） |
| 內文 | 是 | 散文（建議 1–3 段），渲染為 problem statement |

### 4.2 `tech-stack.yaml`

```yaml
- layer: Frontend
  items:
    - name: React
      version: "19.0"
      role: UI 元件框架；採 RSC 做首屏渲染
      icon: R                  # 可選：單字母或 URL
    - name: Tailwind CSS
      version: "4.0"
      role: 原子化樣式系統
- layer: Backend & Data
  items:
    - name: Supabase
      version: "2.x"
      role: Postgres + Realtime，雲端持久化
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `layer` | 是 | 分組標籤（如 Frontend / Backend / Infra） |
| `items[].name` | 是 | 技術名稱 |
| `items[].version` | 否 | 版本字串 |
| `items[].role` | 是 | 一句話說明在專案裡的角色 |
| `items[].icon` | 否 | 單字母（自動色塊）或圖片 URL |

### 4.3 `architecture.md`

```markdown
---
diagram: mermaid     # 'mermaid' | 'image' | 'none'
image: ./assets/architecture.png   # 當 diagram: image 時必填
---

三層：UI（React）→ 本機儲存（Dexie）→ 雲端同步（Hono on Edge）。

​```mermaid
graph TD
  U[使用者] --> R[React UI]
  R <--> D[Dexie/IndexedDB]
  D --> H[Hono API]
  H --> P[Supabase Postgres]
​```

客戶端走 **local-first** — 所有寫入先進 IndexedDB，UI 立即更新；
背景再透過 sync queue 推到 Edge API。
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `diagram`（frontmatter） | 是 | `mermaid`／`image`／`none` |
| `image`（frontmatter） | 條件 | 當 `diagram: image` 必填；路徑相對於 `.specbook/`（例：`./assets/x.png`） |
| 內文 | 是 | 散文（mermaid 區塊在 build 時被渲染為 SVG） |

> **路徑慣例**：本 spec 中所有 `./assets/...` 路徑（含 `architecture.image`、`project.favicon`、`project.ogImage`）都相對於 `.specbook/` 根目錄解析。

### 4.4 `user-stories.yaml`

```yaml
- as: 忙碌的開發者
  want: 按下 ⌘+N 立刻新增一筆待辦
  soThat: 打斷思緒的時間 < 1 秒
  priority: p0       # p0 | p1 | p2
- as: 通勤中的使用者
  want: 在沒網路時也能新增、編輯、勾選待辦
  soThat: 回到網路時自動同步、不丟資料
  priority: p0
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `as` | 是 | 角色 |
| `want` | 是 | 想做什麼 |
| `soThat` | 是 | 達成什麼成果 |
| `priority` | 否 | `p0`／`p1`／`p2`，預設 `p1` |

### 4.5 `roadmap.yaml`

```yaml
- title: M1 — Local MVP
  quarter: 2026 Q1
  status: done       # done | active | future
  items:
    - 本機新增 / 編輯 / 完成
    - IndexedDB 持久化
- title: M2 — 雲端同步
  quarter: 2026 Q2
  status: active
  items:
    - Supabase 多裝置同步
    - 衝突解決
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `title` | 是 | 里程碑名稱 |
| `quarter` | 否 | 自由格式時段（`2026 Q1` / `2026-05` 都可） |
| `status` | 是 | `done`／`active`／`future` |
| `items[]` | 否 | 該里程碑下的工作項 |

---

## 5. Skill 設計

### 5.1 `/specbook init`(一次性，冪等)

```
Step 1. 偵測專案
  ├─ 解析 package.json / pnpm-lock / yarn.lock
  ├─ 嘗試 pyproject.toml / Cargo.toml / go.mod / Gemfile / composer.json
  ├─ 列出檔案樹（depth ≤ 3，過濾 node_modules / .git / dist 等）
  └─ 找 README.md / readme.md

Step 2. 建立骨架
  └─ 寫入：
     .specbook/specbook.config.ts（已預填 project.name 等）
     .specbook/content/         空白檔
     .specbook/assets/.gitkeep

Step 3. 自動填（deterministic）
  └─ tech-stack.yaml ← 從依賴清單產草稿
       name + version 自動，role 用 LLM 補一句話

Step 4. LLM 草稿
  ├─ overview.md     ← 從 README 摘要 + 重組成 SpecBook 風格
  └─ architecture.md ← 從檔案樹 + entrypoint + 框架偵測產草稿
                       （含一份 mermaid 草稿）

Step 5. 留範本
  ├─ user-stories.yaml ← 2-3 筆 placeholder + 註解教學
  └─ roadmap.yaml      ← 同上

Step 6. Summary 給使用者
  ✅ tech-stack（自動）
  📝 overview / architecture（草稿，建議審）
  ⚠️  user-stories / roadmap（請跑 /specbook enhance）
  下一步：npx specbook dev 預覽
```

**冪等性規則**：

- 重跑時，只補缺、不覆蓋既有非空內容
- `--force` 旗標：全部重產（會問確認）
- `--only=overview,architecture`：只重產指定章節

### 5.2 `/specbook enhance`(互動式，可重複)

```
Step 1. 讀現有 .specbook/content/*

Step 2. 找「缺口」
  ├─ user-stories 是 placeholder？
  ├─ roadmap 是空的？
  ├─ overview 看起來像直接複製 README（簡單啟發式）？
  └─ architecture 缺結尾段落？

Step 3. 對每個缺口開對話（在 Claude Code 對話中）
  USER STORIES 例：
    Q1：「這個專案的目標使用者是誰？」
    Q2：「他們最常做的事？」
    Q3：「什麼情境最讓他們痛？」
    → 產出 3-5 筆 stories 給使用者選 / 改 / 增 / 減
  ROADMAP 例：
    Q1：「目前完成了什麼里程碑？」
    Q2：「正在做什麼？預計什麼時候完成？」
    Q3：「下一個 1-2 個里程碑？」
    → 產出 timeline 草稿

Step 4. 顯示 diff，使用者確認後寫入

Step 5. 跑 zod 驗證、回報結果
```

`enhance` 設計上是可重複呼叫的——使用者在不同階段（剛起手、寫到一半、ship 前）都可以再跑來補完當下的空缺。

---

## 6. 渲染器

### 6.1 內部技術棧

- **Build / dev server**：Vite 6（HMR 跟著 `.specbook/content/*` 變動）
- **UI 框架**：React 19
- **樣式**：Tailwind CSS 4，加自訂 design token（accent 色從 config 注入為 CSS variable）
- **SSG**：自寫小 SSG，用 `react-dom/server.renderToString` 預渲染整頁 HTML，再 hydrate 極小 client bundle（TOC scrollspy + 平滑捲動）
- **Schema 驗證**：zod
- **Mermaid**：build 時渲染為 SVG（不在 client run mermaid，省 bundle）

### 6.2 章節 → 元件對應

| 章節 | 元件 | 資料來源 |
|---|---|---|
| Overview | `<HeroSection>` | `overview.md` |
| Tech Stack | `<StackGrid>` | `tech-stack.yaml` |
| Architecture | `<ArchitectureBlock>` | `architecture.md`（含 mermaid SVG） |
| User Stories | `<StoryCardGrid>` | `user-stories.yaml` |
| Roadmap | `<Timeline>` | `roadmap.yaml` |
| 共用 | `<TocSidebar>` `<Layout>` | `specbook.config.ts.sections` |

### 6.3 CLI 指令

```bash
npx specbook dev               # 本機 dev server, HMR
npx specbook build             # 產出 .specbook/dist/
npx specbook build --base /x/  # 子路徑部署用（如 GitHub Pages 的 /<repo>/）
npx specbook validate          # 只跑 zod 驗證、不渲染（給 CI 用）
```

### 6.4 客製化 API（v1）

```ts
// .specbook/specbook.config.ts
import { defineConfig } from 'specbook'

export default defineConfig({
  project: {
    name: 'TaskFlow',
    description: '同步至雲端的極簡待辦工具',
    url: 'https://taskflow.example.com',
    favicon: './assets/favicon.png',
    ogImage: './assets/og.png',
  },
  theme: {
    accent: '#4f46e5',
    mode: 'light',                 // 'light' | 'auto'
    locale: 'zh-TW',               // 'zh-TW' | 'en'（只影響 UI 字串）
  },
  sections: {
    order: ['overview','tech-stack','architecture','user-stories','roadmap'],
    hide: [],                      // 例：['user-stories'] 隱藏該章
  },
})
```

進階客製（自訂字型、覆寫元件、加新章節類型）→ v2，需要時用 `npx specbook eject` 攤開骨架。

### 6.5 輸出

```
.specbook/dist/
├── index.html          ← 預渲染好的整頁，含 OG / favicon / canonical
├── assets/
│   ├── main.[hash].js  ← 極小 client bundle（≈10 KB gz）
│   ├── main.[hash].css ← Tailwind extracted, hashed
│   └── ...
├── og.png              ← 若 config 有指定
└── sitemap.xml         ← 自動產
```

---

## 7. 視覺設計語言

### 7.1 整體調性

「**書籍感的現代極簡**」——介於規格書（serious、結構化）與現代產品文件（clean、有節奏）之間。

- **章節編號**：襯線斜體小字（`Chapter 01 / Overview`），像書本目錄
- **大標題**：襯線體（Iowan Old Style / Palatino / Georgia fallback chain）
- **內文**：系統 sans（`-apple-system, system-ui, "PingFang TC", "Microsoft JhengHei"`）
- **強調色**：v1 預設 indigo `#4f46e5`，使用者可由 `theme.accent` 覆寫
- **背景**：`#fafaf9`（接近紙張的暖白）
- **章節間距**：`padding: 80px 0`，明顯分段

### 7.2 每章視覺角色（與 mockup 一致）

| 章節 | 視覺手法 |
|---|---|
| Overview | Hero 風：大標 + tagline + 引述線左邊框的 problem 段 |
| Tech Stack | 卡片陣列；依 `layer` 分組，分組標 uppercase letter-spacing |
| Architecture | 圖（mermaid SVG / image / 純色塊圖）+ 散文左右或上下排版 |
| User Stories | 故事卡 grid：As / Want / So that 結構，priority 角標 |
| Roadmap | 垂直時間軸：彩色節點（done 綠 / active 琥珀 / future 灰） |

### 7.3 DESIGN.md（本專案內部）

SpecBook **本專案** 會維護一份 `docs/DESIGN.md`，內容包含：

- 完整 design token（顏色、間距、字級階層、圓角、陰影）
- 每個元件的視覺規格與行為
- 狀態（hover / active / disabled）的處理規則
- 深色模式時 token 的對應關係（v1 不用，但先記下）
- mermaid 主題覆寫設定

DESIGN.md 是「給開發者寫元件時對齊的單一資料來源」。色彩細調、字級調整都進這份文件，**不在 spec 文件**。

### 7.4 響應式

- 桌面：固定 220px 右側 TOC + 主欄
- 平板：TOC 收合為頂部下拉
- 手機（< 900px）：TOC 隱藏，章節單欄堆疊；卡片陣列、故事卡 grid 都退化為單欄

---

## 8. 部署

產出 `.specbook/dist/` 是純靜態，使用者自行部署：

| 平台 | 做法 |
|---|---|
| GitHub Pages | `npx specbook build --base /<repo>/`，把 `dist/` 推到 `gh-pages` 或 Pages 設定 |
| Vercel | Build command: `npx specbook build`，Output: `.specbook/dist` |
| Netlify | 同上 |
| Cloudflare Pages | 同上 |
| 自架 nginx / S3 | 直接複製 `dist/` 到網站根目錄 |

v1 不附 `vercel.json` / `netlify.toml` 範例（保持骨架極簡）；遇問題再加。

---

## 9. 里程碑

| M | 範圍 | 交付 |
|---|---|---|
| **M1** | 渲染器骨架 | `specbook` npm 套件 + 5 元件 + Tailwind 設定 + 寫死範例 build 出靜態站 |
| **M2** | Content pipeline | 讀 `.specbook/content/*` + zod 驗證 + HMR dev 模式 + 自寫 SSG |
| **M3** | `/specbook init` skill | 解析 + LLM 草稿，能跑出可看的 spec 站 |
| **M4** | `/specbook enhance` skill | 互動補完 user-stories + roadmap |
| **M5** | 部署細節 | OG meta、sitemap、`--base`、行動版排版 |
| **M6** | 發佈 | 上 npm + Claude Code skill marketplace |

每個 M 結束都應有可 demo 的成果。M1–M2 完成時，已能用「手寫 content」的方式產出 SpecBook 站，這就是渲染器的最小可用版本；M3–M4 才把「自動化 / skill 體驗」加上去。

---

## 10. 開放問題（待 review 時討論）

1. **多框架專案（monorepo）的 tech-stack 萃取怎麼處理？**
   - 提案：v1 只看根 `package.json`；monorepo 由使用者手動補 `tech-stack.yaml`
2. **是否提供「線上一鍵分享」入口（短網址 / hosted preview）？**
   - 建議：v1 不做（會讓「靜態」變「服務」），留 v2
3. **mermaid 萬一 build 失敗（語法錯誤）的 fallback？**
   - 提案：build 時顯示 inline error block（紅色），不中斷整個 build
4. **是否要支援自訂字型（從本機檔載入）？**
   - 建議：v1 不開，留 v2 eject 後解
5. **Roadmap 的 `quarter` 欄位要不要強制格式（如 `YYYY-QN`）？**
   - 提案：v1 自由格式（字串），渲染端不解析語意，只做排序時請使用者用 `order` 欄位

---

## 11. 決策紀錄

| 日期 | 決策 | 理由 |
|---|---|---|
| 2026-05-02 | 鎖定 5 章（不做萬用文件站） | 結構化才能做出視覺差異化；萬用會落入「md 渲染器之一」 |
| 2026-05-02 | Hybrid 格式（md + yaml） | 散文用 md、結構用 yaml；schema 可驗證、寫起來不像填表 |
| 2026-05-02 | Skill 拆 `init` + `enhance` | 職責分離；`init` 冪等可重跑、`enhance` 是動筆動作 |
| 2026-05-02 | 套件內薄殼（B 模式，不放完整骨架到使用者 repo） | 視覺一致性可控；升級簡單；極端客製走 eject |
| 2026-05-02 | 單頁 + anchor URL（不做多頁） | 5 章在一頁說完一個故事；可分享章節連結 |
| 2026-05-02 | 內部用 Vite + React + 自寫 SSG | 用者明確要 React+Tailwind；自寫 SSG 約 100 行、依賴最少 |
| 2026-05-02 | v1 不做 i18n 內容 / 自訂元件 / 多主題 | 收斂 v1 範圍、加快交付 |

---

## 附錄 A — `.gitignore` 建議

```
.specbook/dist/
.superpowers/        # 若使用 superpowers brainstorm companion
node_modules/
```

## 附錄 B — 範例專案：`taskflow`

本 spec 中所有 schema 範例都以虛構的 `TaskFlow`（local-first 待辦工具）為例。完整 demo 內容會在 M1 時用作 fixture。
