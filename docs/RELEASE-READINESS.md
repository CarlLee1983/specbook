# Release Readiness

本文件補充目前 SpecBook 的發佈狀態、已驗證路徑與仍需留意的邊界。它描述的是目前程式碼與測試所支撐的事實，不取代 README 的使用說明。

## 目前成效

SpecBook 已形成可發布的 CLI 工具閉環：

1. `specbook init`：在目標專案產生 `.specbook/`、內容模板與 `specbook.config.ts`。
2. `specbook validate`：載入 config、Markdown frontmatter、YAML content，並以 Zod schema 驗證。
3. `specbook dev`：啟動本機 Vite preview / HMR。
4. `specbook build`：輸出可部署的 `.specbook/dist/index.html` 與 assets。
5. `specbook export`：輸出客戶交付用 `system-spec.md` 與 `system-spec.html`。
6. `specbook gaps`：偵測初始化模板或 placeholder 是否仍殘留。

## Package config loading

`specbook init` 產生的 config 使用：

```ts
import { defineConfig } from 'specbook'
```

目前 `loadConfig` 會把這個 package import 解析到 SpecBook 自身 entry：

- 原始碼 / 測試環境：`src/index.ts`
- build / installed package 環境：`dist/index.js`

因此使用者不需要修改 generated config，也不需要引用本機 repo 的 `src/` 路徑。

## 驗證範圍

目前測試涵蓋：

- schema defaults 與錯誤輸入拒絕
- content loaders 與 config loader
- scaffold / init idempotency 與 `--only`
- placeholder gap detection
- site build、base path、asset manifest
- export Markdown / HTML
- component rendering
- responsive CSS
- published package smoke test
- scaffold-generated config 在 installed package 環境中的 validate smoke test

標準驗證指令：

```bash
pnpm lint
pnpm build
pnpm test
pnpm docs:check
pnpm test:packaging
pnpm pack:check
```

最近一次驗證結果（2026-05-16）：

```text
pnpm lint: passed
pnpm build: passed
Test Files  52 passed (52)
Tests       199 passed (199)
pnpm docs:check: passed
pnpm test:packaging: passed
pnpm pack:check: passed
```

## UI / PaperTech 狀態

目前樣式遵循 `DESIGN.md` 的 PaperTech 方向：

- 暖米色背景與白色 surface
- 深咖啡文字
- 陶土橘 accent
- 1px 邊框與高資訊密度排版
- 4px spacing grid 的倍數化間距

`--color-status-error` 已補齊，用於 P0 user story priority badge。

## Export 行為

`specbook export` 目前支援：

- `md`
- `html`
- `md,html`

HTML export 會依 `theme.locale` 輸出 `<html lang="...">`，例如：

- `zh-TW`
- `en`

文件 metadata 由 `document` config 控制；未設定時使用 schema default。

## 仍需留意的邊界

- Mermaid render 仍依賴 optional `playwright` peer dependency；沒有 Mermaid 區塊時不需要安裝。
- v1 目前不開放自訂元件或主題 eject，保持固定 PaperTech 骨架。
- export HTML 是正式文件版式，不等同互動式網站版。
- 測試驗證的是目前 CLI 與 fixture 覆蓋路徑；真實大型專案的內容品質仍取決於使用者填寫的 spec 完整度。
