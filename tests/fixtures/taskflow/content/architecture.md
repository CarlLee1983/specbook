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

三層：UI → 本機儲存 → 雲端同步。

```mermaid
graph TD
  U[使用者] --> R[React]
```
