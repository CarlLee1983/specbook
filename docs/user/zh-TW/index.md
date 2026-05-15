# SpecBook

<!-- doc-key: overview -->
把專案 spec 變成有節奏感的單頁站

> Replace this paragraph with a one-paragraph overview of what
> SpecBook does and who it is for.

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

`specbook gaps` 偵測 placeholder、殘留模板、缺值欄位等需要補完的章節。預設輸出人類可讀清單，加 `--json` 給 LLM / 自動化流程使用：

```bash
npx specbook gaps
npx specbook gaps --json
```

`gaps` 永遠 exit 0（缺口屬資訊性，不算錯誤）；若 `.specbook` 目錄不存在則 exit 2。配合 `validate` 一起用：先 `validate` 守 schema、再 `gaps` 找下一個該補的章節。

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
## Diagnostics / recovery

> `doctor`-style health checks, error recovery workflows, structured
> error output for AI consumers.

<!-- doc-key: ai-integration -->
## AI-agent integration

> How an LLM agent should use SpecBook: structured errors, skill
> packs, safe defaults, dry-run gates.

<!-- doc-key: visual-surfaces -->
## Visual / dashboard surfaces

> Any HTML report, dashboard, or visual output the tool produces.

<!-- doc-key: documentation-maintenance -->
## Documentation maintenance

> How these docs stay aligned: the doc-key contract, multi-locale
> policy, and `bun run docs:check`.

