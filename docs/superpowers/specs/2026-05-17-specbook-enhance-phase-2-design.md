# `specbook enhance` Phase 2 — Design

> 跟前一個 minor 版的 [`enhance --json` design](2026-05-16-specbook-enhance-json-design.md)
> 是同一條 deprecation timeline 的第二步。Phase 1 把 `enhance` 上線、`gaps` 留著；
> Phase 2 推進到「`enhance` 是正式入口、`gaps` 進入軟性 deprecation」。

## 1. 目標與範圍

**目標**：讓 `enhance` 成為唯一被推薦的入口；`gaps` 仍可用但會在 stderr 印
deprecation 警告；skill / doctor / README / user docs 全部統一指向 `enhance`。

**In scope**：

| 區塊 | 動作 |
|---|---|
| `src/cli/gaps.ts` | 加 stderr deprecation warning（不擋 exit code、不影響 JSON） |
| `src/doctor/checks/gaps.ts` | 改名為 `enhance.ts`、改用 `detectEnhanceItems`、finding id `gaps.*` → `enhance.*` |
| `src/doctor/run-doctor.ts` | 換 import + `skipped('gaps', ...)` 改 `skipped('enhance', ...)` |
| `skill/specbook/enhance.md` | 以 `EnhanceItem.prompt` 為主軸重寫 |
| `README.md` | 表格 / quick start 把 `specbook gaps` 換成 `specbook enhance`；保留一行說明 `gaps` deprecated |
| `docs/user/zh-TW/index.md` + `.html` | 改寫「偵測缺口」段落成「補完 spec」 |
| `docs/user/en/index.md` + `.html` | 英文版同步 |
| `docs/RELEASE-READINESS.md` | 第 6 點換掉 |

**Out of scope（留給 phase 3，下一個 major）**：

- 移除 `src/cli/gaps.ts` 整支
- 移除 `src/gaps/` 目錄
- 移除 `tests/cli/gaps.test.ts` 與 `tests/gaps/detect-gaps.test.ts`
- CHANGELOG breaking-change 條目

## 2. `gaps` CLI deprecation warning

**機制**：在 `runGapsCli()` 進入點把警告字串**前綴到** `output.stderr`（不是
`console.error`），維持「pure function 回 `{exitCode, stdout, stderr}`」的
契約。stdout、JSON 結構、exit code **完全不變**。

當 stderr 還有其它訊息（如 `找不到 .specbook 目錄`），deprecation 訊息排第一
行、用 `\n` 分隔；clean root 時 stderr 只有 deprecation 一行。

**文案**：

```
[deprecated] 'specbook gaps' will be removed in a future release. Use 'specbook enhance' instead.
```

**對既有測試的影響**：

- `tests/cli/gaps.test.ts` 的 `root missing` 測試斷言 `stderr.length > 0`：
  仍 > 0（deprecation + missing root 兩段），維持 PASS。
- 新增一個 case：clean root → stderr 含 `[deprecated]`、JSON stdout 解析成功。

**不提供環境變數抑制**。phase 3 才整支移除；要關 stderr 自己 `2>/dev/null`。

## 3. `src/doctor/checks/gaps.ts` → `enhance.ts`

**新檔案**：`src/doctor/checks/enhance.ts`

```ts
import { detectEnhanceItems } from '../../enhance/detect.js'
import type { DoctorFinding, ExecutionContext } from '../types.js'

export async function checkEnhance(
  ctx: Pick<ExecutionContext, 'specbookRoot'>,
): Promise<DoctorFinding[]> {
  let report
  try {
    report = await detectEnhanceItems(ctx.specbookRoot)
  } catch {
    return []  // schema errors surface via checkValidate upstream
  }
  if (report.ok) {
    return [{
      id: 'enhance',
      severity: 'info',
      category: 'content',
      title: 'No enhancement opportunities detected',
    }]
  }
  return report.items.map((it) => ({
    id: `enhance.${it.section}`,
    severity: 'warn' as const,
    category: 'content' as const,
    title: it.problem,
    detail: it.path ? `${it.section} › ${it.path}` : `Section: ${it.section}`,
    hint: 'Run `/specbook enhance` to fill in.',
  }))
}
```

**與舊 `checkGaps` 的差異**：

| 維度 | 舊 `checkGaps` | 新 `checkEnhance` |
|---|---|---|
| finding id | `gaps.<section>` | `enhance.<section>` |
| 一個 section 多 item | 聚合成 1 筆 finding | 多筆 finding（一個 EnhanceItem 一筆）|
| title | `g.reason`（中文）| `it.problem`（英文）|
| detail | `Section: <section>` | 含 path：`<section> › stories[0].soThat` |
| hint | `Run \`specbook gaps\` or \`/specbook enhance\``| `Run \`/specbook enhance\` to fill in.`|

**`run-doctor.ts` 改動**：

```diff
- import { checkGaps } from './checks/gaps.js'
+ import { checkEnhance } from './checks/enhance.js'

- skipped('gaps', 'config could not be loaded', 'content'),
+ skipped('enhance', 'config could not be loaded', 'content'),

- findings.push(...(await checkGaps(ctx)))
+ findings.push(...(await checkEnhance(ctx)))
```

**測試遷移**：

- 刪 `src/doctor/checks/gaps.ts`。
- 新 `tests/doctor/checks/enhance.test.ts`：直接測 `checkEnhance` 對三個
  fixture（clean / has-gaps / schema-error）的行為。
- 修 `tests/doctor/run-doctor.test.ts`：
  - `id.startsWith('gaps.')` → `'enhance.'`
  - `'skipped.gaps'` → `'skipped.enhance'`

## 4. `skill/specbook/enhance.md` 重寫

**核心轉變**：從「draft → Q&A → write back」的 6 步流程改成「prompt 驅動 loop」。
`enhance --json` 已經把「該問什麼」打包在 `EnhanceItem.prompt` 裡，skill 只需
dispatch。

**新流程（4 步）**：

```markdown
# /specbook enhance — Procedure

Goal: walk through `enhance --json` output and fill in each item by
executing its `prompt`, then write back to `.specbook/content/*` and validate.

## 1. Detect

npx specbook enhance --json --root .specbook

- exit 2 + `找不到 .specbook 目錄` → tell user to run `/specbook init`
- `ok: true, items: []` → ask if they want to refine anything anyway
- otherwise → continue

## 2. Loop over items

For each `item` in `items[]` (already sorted by section + scope):

1. Read `item.prompt` — it is an English instruction telling you what to
   ask the user.
2. Draft a suggestion based on README, file tree, and existing
   `.specbook/content/`.
3. Present the draft + the prompt's question to the user; iterate until
   agreed.
4. Plan the write: which file (`item.file`), which path (`item.path` if
   `scope='item'`).

## 3. Write back

After a coherent batch agrees (e.g. all of overview, or all user stories),
use `Write` to update `.specbook/content/<file>`.

- See `reference/schema-cheatsheet.md` for schemas.
- Ensure no placeholder phrases remain.

## 4. Validate + finish

npx specbook validate --root .specbook

Fix any schema violations. Repeat until clean. Then:

> ✅ Spec 已強化！下一步：`npx specbook dev` 預覽，或 `npx specbook build`。
```

**簡化掉的內容**：
- 不再列舉「main user / secondary user / M1 M2」範例對話（已在 `item.prompt` 裡）。
- 不再列舉 placeholder 字串。

**保留不動**：`skill/specbook/reference/schema-cheatsheet.md`（Write 階段仍需要）。

## 5. README 與 user docs 同步

### 5.1 `README.md`

| Line | 現況 | 改成 |
|---|---|---|
| L87 | `- /specbook enhance — 互動式 Q&A 補完 user-stories / roadmap` | 不變 |
| L111 | `\| npx specbook gaps \| 偵測 placeholder / 殘留模板（--json 給 skill 用）\|` | `\| npx specbook enhance \| 偵測殘留 placeholder 與未完成欄位（--json 給 skill 用）\|` |
| L158 | `CLI 行為：init / validate / gaps / dev / build / export` | `init / validate / enhance / dev / build / export` |

並在 CLI 表格下方加一行 footnote：
> `specbook gaps` 仍可用但已 deprecated；輸出與 `enhance --json` 經過 placeholder.* section-level 過濾後一致。

### 5.2 `docs/user/zh-TW/index.md`

L59–63、L160–163 兩段「`specbook gaps` 偵測 placeholder…」整段改寫：

```markdown
### 補完未完成的章節

`specbook enhance` 偵測殘留 placeholder、缺值欄位等需要補完的項目。預設輸出
人類可讀清單，加 `--json` 給 LLM / 自動化流程使用：

npx specbook enhance
npx specbook enhance --json

JSON 模式每筆 item 含 `prompt` 欄位，是給 AI 直接執行的英文指示。
```

L187 `npx specbook gaps --json` → `npx specbook enhance --json`。

### 5.3 `docs/user/en/index.md`

英文版對應段落同步改寫。

### 5.4 `docs/RELEASE-READINESS.md`

L14 第 6 點：

- 現況：`6. specbook gaps：偵測初始化模板或 placeholder 是否仍殘留。`
- 改成：`6. specbook enhance：偵測殘留 placeholder 與未完成欄位（取代舊的 specbook gaps）。`

### 5.5 HTML 重新生成

`docs/user/{zh-TW,en}/index.html` 由 build 重新產出（不手動編輯），跟 .md
同步。如果沒有現成 build 任務，plan 會列為手動同步步驟。

### 5.6 不動的檔案

- `skill/specbook/init.md` L86-87（已是 enhance）
- `skill/specbook/reference/schema-cheatsheet.md`
- `skill/specbook/SKILL.md`

## 6. 測試策略

### 6.1 既有測試要改

| 檔案 | 改動 |
|---|---|
| `tests/cli/gaps.test.ts` | 新增 1 case：clean root → stderr 含 `[deprecated]`、JSON stdout 仍可解析 |
| `tests/doctor/run-doctor.test.ts` | `id.startsWith('gaps.')` → `'enhance.'`；`'skipped.gaps'` → `'skipped.enhance'` |

### 6.2 新增測試

| 檔案 | 重點 |
|---|---|
| `tests/doctor/checks/enhance.test.ts` | clean fixture → 1 筆 info；has-gaps → 多筆 warn 全 `enhance.<section>`；schema-error → `[]`（loader 失敗時 graceful） |

### 6.3 不動

- `tests/gaps/detect-gaps.test.ts`
- `tests/enhance/**`
- `tests/cli/enhance.test.ts`

### 6.4 驗證鏈

每個 task 結束：`pnpm vitest run <touched test path>`。
最後一個 task：`pnpm test && pnpm tsc --noEmit && pnpm build`。

## 7. Commit 切法

每個 commit 都能單獨 build & test 綠。

```
1. feat: [doctor] add checkEnhance + enhance.test.ts
   - new:    src/doctor/checks/enhance.ts
   - new:    tests/doctor/checks/enhance.test.ts
   - gaps.ts 還在；checkEnhance 還未被 run-doctor 使用

2. refactor: [doctor] wire checkEnhance into run-doctor; retire checkGaps
   - modify: src/doctor/run-doctor.ts
   - modify: tests/doctor/run-doctor.test.ts (gaps.* → enhance.*, skipped.gaps → skipped.enhance)
   - delete: src/doctor/checks/gaps.ts

3. feat: [cli] add deprecation warning to specbook gaps
   - modify: src/cli/gaps.ts (stderr prefix)
   - modify: tests/cli/gaps.test.ts (新 case 斷言 [deprecated])

4. docs: [skill] rewrite enhance.md around enhance --json prompt loop
   - modify: skill/specbook/enhance.md

5. docs: [readme] point users at specbook enhance, mark gaps deprecated
   - modify: README.md
   - modify: docs/RELEASE-READINESS.md

6. docs: [user-docs] rewrite gaps section as enhance in zh-TW + en
   - modify: docs/user/zh-TW/index.md
   - modify: docs/user/en/index.md

7. build: [user-docs] regenerate index.html from updated .md
   - modify: docs/user/zh-TW/index.html
   - modify: docs/user/en/index.html
```

**順序原則**：先在 doctor 端把 `gaps.ts` 換成 `enhance.ts`，再印 deprecation
warning — 這樣 deprecation 文案說「請用 enhance」時，doctor 那邊的 finding id
已經一致，使用者順著 hint 過去看到的也是 `enhance.*`，內外連貫。

## 8. Definition of Done

- `specbook gaps` 仍可用、JSON / stdout / exit code 不變；但 stderr 第一行為
  `[deprecated] ...`。
- `specbook doctor` 的 findings 把 `gaps.*` 全換成 `enhance.*`，hint 統一說
  `/specbook enhance`。
- `skill/specbook/enhance.md` 走 prompt-driven loop。
- README / `docs/user/{zh-TW,en}/index.md` / `RELEASE-READINESS.md` 主要範例
  與 CLI 表格都指向 `enhance`，並標註 `gaps` deprecated。
- `pnpm test` 全綠（含修改後的測試）、`tsc --noEmit` 乾淨、`pnpm build` 成功。

## 9. 風險

- **使用者 CI 腳本對 `specbook gaps` stderr 做斷言**：deprecation warning 會
  改變 stderr 內容。緩解：stdout / JSON / exit code 都沒動，腳本若只看
  stdout 不受影響。
- **HTML 與 MD drift**：若 build 工具不同步 zh-TW/en HTML，文件會跟 .md 不
  一致。緩解：plan 的最後一個 commit 列為「重新生成 HTML」獨立步驟，必要時
  手動 mirror。
- **`enhance.<section>` 的多筆 finding 讓 doctor 輸出變長**：原本一個 section
  最多一筆，現在 item-level 可能多筆。緩解：目前 fixture 規模都 < 20 筆，
  doctor TTY 輸出可承擔；future 若太多可加 `--summarize` flag。
