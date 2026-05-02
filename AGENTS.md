# SpecBook Agent Instructions

> 本文件為 AI 代理人（Agents）的操作指南。任何參與此專案開發的 Agent 必須遵循以下準則，以確保系統架構、程式碼品質與視覺風格的一致性。
>
> **載入路徑**：Claude Code 透過 `CLAUDE.md → AGENTS.md` 載入；其他 Agent（Gemini、Codex 等）直接讀取本檔。請勿在 `CLAUDE.md` 撰寫規範，所有專案規則集中於此。
>
> **優先序**：本檔規則優先於使用者全域規則，但低於對話中使用者的明確指令。

## 1. Antigravity Protocol (架構-實作分離)

本專案採用「架構師-開發者」分離模式。在執行任何任務前，請判斷目前所處階段：

- **Phase 1: The Architect (架構師)**
  - **觸發點**（符合任一即進入此階段）：
    - 新功能開發或新增模組
    - 跨 3 個以上檔案的修改
    - 修改 `src/schema/` 或公開型別
    - 重構既有架構或設計模式
  - **行為**：深入思考「為什麼」與「做什麼」。產出逐步實作計畫（Plan），包含 Pseudo-code 或架構邏輯。先取得使用者核准再進入 Phase 2。
- **Phase 2: The Builder (開發者)**
  - **觸發點**：計畫已核准、或針對特定 bug/指令進行單點修正。
  - **行為**：精準、高效地執行計畫。撰寫符合生產環境要求的程式碼，並執行驗證指令。

## 2. 視覺風格與 UI 規範 (Mandatory UI Standards)

**絕對禁止在沒有參考 `DESIGN.md` 的情況下修改或新增 UI 元件。**

- **設計系統**：**PaperTech** (Vector-inspired)。
- **核心哲學**：暖色系、資訊高密度、專業技術文檔感（類似高品質白皮書）。
- **關鍵原則**：
  - 暖色基調 + 深色文字 + 單一強調色。
  - 間距嚴格遵守 4px 網格系統。
  - 邊框統一 1px 細線。
- **權威來源**：所有色票、字體、間距等具體數值以 `DESIGN.md` 為準。修改 UI 前必先閱讀 `DESIGN.md`，並避免在本檔複製具體 token 值（防止文件不同步）。

## 3. 工程標準 (Engineering Standards)

- **型別安全**：全面使用 TypeScript。嚴禁使用 `any`；當型別未知時優先使用 `unknown` 並透過 narrowing 處理。僅在測試或特殊邊界且加註理由時可豁免。
- **資料驗證**：所有外部輸入（md, yaml, config）必須通過 `src/schema/` 下的 **Zod Schema** 驗證。
- **Schema 連動**：修改 `src/schema/` 時必同步更新對應測試與 `tests/fixtures/` 範例資料。
- **測試驅動 (TDD)**：實作功能前，必須先建立測試（Red Phase），驗證失敗後再進行開發（Green Phase）。
- **驗證流程**：修改代碼後，必須執行 `pnpm test` 並確認 100% 通過。

## 4. 操作工作流 (Workflow)

遵循 **Research -> Strategy -> Execution** 循環：

1.  **Research**：以程式碼搜尋與檔案讀取掃描既有模式（各 Agent 自行對應其工具）。
2.  **Strategy**：提出簡明扼要的計畫。
3.  **Execution**：
    - **Plan**：定義單次修改範圍。
    - **Act**：執行修改。
    - **Validate**：執行 `pnpm test` 與 Lint，確認全數通過。

## 5. 語境效率 (Context Efficiency)

- 盡可能合併工具呼叫（如平行搜尋）。
- 讀檔時指定行號或範圍，避免載入無關段落。
- 專注於任務目標，避免不相關的重構。
