# SpecBook Design System: PaperTech

> This document defines the visual language and design philosophy of SpecBook (PaperTech). It serves as the single source of truth for component implementation and style alignment.

## 1. Design Philosophy

**PaperTech** aims to bridge the gap between "Decision Makers" and "AI Agents." Inspired by modern technical white papers and high-quality developer tools, the design conveys a **"Warm, Professional, and Information-Dense"** digital document feel.

- **Professional Density**: Employs high-information density layouts, using thin lines (1px) and subtle background elevations (Surface vs. Background) to distinguish sections.
- **Warm & Organic**: Eschews cold black-and-green schemes in favor of warm beige, espresso brown, and terracotta orange, reducing visual fatigue during long reading sessions of specifications.
- **Technical Precision**: Uses Monospace fonts for navigation and technical terminology to emphasize the rigor of the specification.

## 2. Color System

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#F9F5F1` | Page Background (Paper-like warm beige) |
| `--color-surface` | `#FFFFFF` | Card surface color |
| `--color-text` | `#2D2621` | Primary text (Deep espresso) |
| `--color-text-soft` | `#635C55` | Secondary text / Descriptions |
| `--color-text-mute` | `#8C847D` | Tertiary text / Disabled states |
| `--color-border` | `#E5E0DA` | Borders and dividers |
| `--color-accent` | `#D97757` | Accent color (Terracotta orange) |
| `--color-accent-soft` | `#F9EBE6` | Faded accent (for backgrounds) |
| `--color-code-bg` | `#F0EDE8` | Code / Label background |
| `--color-status-done` | `#4A7C59` | Completed status |
| `--color-status-active` | `#D97757` | In-progress status |
| `--color-status-error` | `#E64833` | Error / P0 Priority |

## 3. Typography

### Font Stack
- **Sans (Primary)**: `'Outfit'`, `'Inter'`, system-ui, sans-serif
- **Serif (Headings)**: `"Iowan Old Style"`, `"Palatino Linotype"`, Palatino, Georgia, serif
- **Mono (Technical)**: `'JetBrains Mono'`, `'Roboto Mono'`, monospace

### Hierarchy
- **Hero H1**: 64px / 1.1 (Serif)
- **Section H2**: 32px / 1.2 (Serif)
- **Tagline**: 20px / 1.5 (Sans)
- **Body**: 14px / 1.6 (Sans) - *High-density baseline*
- **Label**: 10px / Uppercase (Mono)

## 4. Layout & Spacing

- **Units**: Based on a 4px grid system.
- **Borders**: Uniform use of 1px solid or dashed lines to enhance the professional white paper aesthetic.
- **Border Radius**: `--border-radius: 6px`, providing a modern yet gentle visual feel.
- **Spacing**:
  * Between sections: `64px` (Desktop) / `48px` (Mobile)
  * Side padding: `40px` (Desktop) / `20px` (Mobile)

## 5. Component Specs

### HeroSection
- **Section Numbers**: Mono 11px, Uppercase, Mute color.
- **Problem Statement**: 2px accent left border, Italic, 16px soft color.

### StackGrid
- **Cards**: 1px border, 6px border radius.
- **Tech Icon**: 22px square, `accent-soft` background, `accent` foreground color.

### StoryCardGrid (Structured Table)
- **Layout**: Desktop uses a 3-column Grid (100px / 1fr / 2fr), simulating a structured table.
- **Priority Badges**: P0 (white text on red), P1 (white text on orange), P2 (gray background).
- **SoThat Block**: Separated by a 1px solid line on the left to enhance reading rhythm.

### Timeline
- **Axis**: 1px thickness.
- **Nodes**: 10px dots; Active state includes a glow of the same color.

### TocSidebar
- **Navigation Items**: Mono 12px, Mute color.
- **Active State**: Bold (700) + 1px accent underline.

## 6. States & Interactions

- **Hover**: Cards lift slightly by 1px + border changes to `accent`.
- **Transitions**: Subtle opacity fade-in to simulate turning a page.

---

_Note: This document is updated as the design system evolves and serves as the single source of truth for implementation._
