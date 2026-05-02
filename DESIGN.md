# SpecBook Design System: PaperTech

> 本文件定義 SpecBook 的視覺語彙與設計哲學（PaperTech）。這是元件實作與樣式對齊的單一來源。

## 1. 設計哲學 (Design Philosophy)

**PaperTech** 旨在縮短「決策者」與「AI 代理人」之間的距離。設計風格基準為現代技術白皮書與高品質開發者工具，傳遞 **「溫暖、專業、資訊高密度」** 的數位文檔感。

- **專業密度 (Professional Density)**：採用高資訊密度排版，透過細線 (1px) 與細微的背景層級（Surface vs Background）區分章節。
- **有機暖色 (Warm & Organic)**：捨棄冷色系的黑綠配色，改用暖米色、濃縮咖啡棕與陶土橘，減少閱讀長篇規格書時的視覺疲勞。
- **技術精準 (Technical Precision)**：導覽與技術術語採用等寬字體 (Monospace)，強調規格書的嚴謹性。

## 2. 顏色系統 (Colors)

| Token | 值 | 用途 |
|---|---|---|
| `--color-bg` | `#F9F5F1` | 頁面背景（紙感暖米） |
| `--color-surface` | `#FFFFFF` | 卡片底色 |
| `--color-text` | `#2D2621` | 主要文字（深咖啡） |
| `--color-text-soft` | `#635C55` | 次要文字 / 說明文 |
| `--color-text-mute` | `#8C847D` | 輔助文字 / 禁用狀態 |
| `--color-border` | `#E5E0DA` | 邊框、分隔線 |
| `--color-accent` | `#D97757` | 強調色（陶土橘） |
| `--color-accent-soft` | `#F9EBE6` | 強調色洗白（背景用） |
| `--color-code-bg` | `#F0EDE8` | 程式碼 / 標籤背景 |
| `--color-status-done` | `#4A7C59` | 完成狀態 |
| `--color-status-active` | `#D97757` | 進行中狀態 |
| `--color-status-error` | `#E64833` | 錯誤 / P0 優先級 |

## 3. 字體與排版 (Typography)

### 字型 Stack
- **Sans (主要)**：`'Outfit'`, `'Inter'`, system-ui, sans-serif
- **Serif (標題)**：`"Iowan Old Style"`, `"Palatino Linotype"`, Palatino, Georgia, serif
- **Mono (技術)**：`'JetBrains Mono'`, `'Roboto Mono'`, monospace

### 階層
- **Hero H1**：64px / 1.1 (Serif)
- **Section H2**：32px / 1.2 (Serif)
- **Tagline**：20px / 1.5 (Sans)
- **Body**：14px / 1.6 (Sans) - *高密度基準*
- **Label**：10px / Uppercase (Mono)

## 4. 佈局原則 (Layout & Spacing)

- **單位**：基於 4px 網格系統。
- **邊框**：統一使用 1px 實線或虛線，強化專業白皮書質感。
- **圓角**：`--border-radius: 6px`，提供現代且溫和的視覺感。
- **間距**：
  * 章節間：`64px` (Desktop) / `48px` (Mobile)
  * 左右內距：`40px` (Desktop) / `20px` (Mobile)

## 5. 元件規格 (Component Specs)

### HeroSection
- **章節編號**：Mono 11px, Uppercase, Mute 顏色。
- **問題陳述 (Problem)**：2px accent 左邊框, Italic, 16px soft 顏色。

### StackGrid
- **卡片**：1px border, 6px 圓角。
- **Tech Icon**：22px 方塊, `accent-soft` 底, `accent` 字色。

### StoryCardGrid (Structured Table)
- **佈局**：Desktop 採 3 欄 Grid（100px / 1fr / 2fr），模擬結構化表格。
- **優先級角標**：P0 紅底白字、P1 橘底白字、P2 灰底。
- **SoThat 區塊**：左側 1px 實線分隔，強化閱讀節奏。

### Timeline
- **軸線**：1px 粗細。
- **節點**：10px 圓點；Active 狀態帶有同色光暈。

### TocSidebar
- **導覽項**：Mono 12px, Mute 顏色。
- **Active 狀態**：粗體 (700) + 1px accent 下底線。

## 6. 狀態與互動 (Interactions)

- **Hover**：卡片微幅上抬 1px + 邊框轉為 `accent`。
- **轉場**：採用細微的透明度淡入 (Opacity Fade-in)，模擬翻頁感。

---

_註：此文件隨設計系統演進而更新，作為實作的單一來源。_
