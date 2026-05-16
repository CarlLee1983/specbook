# `specbook enhance --json` 設計

> Status: draft (brainstormed 2026-05-16)
> Scope: 新增 `specbook enhance` CLI 子命令；輸出機讀 checklist（含 AI 可直接執行的英文 prompt），同時把現有 `gaps` 改寫為其 section-level 子集，分階段 deprecate。

## 1. 動機

SpecBook 既有的 `gaps` 只回報「哪一個 section 還是 placeholder」（中文 `reason`），AI 拿到後仍要自己決定「該問 user 什麼」。`doctor` 則是健康檢查聚合，定位不同。

要讓 SpecBook 在「AI 補完規格」這條路上有差異化，應該把「下一步該問什麼」也下放到 CLI 層、用穩定的機讀格式輸出，讓任何 AI（不只 Claude / 不限 skill）都能用同一個契約驅動 Q&A：

```bash
npx specbook enhance --json
```

得到 deterministic、stable schema 的 checklist，每筆 item 都有英文 `prompt` 欄位告訴 AI「該對 user 問什麼／該寫回什麼」。CLI 本身不碰 LLM，純規則式；可離線、可單測、可被 CI 消費。

## 2. UX

```bash
# 機讀模式（skill / AI / CI 用）
npx specbook enhance --json
# 人讀模式（terminal 直接看）
npx specbook enhance
```

JSON 輸出（範例）：

```jsonc
{
  "ok": false,
  "items": [
    {
      "id": "placeholder.user-stories",
      "section": "user-stories",
      "severity": "warn",
      "scope": "section",
      "file": ".specbook/content/user-stories.yaml",
      "problem": "User stories file still contains template placeholders.",
      "prompt": "Ask the user for the primary, secondary, and tertiary actors and what each wants to accomplish. Rewrite .specbook/content/user-stories.yaml so no placeholder phrases remain."
    },
    {
      "id": "schema.user-stories.story-incomplete",
      "section": "user-stories",
      "severity": "warn",
      "scope": "item",
      "file": ".specbook/content/user-stories.yaml",
      "path": "stories[0].soThat",
      "problem": "User story at stories[0] is missing a concrete 'soThat' value.",
      "prompt": "Ask the user what business value the actor in stories[0] gains. Update stories[0].soThat with a specific outcome (avoid generic phrasing like 'so I can use the system')."
    }
  ],
  "meta": {
    "specbookRoot": "/abs/path/.specbook",
    "durationMs": 12,
    "schemaVersion": 1
  }
}
```

人讀輸出（無 `--json`）：

```
偵測到以下可補齊項（4）：

  [warn] user-stories
    User stories file still contains template placeholders.
    → 跑 /specbook enhance 互動補完。

  [warn] roadmap › milestones[1]
    Milestone 'M2' has an empty items list.
    → 跑 /specbook enhance 互動補完。

  …

說明：可補齊項不會擋住 specbook dev / build；JSON 模式請加 --json。
```

### Exit code 與 stdout 契約

| 條件 | exitCode | stdout | stderr |
|---|---|---|---|
| `.specbook` 不存在 | `2` | 空 | `找不到 .specbook 目錄：<abs path>` |
| 偵測時拋例外 | `2` | 空 | `enhance crashed: <msg>` |
| `--json` 且 items 為空 | `0` | `{"ok":true,"items":[],"meta":{...}}` pretty JSON | 空 |
| `--json` 且 items 非空 | `0` | pretty JSON | 空 |
| 無 `--json` 且 ok | `0` | `✅ Spec 已完整，沒有可補齊項。` | 空 |
| 無 `--json` 且非 ok | `0` | 人讀清單 | 空 |

**設計理由：** 有 items 不是錯誤，是「可補齊」。`ok=false` 由 JSON 表達；exit code 永遠 0（除非 root 缺失或 crash）。這與 `gaps` 既有行為一致，並避免 CI 把 enhance 當成 fail gate。

## 3. JSON Schema（contract）

### 頂層

```ts
interface EnhanceReport {
  ok: boolean                    // items.length === 0
  items: EnhanceItem[]
  meta: {
    specbookRoot: string         // absolute path
    durationMs: number
    schemaVersion: 1
  }
}
```

### Item

```ts
interface EnhanceItem {
  id: string                                                 // 穩定字串 ID，e.g. "placeholder.user-stories"
  section: 'overview' | 'architecture' | 'user-stories' | 'roadmap'
  severity: 'warn' | 'info'                                  // 不開放 'error'（那是 validate / doctor 的職責）
  scope: 'section' | 'item'                                  // section-level vs item-level
  file: string                                               // 相對 project root（不是 specbook root）
  path?: string                                              // scope='item' 時必填；scope='section' 時省略
  problem: string                                            // 英文，描述「現在為何不夠好」
  prompt: string                                             // 英文，描述「AI 該對 user 問什麼／該寫回什麼」
}
```

### 欄位語意

- **`id`** — 格式 `<check-kind>.<section>[.<sub>]`。穩定字串，AI / 工具可靠它 dedupe 或映射自訂行為。
- **`section`** — 四個 enum 之一（沿用既有 `GapSection`）。
- **`severity`** — `warn` 為主；`info` 保留給未來「nice-to-have」類提示（本版不使用）。
- **`scope`** — `section` 對應現有 gaps 的偵測；`item` 是本次新增的拆解粒度（個別 story / milestone）。
- **`file`** — 相對 project root（**非** specbook root），方便 IDE / AI 直接 open。
- **`path`** — dot/bracket 表示法，例如 `stories[0].soThat`、`milestones[1]`。`prompt` 內可字面引用同一 path，作為「定位資訊」插值（這是唯一允許的插值）。
- **`problem` / `prompt`** — 英文。`prompt` 是完整可操作的祈使句，AI 拿到就能直接執行。中文化由上游 skill / AI 自行處理。
- **`meta.schemaVersion`** — 本版為 `1`，未來新增 breaking field 時 bump。

### Ordering 規則

- 同 section 內：section-level 排在 item-level 之前（讓 AI 知道「先掃模板再精修」）。
- section 之間：固定 `overview → architecture → user-stories → roadmap` 順序。
- 不做跨 item 去重；同一筆 story 兩個欄位都缺就回兩個 item。
- 若 section-level 命中，item-level checks **仍照跑、照輸出**（不要 short-circuit）。

## 4. 模組架構

```
src/
  enhance/
    detect.ts                  # detectEnhanceItems(root) -> EnhanceReport（入口、統一載入內容、分派 checks）
    types.ts                   # EnhanceItem / EnhanceReport / Severity / Scope
    checks/
      placeholder-overview.ts       # section-level
      placeholder-architecture.ts   # section-level
      placeholder-user-stories.ts   # section-level
      placeholder-roadmap.ts        # section-level
      schema-user-stories.ts        # item-level
      schema-roadmap.ts             # item-level
  cli/
    enhance.ts                 # runEnhanceCli({ root, json }) -> { exitCode, stdout, stderr }
  gaps/
    detect-gaps.ts             # 改寫：呼叫 detectEnhanceItems()，過濾 scope='section' 的 placeholder.*，轉成 GapReport
```

關鍵設計點：

- 每個 check 是純函式 `(loadedContent) => EnhanceItem[]`；**不直接讀檔**，由 `detect.ts` 統一載入並分派。check 可獨立單測。
- `src/gaps/detect-gaps.ts` 從「placeholder regex 的擁有者」降級為「enhance 的 section-level 視圖」。本次 PR 內 gaps 對外行為完全不變。
- `src/cli/enhance.ts` 鏡像現有 `gaps.ts` 的純 I/O 風格（回 `{ exitCode, stdout, stderr }`，不直接 `process.exit`），便於整合測試。
- CLI 註冊在 `src/cli/index.ts`，與 `gaps` 相鄰。

### `runEnhanceCli` 簽章

```ts
export interface EnhanceCliInput {
  root: string
  json: boolean
}
export interface EnhanceCliOutput {
  exitCode: number
  stdout: string
  stderr: string
}
export async function runEnhanceCli(input: EnhanceCliInput): Promise<EnhanceCliOutput>
```

## 5. Check 目錄

### Section-level（4 個，沿用既有 placeholder regex）

| Check 檔 | id | 觸發條件（regex） | severity | prompt |
|---|---|---|---|---|
| `placeholder-overview.ts` | `placeholder.overview` | `在這裡寫一段 1-3 段的散文` 或 `這段文字會以 hero 區呈現在 SpecBook 站首屏` | `warn` | "Ask the user for a 1–3 paragraph project overview that explains what this project is, who it serves, and why it exists. Rewrite .specbook/content/overview.md so no placeholder phrases remain." |
| `placeholder-architecture.ts` | `placeholder.architecture` | `在這裡描述系統的整體架構` | `warn` | "Ask the user for the system's high-level architecture: main components, how they communicate, and key external dependencies. Rewrite .specbook/content/architecture.md so no placeholder phrases remain." |
| `placeholder-user-stories.ts` | `placeholder.user-stories` | `主要使用者角色` / `次要使用者` / `第三類使用者` | `warn` | "Ask the user for the primary, secondary, and tertiary actors and what each wants to accomplish. Rewrite .specbook/content/user-stories.yaml so no placeholder phrases remain." |
| `placeholder-roadmap.ts` | `placeholder.roadmap` | `M1\s*—\s*起手` 或 `第一個工作項` | `warn` | "Ask the user for 2–4 concrete milestones (title + deliverables + status). Rewrite .specbook/content/roadmap.yaml so no placeholder phrases remain." |

### Item-level（2 個，新增）

**`schema-user-stories.ts`** — 載入 user-stories.yaml 後逐筆檢查：

- 對每個 `stories[i]`，若 `as` / `want` / `soThat` 任一仍是空字串或命中泛用 placeholder phrase（`主要使用者角色`、`次要使用者`、`第三類使用者`、`使用 SpecBook 描述專案`、`快速產出系統規格文件`），為**該欄位**輸出一個 item。
- `id = "schema.user-stories.story-incomplete"`
- `path = stories[i].<field>`（i 為實際索引，field 為觸發的欄位名）
- `severity = "warn"`
- `prompt`（含 path 字面插值）："Ask the user for a concrete `<field>` value for stories[i] (the actor / motivation / outcome). Update stories[i].<field>."

**`schema-roadmap.ts`** — 載入 roadmap.yaml 後逐筆檢查：

- 對每個 `milestones[i]`：
  - 若 `title` 命中 `^M\d+\s*—\s*起手$` → 一筆 item，`id="schema.roadmap.milestone-title-placeholder"`，`path="milestones[i].title"`。
  - 若 `items` 為空陣列 → 一筆 item，`id="schema.roadmap.milestone-empty"`，`path="milestones[i]"`，prompt 要 AI 詢問 2–5 個 deliverable。
- `severity = "warn"`。

## 6. `gaps` 遷移路徑

分三階段。**本次 PR 只做階段 1。**

### 階段 1（本次 PR）— 內部反轉，行為不變

- placeholder regex 集中移到 `src/enhance/checks/placeholder-*.ts`。
- `src/gaps/detect-gaps.ts` 改寫：呼叫 `detectEnhanceItems(root)`，過濾 `id.startsWith('placeholder.')` 且 `scope==='section'` 的 item，逐筆轉成現有的 `Gap` 結構（保留中文 `reason: "偵測到 placeholder（<regex source>）"` 字面格式）。實作可選：
  - 方案 A：placeholder check 內部多帶一個非對外欄位（`internal.regexSource`），讓 gaps adapter 用它湊出 reason。
  - 方案 B：gaps adapter 自己再跑一次原始 regex 的 lookup table（簡單、零跨層耦合）。

  兩者擇一在 plan 階段定。**驗收：既有 gaps 測試一字不改全綠。**

- `src/doctor/checks/gaps.ts`、`skill/specbook/enhance.md`、README 都**不動**。
- `gaps` CLI 行為、輸出、exit code 完全不變。
- 同時新增 `enhance` CLI 與測試，獨立通過。

### 階段 2（下一個 minor 版本）

- `gaps` CLI 在 stderr 印 `deprecated: use 'specbook enhance' instead`。
- `skill/specbook/enhance.md` 切到 `npx specbook enhance --json`。
- README / doctor hint 把 gaps 的提及換成 enhance。
- doctor 內部 `checks/gaps.ts` 改名 `checks/enhance.ts` 並改用 `detectEnhanceItems`（或保留 alias 一段時間）。

### 階段 3（下一個 major 版本）

- 移除 `src/cli/gaps.ts`、`src/gaps/`、舊路徑。
- CHANGELOG 註記。

**為何分階段：** doctor / skill / 文件 / README 都引用 `gaps`，一次切要動到非常多檔；本次 PR 範圍聚焦在「enhance 上線、gaps 不退場」。

## 7. 測試策略（TDD）

走 TDD：先寫測試（紅）→ 實作（綠）。對齊 `tests/` 既有結構。

```
tests/
  enhance/
    detect.test.ts                       # 整合：對 fixtures 跑 detectEnhanceItems，斷言 items 集合與 ordering
    checks/
      placeholder-overview.test.ts       # 單元：注入 OverviewDoc
      placeholder-architecture.test.ts
      placeholder-user-stories.test.ts
      placeholder-roadmap.test.ts
      schema-user-stories.test.ts
      schema-roadmap.test.ts
  cli/
    enhance.test.ts                      # CLI 整合：runEnhanceCli({ root, json }) on fixture roots
  gaps/
    detect-gaps.test.ts                  # 既有：必須保持綠，不改測試
```

### Fixture

`tests/fixtures/` 下新增三個 specbook root（可重用既有 fixture base，只覆寫差異檔）：

- `.specbook-placeholder-only/` — init 後原狀，預期 4 個 section-level item。
- `.specbook-partial/` — overview/architecture 已補；user-stories 有 3 筆但 1 筆 `soThat` 是 placeholder；roadmap 有 2 個 milestone 但第 2 個 `items=[]`。預期：0 個 section-level + 2 個 item-level。
- `.specbook-clean/` — 完整無缺，預期 `ok: true, items: []`。

### 單元測試（每個 check）

- 命中 → 長度 1 的 item，斷言全欄位（`id` / `section` / `severity` / `scope` / `file` / `path` / `prompt`）。
- 未命中 → 空陣列。
- 邊界：item-level 對「混合命中」（story[0] 缺 want、story[2] 缺 soThat）回兩筆，path 各自正確。

### 整合測試（`detect.test.ts`）

- 三個 fixture 各跑一次，斷言 items 集合與 ordering。
- 斷言 `meta.schemaVersion === 1`、`meta.specbookRoot` 是 absolute path。
- 不存在的 root → throw（CLI 層才把 throw 轉 exit code 2）。

### CLI 測試（`tests/cli/enhance.test.ts`）

- `.specbook` 不存在 → `{ exitCode: 2, stdout: '', stderr: /找不到/ }`。
- 三個 fixture × `json: true | false` = 6 個 case，斷言 stdout 開頭（JSON 是 `{"ok":`、文字是 `偵測到` 或 `✅`）。
- JSON 模式 parse 後是有效 schema（id 字串、section enum、severity enum、ok boolean）。

### Regression（必須保持綠）

- `tests/gaps/detect-gaps.test.ts`（既有）
- `tests/cli/gaps.test.ts`、`tests/doctor/checks/gaps.test.ts`（若存在）

### Lint / type

`pnpm test`、`pnpm tsc --noEmit`（或 vitest 內建型別檢查）全綠。

## 8. 不在本次範圍

- `gaps` CLI 的 deprecation warning（階段 2）。
- skill `enhance.md` 切到新 CLI（階段 2）。
- doctor 內部 checks 改名（階段 2）。
- LLM-augmented prompt 生成（永遠不在範圍——CLI 保持 rule-based）。
- 多語言 prompt（`prompt_en` / `prompt_zh`）—— 未來如有需要再 bump `schemaVersion`。
- `severity: 'error'` —— 目前不引入。

## 9. 風險與緩解

| 風險 | 緩解 |
|---|---|
| placeholder regex 同時在 `gaps/` 和 `enhance/checks/` 兩處維護導致漂移 | 階段 1 內 `gaps` 已改寫成消費 enhance；regex 只在 `enhance/checks/` 維護。 |
| schema-level item 對「真實但簡短」的內容誤判（例如使用者刻意只寫一句 `as: '工程師'`） | 偵測條件僅鎖定**空字串**與**已知 placeholder 字串集合**；不做長度啟發式。 |
| JSON schema 演進時破壞既有 skill | `meta.schemaVersion` 留作版本欄位，破壞性變更必 bump。 |
| `prompt` 內帶 path 插值的字串測試難維護 | path 是 deterministic 純字面插值；測試直接斷言完整 prompt 字面值，不做 regex 比對。 |

## 10. 完成條件（Definition of Done）

- [ ] `npx specbook enhance --json` 對三個 fixture 都輸出符合 schema 的 JSON。
- [ ] `npx specbook enhance` 對三個 fixture 都輸出人讀清單。
- [ ] `npx specbook gaps`（既有）行為與輸出 byte-equivalent，原測試一字不改全綠。
- [ ] 所有新模組有單元測試；CLI 有整合測試。
- [ ] `pnpm test` 全綠、`tsc --noEmit` 無錯。
- [ ] 不動 README / skill / doctor（留給階段 2）。
