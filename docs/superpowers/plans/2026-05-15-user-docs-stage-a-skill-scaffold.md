# User Docs — Stage A (Skill Scaffold) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 SpecBook repo 內以 writing-user-docs skill 的 scaffold 產生 `docs/user/{zh-TW,en}/{index.md,index.html}`，填入八類別繁中 + 英文 prose，並通過 `pnpm docs:check`。

**Architecture:** 一次性套用 skill scaffold（外部依賴 `bun` + `~/.claude/skills/writing-user-docs/`）。Skill 會自動產出 doc-key marker、theme css、`scripts/check-user-docs.ts` validator 與 `package.json` 內 `docs:check` script。後續每節 prose 由人工/AI 撰寫，validator 把關 md/html doc-key 對齊。

**Tech Stack:** writing-user-docs skill v1 (bun runtime)、anthropic-warm theme、`scripts/check-user-docs.ts` (Bun script，skill 產出)、`docs:check` npm script。

**Upstream spec:** `docs/superpowers/specs/2026-05-15-user-docs-integration-design.md`

---

## File Map

| Action | Path | Origin |
|--------|------|--------|
| Create | `docs/user/zh-TW/index.md` | Skill scaffold + 手寫 prose |
| Create | `docs/user/zh-TW/index.html` | Skill scaffold + 手寫 prose |
| Create | `docs/user/en/index.md` | Skill scaffold + 手寫 prose |
| Create | `docs/user/en/index.html` | Skill scaffold + 手寫 prose |
| Create | `scripts/check-user-docs.ts` | Skill scaffold |
| Modify | `package.json` | Skill 加 `docs:check` script |

選定的 coverage 類別（依 spec §9 階段 A）：
- 1 `install-setup`
- 3 `discovery-read`
- 4 `writes-mutations`
- 5 `advanced-tools`
- 6 `diagnostics-recovery`
- 8 `ai-integration`
- 9 `visual-surfaces`
- 10 `documentation-maintenance`

Skip：2 `connections`、7 `engine-support`（spec §9 已說明）。

---

### Task 1: 跑 skill scaffold 並驗證初始輸出

**Files:**
- Create: `docs/user/zh-TW/{index.md,index.html}`
- Create: `docs/user/en/{index.md,index.html}`
- Create: `scripts/check-user-docs.ts`
- Modify: `package.json`

- [ ] **Step 1: 確認 bun 可用**

Run:
```bash
which bun && bun --version
```
Expected: 輸出 bun 路徑與版本（≥ 1.0）。若無，先 `brew install bun`。

- [ ] **Step 2: 確認 skill 路徑存在**

Run:
```bash
ls ~/.claude/skills/writing-user-docs/scaffold/scaffold.ts
```
Expected: 檔案存在。

- [ ] **Step 3: 跑 scaffold**

Run（在 SpecBook repo 根目錄）：
```bash
bun run ~/.claude/skills/writing-user-docs/scaffold/scaffold.ts \
  --project "SpecBook" \
  --tagline "把專案 spec 變成有節奏感的單頁站" \
  --github "https://github.com/carl-ee/specbook" \
  --outdir docs/user/ \
  --locales en,zh-TW \
  --theme anthropic-warm \
  --coverage "1,3,4,5,6,8,9,10"
```
Expected: 命令成功；輸出列出產生的檔案。

- [ ] **Step 4: 確認檔案佈局**

Run:
```bash
ls docs/user/zh-TW/ docs/user/en/ scripts/check-user-docs.ts
```
Expected:
```
docs/user/zh-TW/index.html
docs/user/zh-TW/index.md
docs/user/en/index.html
docs/user/en/index.md
scripts/check-user-docs.ts
```

- [ ] **Step 5: 確認 `package.json` 已加 `docs:check` script**

Run:
```bash
grep '"docs:check"' package.json
```
Expected: 顯示 `"docs:check": "bun run scripts/check-user-docs.ts"`（或類似指向 scripts/check-user-docs.ts 的命令）。

- [ ] **Step 6: 跑 validator（初始狀態應通過，因為都是 placeholder）**

Run:
```bash
pnpm docs:check
```
Expected: 0 exit，輸出 "OK" 或類似 success 訊息。

- [ ] **Step 7: 提交 scaffold 初始狀態**

```bash
git add docs/user/ scripts/check-user-docs.ts package.json
git commit -m "feat: [docs] scaffold docs/user/ via writing-user-docs skill"
```

---

### Task 2: 撰寫 prose — install-setup（zh-TW + en）

**Files:**
- Modify: `docs/user/zh-TW/index.md`
- Modify: `docs/user/zh-TW/index.html`
- Modify: `docs/user/en/index.md`
- Modify: `docs/user/en/index.html`

**Brief**：本節回答「我如何首次安裝並執行 SpecBook？」。

必含要點：
- 系統需求：Node.js >= 20、pnpm（或 npm/yarn）
- 安裝：`pnpm add -D specbook`
- 初始化（在目標專案根目錄）：`npx specbook init`
- `init` 會做什麼：偵測 package.json、寫 `.specbook/specbook.config.ts`、產出 5 章 placeholder 內容
- 第一次預覽：`npx specbook dev`

- [ ] **Step 1: 寫 zh-TW md**

開啟 `docs/user/zh-TW/index.md`，找到 `<!-- doc-key: install-setup -->` 區塊，把 placeholder 段落（通常是 `> Replace this paragraph with ...` 或範例文字）取代為符合上述要點的繁體中文 prose。保留 doc-key marker 與 H2 標題不變。

範例段落骨架（請依實際語氣調整）：
```markdown
<!-- doc-key: install-setup -->
## 安裝與啟動

SpecBook 是 npm package，需要 **Node.js 20+** 與 pnpm（或 npm、yarn）。

在你的專案根目錄安裝：

\`\`\`bash
pnpm add -D specbook
\`\`\`

接著執行初始化，SpecBook 會偵測 `package.json`、寫入 `.specbook/specbook.config.ts`，並產生五章內容的 placeholder：

\`\`\`bash
npx specbook init
\`\`\`

確認 `.specbook/content/` 已建立，跑：

\`\`\`bash
npx specbook dev
\`\`\`

即可在 `http://localhost:5173` 預覽。
```

- [ ] **Step 2: 寫 zh-TW html**

開啟 `docs/user/zh-TW/index.html`，找到 `<!-- doc-key: install-setup -->` 區塊，撰寫**同樣內容但符合 html 風格** 的 prose（用 `<p>`、`<pre><code>` 等標籤）。**doc-key marker 與 section 順序必須與 md 完全一致。**

- [ ] **Step 3: 寫 en md**

開啟 `docs/user/en/index.md`，於 `<!-- doc-key: install-setup -->` 區塊寫對應英文 prose（同樣的要點，英文表達）。

- [ ] **Step 4: 寫 en html**

開啟 `docs/user/en/index.html`，於同一 doc-key 區塊寫英文 prose（html 形式）。

- [ ] **Step 5: 跑 validator**

Run:
```bash
pnpm docs:check
```
Expected: pass。若失敗，依錯誤訊息修正（最常見是 md/html 順序不一致）。

- [ ] **Step 6: Commit**

```bash
git add docs/user/
git commit -m "docs: [user] write install-setup prose (zh-TW + en)"
```

---

### Task 3: 撰寫 prose — discovery-read

**Files:** 同 Task 2，僅 doc-key 不同。

**Brief**：本節回答「我如何在不改變狀態下檢查 / 探索？」。

必含要點：
- `npx specbook validate` — 對 `.specbook/content/` 跑 schema 驗證
- `npx specbook gaps` — 偵測尚未填寫的 placeholder 章節
- 兩者 exit code 行為（CI 友善）

- [ ] **Step 1: 寫 zh-TW md** — 同 Task 2 步驟模式
- [ ] **Step 2: 寫 zh-TW html**
- [ ] **Step 3: 寫 en md**
- [ ] **Step 4: 寫 en html**
- [ ] **Step 5: 跑 `pnpm docs:check`**，pass 才往下
- [ ] **Step 6: Commit**

```bash
git add docs/user/
git commit -m "docs: [user] write discovery-read prose (zh-TW + en)"
```

---

### Task 4: 撰寫 prose — writes-mutations

**Brief**：本節回答「我如何安全地改變狀態？」。

必含要點：
- `npx specbook init`（含 `--force` 旗標的影響）
- `npx specbook build` — 產出 `dist/` 靜態站
- `npx specbook export` — 匯出 client-facing spec md + html
- 失敗時 SpecBook 不留下半完成狀態（atomic write）

- [ ] **Step 1: 寫 zh-TW md**
- [ ] **Step 2: 寫 zh-TW html**
- [ ] **Step 3: 寫 en md**
- [ ] **Step 4: 寫 en html**
- [ ] **Step 5: 跑 `pnpm docs:check`**
- [ ] **Step 6: Commit**

```bash
git add docs/user/
git commit -m "docs: [user] write writes-mutations prose (zh-TW + en)"
```

---

### Task 5: 撰寫 prose — advanced-tools

**Brief**：本節回答「有什麼進階／power-user 命令？」。

必含要點：
- `.specbook/specbook.config.ts` 的可調設定（如 `locale`、`base`、`title`）
- `specbook build --base /repo/` — GitHub Pages 子路徑部署
- `specbook export --formats md,html` 與 `-o` 自訂輸出目錄
- 自訂 i18n 字串（提示有 zh-TW / en 兩 locale）

- [ ] **Step 1: 寫 zh-TW md**
- [ ] **Step 2: 寫 zh-TW html**
- [ ] **Step 3: 寫 en md**
- [ ] **Step 4: 寫 en html**
- [ ] **Step 5: 跑 `pnpm docs:check`**
- [ ] **Step 6: Commit**

```bash
git add docs/user/
git commit -m "docs: [user] write advanced-tools prose (zh-TW + en)"
```

---

### Task 6: 撰寫 prose — diagnostics-recovery

**Brief**：本節回答「出問題時要怎麼處理？」。

必含要點：
- `specbook validate` 失敗時的常見錯誤訊息與修正方向（schema mismatch、缺檔）
- `specbook gaps` 偵測 placeholder 的用途
- 重新 scaffold 的安全做法（`init --force` 的風險）
- 報 bug 的入口（GitHub issues URL）

- [ ] **Step 1: 寫 zh-TW md**
- [ ] **Step 2: 寫 zh-TW html**
- [ ] **Step 3: 寫 en md**
- [ ] **Step 4: 寫 en html**
- [ ] **Step 5: 跑 `pnpm docs:check`**
- [ ] **Step 6: Commit**

```bash
git add docs/user/
git commit -m "docs: [user] write diagnostics-recovery prose (zh-TW + en)"
```

---

### Task 7: 撰寫 prose — ai-integration

**Brief**：本節回答「AI agent 應該怎麼使用 SpecBook？」。

必含要點：
- `AGENTS.md` 的存在與用途（Antigravity Protocol、設計系統依賴 `DESIGN.md`）
- SpecBook content 都是 markdown + frontmatter，AI 容易讀寫
- 推薦 AI workflow：`validate` → `gaps` → 編輯 → `validate`
- 在 Claude Code 環境下可搭配 superpowers skills

- [ ] **Step 1: 寫 zh-TW md**
- [ ] **Step 2: 寫 zh-TW html**
- [ ] **Step 3: 寫 en md**
- [ ] **Step 4: 寫 en html**
- [ ] **Step 5: 跑 `pnpm docs:check`**
- [ ] **Step 6: Commit**

```bash
git add docs/user/
git commit -m "docs: [user] write ai-integration prose (zh-TW + en)"
```

---

### Task 8: 撰寫 prose — visual-surfaces

**Brief**：本節回答「有哪些 UI / HTML / dashboard 輸出？」。

必含要點：
- `specbook dev` 預覽（PaperTech 設計系統）
- `specbook build` 產出 `dist/`（單頁靜態站，可丟 Netlify / Vercel / GitHub Pages）
- `specbook export` 產出 client-facing spec md + html
- 設計系統參考：`DESIGN.md`（PaperTech / Vector-inspired）

- [ ] **Step 1: 寫 zh-TW md**
- [ ] **Step 2: 寫 zh-TW html**
- [ ] **Step 3: 寫 en md**
- [ ] **Step 4: 寫 en html**
- [ ] **Step 5: 跑 `pnpm docs:check`**
- [ ] **Step 6: Commit**

```bash
git add docs/user/
git commit -m "docs: [user] write visual-surfaces prose (zh-TW + en)"
```

---

### Task 9: 撰寫 prose — documentation-maintenance

**Brief**：本節回答「這份文件如何保持誠實？」。內容描述 doc-key contract 本身。

必含要點：
- `docs/user/<locale>/{index.md,index.html}` 雙格式並存的設計
- `<!-- doc-key: X -->` marker 用途
- `pnpm docs:check` 驗證流程（uniqueness、order、locale parity）
- 加新 section 的工作流：兩個 locale × 兩個格式 + `requiredDocKeys` 一次提交
- 提及未來會以 `specbook docs validate` 取代（dogfood roadmap，spec §9 A′）

- [ ] **Step 1: 寫 zh-TW md**
- [ ] **Step 2: 寫 zh-TW html**
- [ ] **Step 3: 寫 en md**
- [ ] **Step 4: 寫 en html**
- [ ] **Step 5: 跑 `pnpm docs:check`**
- [ ] **Step 6: Commit**

```bash
git add docs/user/
git commit -m "docs: [user] write documentation-maintenance prose (zh-TW + en)"
```

---

### Task 10: 撰寫 overview（每份檔案開頭的 doc-key=overview 區塊）

**Brief**：每份檔案最上方的 `<!-- doc-key: overview -->` 區塊。Skill scaffold 已塞入 tagline 與 placeholder；本任務替換成正式介紹。

必含要點：
- SpecBook 是什麼（一句話）
- 解決的痛點（README 資訊密度低、Notion/Docusaurus 設定昂貴）
- 5 章固定結構（Overview, Tech Stack, Architecture, User Stories, Roadmap）
- 受眾（軟體專案團隊、技術負責人）

- [ ] **Step 1: 寫 zh-TW md overview**
- [ ] **Step 2: 寫 zh-TW html overview**
- [ ] **Step 3: 寫 en md overview**
- [ ] **Step 4: 寫 en html overview**
- [ ] **Step 5: 跑 `pnpm docs:check`**
- [ ] **Step 6: Commit**

```bash
git add docs/user/
git commit -m "docs: [user] write overview prose (zh-TW + en)"
```

---

### Task 11: 全域驗證與打包檢查

- [ ] **Step 1: 再跑一次 docs:check**

Run:
```bash
pnpm docs:check
```
Expected: 0 exit，所有 doc-key 對齊、無重複、locale parity OK。

- [ ] **Step 2: 跑既有測試確認沒打壞**

Run:
```bash
pnpm test
```
Expected: 既有 145 個測試全綠（A 階段不動 src/ 不應改變測試行為）。

- [ ] **Step 3: 跑 packaging smoke**

Run:
```bash
pnpm pack:check
```
Expected: 命令成功；確認 `docs/user/` **不在** package files 清單（因為 `package.json` 的 `files` 欄位只含 `dist`、`skill`、`README.md`、`LICENSE`）。若意外被包入，回去檢查 `package.json` 並修正。

- [ ] **Step 4: 視覺校對（手工）**

開啟 `docs/user/zh-TW/index.html` 在瀏覽器，目視確認：
- 主題色為 anthropic-warm（橘 `#D97757`）
- sidebar 顯示所有 8 章節 + overview
- 段落字體、間距無破版

英文版同上。

- [ ] **Step 5: 最終 commit（若 Step 1–4 都通過、無新檔案）**

若前面九個 task 已 commit 完所有 prose，本步驟通常**不需**新 commit。若 Step 4 視覺校對發現小修正，commit 後再進下一步：

```bash
git add docs/user/
git commit -m "docs: [user] polish prose after visual review"
```

- [ ] **Step 6: Push / 開 PR（按專案 workflow）**

依 release workflow 決定是否單獨 PR 或併入下個 release。Plan A 範圍止於此；Plan B 為獨立 PR。

---

## Notes / 易踩雷區

1. **doc-key marker 不能刪、不能改大小寫**。Validator 用正則 `/<!--\s*doc-key:\s*([a-z0-9-]+)\s*-->/g` 精確抓取。
2. **md/html 兩格式 section 順序必須一致**。一個側修改一定要同步另一個。
3. **兩個 locale 必須同步**。Validator 會檢查 locale 之間共享同一 doc-key 集；只動一個 locale 會 fail。
4. **prose 內容可以有差異**，但 doc-key marker、section 標題的概念、相對位置必須對齊。
5. Skill scaffold 用的 anthropic-warm theme 已內嵌在產出的 html `<style>`；不要把 `<style>` 區塊砍掉。
6. **bun 是執行 scaffold 的硬性依賴**（一次性）；後續維護 prose 只需要 node + pnpm。
