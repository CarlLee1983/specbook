# SpecBook

<!-- doc-key: overview -->
把專案 spec 變成有節奏感的單頁站。

SpecBook 是一個專為「軟體專案規格書」設計的靜態站產生器。它把任何專案的 spec 收斂成五個固定章節（Overview、Tech Stack、Architecture、User Stories、Roadmap），產出可直接部署的單頁站。

寫 README 不夠正式、開 Notion 容易散、自架 Docusaurus 設定成本高。SpecBook 把這三者中間的痛點打掉：schema 由 zod 鎖死、視覺由 PaperTech 設計系統收斂、產出是純靜態 HTML，丟到任何 host 都能跑。

適合需要把專案技術決策、進度與 user stories 整理給內部團隊或外部客戶看的軟體專案團隊與技術負責人。

---

<!-- doc-key: install-setup -->
## 安裝與啟動

SpecBook 是發佈在 npm 上的 package，需要 **Node.js 20 以上**，搭配 pnpm（或 npm、yarn）。確認版本：

```bash
node --version   # v20.x 或以上
pnpm --version   # 任何近期版本皆可
```

在目標專案根目錄安裝為 dev dependency：

```bash
pnpm add -D specbook
```

執行初始化。SpecBook 會偵測 `package.json`、寫入 `.specbook/specbook.config.ts`，並產出五章 placeholder（Overview、Tech Stack、Architecture、User Stories、Roadmap）：

```bash
npx specbook init
```

`init` 是冪等的：再跑一次不會覆寫已存在的檔案；若需要重新 scaffold，加 `--force`。

啟動本機 dev server 預覽：

```bash
npx specbook dev
```

打開 `http://localhost:5173` 就能看到第一版站台；之後修改 `.specbook/content/` 任何檔案，瀏覽器會自動熱重載。

> Mermaid 圖選用：若 `architecture.md` 含 ` ```mermaid` 區塊，請另外裝 `playwright` peer dep（`pnpm add -D playwright`）。沒有圖時可省略。

<!-- doc-key: discovery-read -->
## 檢查與探索

兩個只讀命令幫你在不變更狀態的前提下盤點現況。

`specbook validate` 對 `.specbook/content/` 跑 zod schema 驗證。成功時印 `All content valid.` 並 exit 0；失敗時逐行印錯誤並 exit 1，適合直接接到 CI：

```bash
npx specbook validate
```

`specbook enhance` 偵測殘留 placeholder、缺值欄位等需要補完的項目。預設輸出人類可讀清單，加 `--json` 給 LLM / 自動化流程使用：

```bash
npx specbook enhance
npx specbook enhance --json
```

`enhance` 永遠 exit 0（待補事項屬資訊性，不算錯誤）；若 `.specbook` 目錄不存在則 exit 2。JSON 模式每筆 item 含 `prompt` 欄位，是給 AI 直接執行的英文指示。

> `specbook gaps` 仍可用但已 deprecated；新專案請改用 `specbook enhance`。

<!-- doc-key: writes-mutations -->
## 寫入與產出

三個會落地檔案的命令。

`specbook init` scaffold `.specbook/`，預設冪等，不覆寫既有檔案。需要重新洗牌時加 `--force`；只想處理特定章節時用 `--only`：

```bash
npx specbook init --force
npx specbook init --only overview,tech-stack
```

`specbook build` 產出可部署的靜態站到 `.specbook/dist/`，含 `index.html`、`sitemap.xml`、assets：

```bash
npx specbook build
```

build 會跑 vite 完整 production build，並 SSR 預渲染 `index.html`。完成後印 `Built to <outDir>`。

`specbook export` 輸出客戶交付用的系統規格書到 `.specbook/dist/client-spec/`（可用 `-o` 改路徑）：

```bash
npx specbook export
npx specbook export --formats md
npx specbook export -o build/spec
```

預設輸出 `system-spec.md` + `system-spec.html` 兩種格式；用 `--formats` 限制。HTML 版會帶 `theme.locale` 標記 `<html lang="...">`，可依設定產 zh-TW 或 en 版本。

<!-- doc-key: advanced-tools -->
## 進階用法

`.specbook/specbook.config.ts` 控制專案層級設定，皆由 zod schema 驗證。常用的調整點：

```ts
import { defineConfig } from 'specbook'

export default defineConfig({
  project: { name: 'TaskFlow', description: '專案描述', url: 'https://example.com' },
  theme: { accent: '#D97757', locale: 'zh-TW', mode: 'light' },
  document: { title: '系統規格書', version: 'v1.0', audience: 'Client' },
  sections: {
    order: ['overview', 'tech-stack', 'architecture', 'user-stories', 'roadmap'],
    hide: [],
  },
})
```

- `theme.locale`：切 `zh-TW` 或 `en`，內建字串對照
- `theme.accent`：必須是 6 位 hex
- `sections.hide`：在站台與 export 都會生效
- `document.title`：影響 export 系統規格書的封面標題

部署到 GitHub Pages 子路徑時，用 `--base` 旗標把資源路徑前綴起來：

```bash
npx specbook build --base /my-repo/
```

`export` 也支援自訂格式與目錄：

```bash
npx specbook export --formats md,html -o build/spec
npx specbook export --formats md      # 只輸出 markdown
```

兩 locale 對應的內建字串放在 npm package 內的 `i18n/{zh-TW,en}.ts`；v1 不支援逐字串覆寫，需要時可開 issue 討論。

<!-- doc-key: diagnostics-recovery -->
## 診斷與修復

當 `dev` 或 `build` 印出錯誤，或網站長相不對時，先跑 `doctor` 看聚合報告：

```bash
npx specbook doctor
```

`doctor` 會一次跑完環境檢查（Node 版本、`.specbook/` 是否存在、config 能否載入）、schema 驗證、缺口偵測與可選依賴檢查。AI agent 可用 `--json` 取得結構化輸出；`--verbose` 會額外顯示通過的檢查。

若需要直接看 schema 細節：

```bash
npx specbook validate
```

常見錯誤類型：

- `[overview] ...`／`[tech-stack] ...` 字首：對應章節 frontmatter 或 yaml 有 schema mismatch（如缺欄位、型別錯誤）。逐項 `.specbook/content/<file>` 對照訊息修正。
- `找不到 .specbook 目錄`：你不在專案根目錄，或還沒跑過 `init`。
- `Cannot find module 'specbook'`：dev dependency 沒裝好；重跑 `pnpm install`。

`specbook enhance` 在 schema 通過後仍可能回報尚未填寫的章節（例如 user-stories 全是 placeholder）。它不會擋 build，但有缺口時客戶交付不夠完整：

```bash
npx specbook enhance
```

需要重新 scaffold 時務必先確認重要內容已 commit。`init --force` 會直接覆寫既有 `.specbook/content/` 檔案，無 undo：

```bash
git status            # 確認沒有未提交的內容
npx specbook init --force
```

仍有問題？開 issue：[github.com/carl-ee/specbook/issues](https://github.com/carl-ee/specbook/issues)。請附 `validate` / `gaps` 完整輸出、`.specbook/specbook.config.ts`，與 `node --version`。

<!-- doc-key: ai-integration -->
## AI agent 整合

SpecBook 的內容格式對 LLM 非常友善：

- `.specbook/content/*.md`：標準 markdown + YAML frontmatter
- `.specbook/content/*.yaml`：純 yaml，結構由 zod schema 鎖死
- `.specbook/specbook.config.ts`：明確型別的 TypeScript 設定

任何 AI agent 都能讀寫這些檔案，不需要額外 parser。建議工作流：

1. `npx specbook validate` — 確認當前 schema 通過
2. `npx specbook enhance --json` — 取得結構化的待補項清單（每筆含 `prompt` 指示）
3. 對 `.specbook/content/<file>` 寫入修改
4. `npx specbook validate` — 確認改完仍合 schema

加 `--json` 讓 enhance 輸出 JSON，方便 agent parse。

**Claude Code 使用者**：SpecBook 在 npm package 內附一個 Claude Code Skill (`node_modules/specbook/skill/specbook`)。複製到 `~/.claude/skills/specbook/` 後即可使用：

```bash
mkdir -p ~/.claude/skills
cp -R node_modules/specbook/skill/specbook ~/.claude/skills/specbook
```

- `/specbook init` — 一次性 scaffold + LLM 草稿 overview / architecture
- `/specbook enhance` — 互動式 Q&A 補完 user-stories / roadmap

skill 內附 `reference/schema-cheatsheet.md`，agent 寫入前可先讀，降低 schema 違規率。也可搭配 `superpowers` 等其他 skill 組合 brainstorm → execute → validate 的循環。

<!-- doc-key: visual-surfaces -->
## 視覺輸出

SpecBook 有三個視覺面向：

**Dev 預覽**：`specbook dev` 啟動 vite dev server，預設在 `http://localhost:5173`，編輯 `.specbook/content/` 任何檔案即時熱重載。畫面採用 SpecBook 內建的 PaperTech 設計系統（暖色基底、espresso 棕字體、terracotta 橘 accent、1px hairline）。

**靜態站**：`specbook build` 產出 `.specbook/dist/`，是純 HTML/CSS/JS 的單頁站。可丟到任何靜態 host：

- GitHub Pages（記得 `--base /repo/`）
- Vercel／Netlify／Cloudflare Pages（拖 `dist/` 即可）
- 自家 nginx / S3 / Cloudflare R2

`dist/` 包含 `index.html`、`sitemap.xml`、`assets/`，無外部 runtime 依賴。

**客戶交付**：`specbook export` 產出 `.specbook/dist/client-spec/system-spec.{md,html}`。HTML 版可直接在瀏覽器列印或分享，`<html lang="...">` 標記由 `theme.locale` 決定（zh-TW 或 en），可直接 email 給客戶。

完整設計規範請參考 repo 內 [`DESIGN.md`](https://github.com/carl-ee/specbook/blob/main/DESIGN.md)（PaperTech / Vector-inspired）；自訂主題目前 v1 不開放，v2 規劃 `specbook eject`。

<!-- doc-key: documentation-maintenance -->
## 文件維護

這份使用者手冊用「雙格式 × 雙 locale」結構維持誠實：

```
docs/user/
  zh-TW/{index.md, index.html}
  en/{index.md, index.html}
```

每個區塊頭部都有一個 doc-key marker（範例用大寫；實際 key 須為 kebab-case 小寫）：

```html
<!-- doc-key: SECTION-KEY -->
```

驗證器是 `scripts/check-user-docs.ts`，由 `pnpm docs:check` 觸發。它檢查：

- 同一檔案內無重複的 doc-key
- 每份檔案都包含 `requiredDocKeys` 清單裡的全部 key
- md 與 html 在同一 locale 內 doc-key 順序一致

它不會檢查 zh-TW 與 en 之間的順序對齊，但**慣例上兩 locale 必須同步**：加任何新區塊都應一次更新四份檔案。

**新增章節的工作流**：

1. 編輯 `scripts/check-user-docs.ts` 把新 key 加入 `requiredDocKeys`
2. 四份檔案各加一個 `<!-- doc-key: NEW-KEY -->` 區段（同位置；實際寫入時用 kebab-case 小寫）
3. 寫 prose
4. 跑 `pnpm docs:check`，pass 才提交
5. 一次 commit 全部變更

**未來 roadmap**：B 階段會把 validator 內化成 `specbook docs validate` CLI，A′ 階段會移除這份 `scripts/check-user-docs.ts` 與 `docs:check` script。屆時 dogfood 完成、外部 bun 依賴歸零。

