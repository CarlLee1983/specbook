---
diagram: mermaid
flows:
  - name: 任務同步
    description: 本機與雲端的兩段式同步
    steps:
      - actor: 使用者
        action: 開啟 App
      - actor: React UI
        action: 從本機 SQLite 讀取 cached tasks
        outcome: 立即顯示離線可見內容
      - actor: Sync Service
        action: 觸發背景同步，比對 timestamp
      - actor: Cloud API
        action: 回傳 diff
      - actor: Sync Service
        action: 合併並寫回本機，通知 UI 更新
  - name: 衝突解決與離線佇列 (Complex Flow)
    description: 處理多裝置同時編輯同一任務時的邊界情況
    steps:
      - actor: 使用者 A
        action: 在飛機上（離線）修改任務標題為 "Task Alpha"
      - actor: RxDB
        action: 將變更存入本機離線佇列 (Pending Queue)
        outcome: UI 顯示「等待同步」圖示
      - actor: 使用者 B
        action: 在辦公室（連線）修改同一任務標題為 "Task Beta"
      - actor: Cloud DB
        action: "成功更新資料庫，並更新版本號 (Revision: 2)"
      - actor: 使用者 A
        action: 飛機落地，恢復網路連線
      - actor: Sync Engine
        action: 嘗試推播 Pending Queue 至雲端
      - actor: Cloud API
        action: "偵測到版本號衝突 (Rev 1 -> 2, but A sent 1)"
        outcome: "回傳 409 Conflict 與 B 的最新版本"
      - actor: Conflict Resolver
        action: 執行「最後寫入者勝 (LWW)」或「手動合併」邏輯
        outcome: 最終決定使用 B 的版本，並通知 A 同步完成
  - name: 使用者登入流程 (Decisional Flow)
    description: 處理身分驗證與同步初始化
    steps:
      - actor: 使用者
        action: 開啟 App 並點擊登入
      - actor: Supabase Auth
        action: 驗證使用者憑證
        branches:
          - label: 驗證成功
            action: 取得 Session Token
            outcome: 進入主介面並啟動同步
          - label: 驗證失敗
            action: 顯示錯誤訊息
            outcome: 留在登入頁面
      - actor: Sync Engine
        action: 檢查本機是否有舊資料
        branches:
          - label: 有舊資料
            action: 執行資料合併 (Merge)
          - label: 無資料
            action: 從雲端完整下載 (Full Sync)
---

系統架構採用 **離線優先 (Offline-first)** 模式，透過 RxDB 作為中介層，確保在任何網路環境下都能保持極速響應。

```mermaid
graph TD
  User((使用者)) --> UI[React UI / Tailwind]
  UI --> Logic[Action Handlers]
  Logic --> LocalDB[(RxDB / IndexedDB)]
  LocalDB <--> Sync[Sync Engine]
  Sync <--> Cloud[(Supabase / Postgres)]
  
  style LocalDB fill:#f9f,stroke:#333,stroke-width:2px
  style Cloud fill:#bbf,stroke:#333,stroke-width:2px
```
