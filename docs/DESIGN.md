# SpecBook Design Tokens

> 這份文件是元件實作對齊用的單一來源。Spec 文件不寫色彩細節；DESIGN.md 才是。

## 顏色

| Token | 預設值 | 用途 |
|---|---|---|
| `--color-bg` | `#fafaf9` | 頁面背景（紙感暖白） |
| `--color-surface` | `#ffffff` | 卡片底 |
| `--color-text` | `#1c1917` | 主要文字 |
| `--color-text-soft` | `#57534e` | 次要文字 / lead |
| `--color-text-mute` | `#a8a29e` | 章節編號 / TOC inactive |
| `--color-border` | `#e7e5e4` | 卡片邊、章節分隔線 |
| `--color-accent` | `#4f46e5` | 強調色（可由 config 覆寫） |
| `--color-accent-soft` | `#eef2ff` | 強調色 wash |
| `--color-code-bg` | `#f5f5f4` | inline code 背景 |
| `--color-status-done` | `#16a34a` | Roadmap done 節點 |
| `--color-status-active` | `#d97706` | Roadmap active 節點 |
| `--color-status-future` | `#9ca3af` | Roadmap future 節點 |

## 字級階層

| Token | 大小 | 用途 |
|---|---|---|
| Hero `h1` | 76px / 1.05 | overview 標題 |
| Section `h2` | 40px / 1.2 | 各章標題 |
| Tagline | 22px / 1.5 | overview 副題 |
| Body | 15-18px / 1.65-1.78 | 散文內文 |
| Card title | 15-17px / 600 | 卡片標題 |
| Label / chapter num | 11-13px / uppercase / 0.12-0.15 letter-spacing | 章節編號、層級標 |

## 字型 stack

```css
--font-sans: -apple-system, system-ui, "Helvetica Neue", "PingFang TC", "Microsoft JhengHei", sans-serif;
--font-serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Source Serif Pro", Georgia, serif;
--font-mono: "JetBrains Mono", "SF Mono", Menlo, monospace;
```

序號（章節編號）用 serif italic；大標題用 serif；內文用 sans；版本號 / quarter / footer 用 mono。

## 間距

- 章節間：`padding: 80px 0`（< 900px 縮為 56px）
- Layout 左右 padding：48px（mobile 24px）
- 卡片 padding：20-24px
- Layout grid 主欄 + 220px TOC，gap 64px

## 圓角 / 陰影

- 卡片：`border-radius: 10px`
- inline code：`border-radius: 3-4px`
- card hover：`box-shadow: 0 4px 12px rgba(79, 70, 229, 0.06)`、`translateY(-1px)`
- active milestone 節點外光暈：`box-shadow: 0 0 0 4px #fef3c7`

## 元件視覺規格

### HeroSection
- 章節編號（serif italic, mute）
- H1 serif, 76px
- Tagline 22px soft
- Problem 區塊：3px accent 左邊框 + italic + soft

### StackGrid
- `layer-label` 11px uppercase mute，做分組
- 卡片 3 欄；hover 加 accent 邊與輕陰影
- `tech-icon`：22px 方塊，accent-soft 底，accent 字色

### ArchitectureBlock
- Diagram 區塊：surface 底 + border + 40px padding
- mermaid SVG 內嵌（build-time 渲染）；image 模式用 `<img>` 自適應寬度

### StoryCardGrid
- 2 欄；priority 角標右上：p0 紅、p1 琥珀、p2 灰
- "身為" / "以便" 11px uppercase mute，內容 15px text

### Timeline
- 左側 12px 圓點 + 2px 連線
- done 綠實心、active 琥珀+光暈、future 灰圈
- header：title (17/600) + quarter (mono mute) + status pill

### TocSidebar
- 220px 寬，sticky top
- inactive 13px mute、active accent + 8px 圓點
- 點擊：smooth scroll；scroll：scrollspy 切換 active

## 狀態（hover / active / disabled）

- 卡片 hover：上抬 1px、accent 邊
- TOC li hover：v1 不加底線，保持 simple
- 連結（v1 內無連結）

## 深色模式（v1 不啟用）

預留 `[data-theme="dark"]` token 對應表，v2 開放。

## Mermaid 主題

mermaid-isomorphic 預設主題。v2 再覆寫成自家主題（accent 對齊 spec 的 accent）。

## 未來進度

- 字型自訂（v2）
- 元件覆寫（v2，要 eject）
- 主題切換（v2）
