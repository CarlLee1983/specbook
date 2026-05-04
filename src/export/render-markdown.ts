import type { SpecBookData } from '../content/load-all.js'
import { buildDocumentOutline } from './document-outline.js'

export function renderDocumentMarkdown(data: SpecBookData): string {
  const outline = buildDocumentOutline(data)
  const lines: string[] = [
    `# ${outline.cover.title}`,
    '',
    `- 文件版本：${outline.cover.version}`,
    `- 對象：${outline.cover.audience}`,
    `- 保密等級：${outline.cover.confidentiality}`,
    '',
  ]

  for (const section of outline.sections) {
    lines.push(`## ${section.heading}`, '', section.body, '')
  }

  return lines.join('\n').trimEnd() + '\n'
}
