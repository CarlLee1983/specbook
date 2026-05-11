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
