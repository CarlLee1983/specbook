import type { SpecBookData } from '../content/load-all.js'
import type { Flow } from '../schema/architecture.js'
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
    if (section.flows && section.flows.length > 0) {
      for (const flow of section.flows) {
        lines.push(...renderFlowMarkdown(flow), '')
      }
    }
  }

  return lines.join('\n').trimEnd() + '\n'
}

function renderFlowMarkdown(flow: Flow): string[] {
  const lines: string[] = [`### ${flow.name}`, '']
  if (flow.description) {
    lines.push(flow.description, '')
  }
  flow.steps.forEach((step, idx) => {
    lines.push(`${idx + 1}. **${step.actor}** — ${step.action}`)
    if (step.outcome) {
      lines.push(`   - 結果：${step.outcome}`)
    }
  })
  return lines
}
