export interface ConfigTemplateInput {
  name: string
  description?: string
}

export function renderConfigTemplate(input: ConfigTemplateInput): string {
  const lines: string[] = [
    "import { defineConfig } from 'specbook'",
    '',
    'export default defineConfig({',
    '  project: {',
    `    name: ${quote(input.name)},`,
  ]
  if (input.description) lines.push(`    description: ${quote(input.description)},`)
  lines.push('  },')
  lines.push('})')
  lines.push('')
  return lines.join('\n')
}

export interface OverviewTemplateInput {
  name: string
}

export function renderOverviewTemplate(input: OverviewTemplateInput): string {
  return [
    '---',
    'tagline: 一句話描述這個專案要解決什麼問題',
    '---',
    '',
    `# ${input.name}`,
    '',
    '在這裡寫一段 1-3 段的散文，說明專案要解決的問題、',
    '為什麼這個問題重要、以及為什麼這個方案是合適的。',
    '這段文字會以 hero 區呈現在 SpecBook 站首屏。',
    '',
  ].join('\n')
}

export function renderArchitectureTemplate(): string {
  return [
    '---',
    'diagram: none',
    '---',
    '',
    '在這裡描述系統的整體架構：有哪幾層、彼此如何通訊、',
    '資料怎麼流動。如果有 mermaid 圖請把 frontmatter 的 diagram',
    "改成 'mermaid' 並在下面附上 ```mermaid 區塊；",
    "若有外部圖片請改成 'image' 並設定 image: ./assets/...。",
    '',
  ].join('\n')
}

export function renderUserStoriesTemplate(): string {
  return [
    '# 在這裡列出你的 user stories；建議用 /specbook enhance 互動補完',
    '- as: 主要使用者角色',
    '  want: 想做什麼',
    '  soThat: 達成什麼成果',
    '  priority: p0',
    '- as: 次要使用者',
    '  want: 想做什麼',
    '  soThat: 達成什麼',
    '  priority: p1',
    '- as: 第三類使用者',
    '  want: 想做什麼',
    '  soThat: 達成什麼',
    '  priority: p2',
    '',
  ].join('\n')
}

export function renderRoadmapTemplate(): string {
  return [
    '# Roadmap：用 done / active / future 標記里程碑狀態',
    '- title: M1 — 起手',
    '  quarter: 2026 Q1',
    '  status: active',
    '  items:',
    '    - 第一個工作項',
    '    - 第二個工作項',
    '',
  ].join('\n')
}

function quote(s: string): string {
  if (s.includes("'")) return JSON.stringify(s)
  return `'${s}'`
}
