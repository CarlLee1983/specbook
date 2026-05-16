# `specbook docs init --write-config` 設計

> Status: draft (brainstormed 2026-05-16)
> Scope: 為 `specbook docs init` 加上 `--write-config` flag，讓它能在 scaffold `docs/user/*` 之後，自動把 `docs.user` 區塊補進 `.specbook/specbook.config.ts`。

## 1. 動機

目前 `specbook docs init` 只 scaffold `docs/user/<locale>/{index.md,index.html}`，不會碰主要 config。使用者要實際啟用 docs.user 還得手動編輯：

```ts
docs: {
  user: {
    enabled: true,
    locales: ['zh-TW', 'en'],
    theme: 'anthropic-warm',
    coverage: 'all',
  },
},
```

doctor 雖然能偵測 docs.user 啟用後的內容問題，但「需要手動編輯 config」這個前置步驟沒人幫忙。`--write-config` 就是補這個落差，讓「scaffold + 啟用」一次到位。

## 2. UX

```
npx specbook docs init --write-config
```

- 先照原本邏輯 scaffold `docs/user/<locale>/{index.md,index.html}`
- scaffold 成功後，讀 `.specbook/specbook.config.ts`，呼叫 `patch-config` 嘗試插入 `docs.user`
- 結果分四種：

| `patch-config` 回傳 | CLI 行為 | Exit code |
|---|---|---|
| `patched` | 寫回檔案，stdout：`patched <abs path to specbook.config.ts> (added docs.user)` | 0 |
| `skipped` | 不寫檔，stdout：`<abs path> already has docs.user; left untouched` | 0 |
| `unparseable` | 不寫檔，stdout 印可貼上的 snippet，stderr 指明路徑與提示「請手動貼上 docs.user 區塊」 | 1 |
| 檔案不存在 | stderr：``expected .specbook/specbook.config.ts (run `specbook init` first)`` | 1 |

路徑使用絕對路徑——與現有 `docs init` 的 `wrote <abs path>` 風格一致（由 `resolve(opts.root)` 推出）。

「scaffold 成功 → config 失敗」是可接受的部分失敗：檔案層級的 docs/user 已寫出，但整體 exit 仍為 1，讓 CI / doctor 抓得到。

不傳 `--write-config` 時行為**不變**（opt-in）。

## 3. 模組邊界

新增一個純函式模組 + 修改一個 CLI handler。**不加新依賴、不動 schema、不動 scaffold、不動 doctor。**

| 模組 | 路徑 | 職責 |
|------|------|------|
| `patch-config` | `src/docs/patch-config.ts`（新） | 純函式：input 是 config 原始字串 + `DocsUserConfig`，output 是 `{ kind: 'patched' \| 'skipped' \| 'unparseable', text? }`。**不碰 fs**，便於單測。 |
| `cli/docs.ts` `init` action | 既有 | 加 `--write-config` flag；當 flag 開啟：讀檔 → 呼叫 `patch-config` → 依結果寫檔／印 snippet／報錯。 |

`patch-config` 的型別：

```ts
export type PatchConfigResult =
  | { kind: 'patched'; text: string }
  | { kind: 'skipped' }
  | { kind: 'unparseable'; reason: string }

export function patchConfig(
  source: string,
  docsUser: DocsUserConfig,
): PatchConfigResult
```

## 4. 插入規則（pattern detection）

`patchConfig(source, docsUser)`：

1. **找頂層 `defineConfig({...})`** — 用 regex 在 source 中找 `export default defineConfig({` 起點，並從尾端找對應的 `^})` 收尾。沒找到 → `unparseable`（reason: `"defineConfig({...}) not found"`）。
2. **掃描頂層 keys**（淺層匹配，不解析巢狀）— 從 `defineConfig({` 到結尾 `})` 之間，逐行檢查行首縮排兩格的 `^  ([a-zA-Z_$][a-zA-Z0-9_$]*):` 樣式，蒐集是否出現 `docs:`。
3. **若已有 `docs:` 區塊** — 在該 docs 區塊內（從 `docs: {` 到對應 `},`）再用 regex 找 `^    user:`：
   - 找到 → `skipped`
   - 沒找到 → `unparseable`（reason: `"existing docs block without user; will not edit nested object"`）
4. **若沒有 `docs:` 區塊** — 取結尾 `})` 的縮排，組出：
   ```ts
     docs: {
       user: {
         enabled: true,
         locales: ['zh-TW', 'en'],
         theme: 'anthropic-warm',
         coverage: 'all',
       },
     },
   ```
   插入位置：頂層 keys 末尾、`})` 之前。若 source 中最後一個頂層 key 結尾沒有 `,` 就補上。

**設計取捨**：寬鬆但保守。能處理「`specbook init` 出來、加了一兩個 key 的 config」這個主要 case；任何巢狀切割風險就保守 fall back 到 `unparseable`，由 CLI 印 snippet。

**值的來源**：寫入的 `locales` / `theme` / `coverage` 來自 CLI 已解析過的選項（與 scaffold 用的同一份），這樣 `docs init --locales zh-TW --write-config` 寫進去就是 `locales: ['zh-TW']`。`enabled` 一律寫 `true`。

**輸出格式**：插入字串用兩格縮排、單引號字串、結尾逗號——與 `renderConfigTemplate` 風格一致。

## 5. CLI 整合

`src/cli/docs.ts` 的 `init` action 加：

```ts
.option(
  '--write-config',
  'Patch .specbook/specbook.config.ts to enable docs.user',
  false,
)
```

scaffold 成功後（`r.ok === true`）才進入 patch flow：

```ts
if (opts.writeConfig) {
  const configPath = resolve(root, '.specbook/specbook.config.ts')
  if (!existsSync(configPath)) {
    console.error('expected .specbook/specbook.config.ts (run `specbook init` first)')
    process.exit(1)
  }
  const original = await readFile(configPath, 'utf8')
  const result = patchConfig(original, {
    enabled: true,
    locales,
    theme: opts.theme,
    coverage: cov, // already normalized above
  })
  switch (result.kind) {
    case 'patched':
      await writeFile(configPath, result.text, 'utf8')
      console.log(`patched ${configPath} (added docs.user)`)
      break
    case 'skipped':
      console.log(`${configPath} already has docs.user; left untouched`)
      break
    case 'unparseable':
      console.error(
        `could not patch ${configPath}: ${result.reason}. paste this manually:`,
      )
      console.log(renderDocsUserSnippet(locales, opts.theme, cov))
      process.exit(1)
  }
}
```

`renderDocsUserSnippet` 是 `patch-config.ts` export 的輔助函式，產生與插入相同的 docs 區塊字串，方便使用者手貼。

## 6. 測試

`tests/docs/patch-config.test.ts`（新檔，純函式）：

1. 模板 config（無 `docs:`）→ `patched`，且輸出再用 `loadConfig` 解析應得 `docs.user.enabled === true`
2. 已含 `docs: { user: {...} }` 的 config → `skipped`
3. 已有 `docs: {}`（無 `user`）→ `unparseable`
4. 找不到 `defineConfig` → `unparseable`
5. 多頂層 keys、最後 key 有 / 沒結尾逗號兩種變體 → `patched`，loadConfig 可解析
6. 自訂 `locales: ['en']` 傳入 → 輸出含 `locales: ['en']`

`tests/cli/docs.test.ts`（既有檔案加 case）：

7. `--write-config` 對模板 config → 寫入後 `loadConfig` 出 `docs.user.enabled === true`，exit 0
8. `--write-config` 對已有 docs.user 的 config → skip 且檔案 byte-identical，exit 0
9. `--write-config` 對不存在的 config → exit 1，stderr 含 `run \`specbook init\` first`
10. `--write-config` 對 `unparseable` config（如手動改成 `defineConfig({})` 後再包一層 helper）→ exit 1，stdout 含 docs.user snippet

## 7. 影響範圍

- **新增**：`src/docs/patch-config.ts`、`tests/docs/patch-config.test.ts`
- **修改**：`src/cli/docs.ts`、`tests/cli/docs.test.ts`
- **不動**：schema、scaffold、doctor、依賴清單

## 8. 顯式不做（YAGNI）

- 不在這個 PR 修 doctor 訊息（之後可獨立改成「請跑 `specbook docs init --write-config`」）
- 不嘗試自動補 `docs:` 區塊**內部**的 `user:`（巢狀切割風險，保守 fall back）
- 不支援同時補多個 config 區塊（只認 `docs.user`）
- 不做 dry-run flag（fall back 已能讓使用者預覽 snippet）
- 不做 AST-based patching（避免新依賴；模式偵測對主要 case 已夠用）

## 9. 邊界決策摘要

| 情境 | 行為 | 出自決策 |
|---|---|---|
| 已有 docs.user | idempotent skip, exit 0 | Q1 |
| Config 檔不存在 | 報錯、要求先 `specbook init`, exit 1 | Q2 |
| Config 已被客製成 patch 認不出 | 印 snippet + exit 1 | Q3 |
| `docs init` 沒帶 `--write-config` | 不碰 config（與現狀一致）| Q4 |
| scaffold 成功但 patch 失敗 | docs/user 保留、但 exit 1 | 設計確認 #3 |
