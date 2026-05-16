import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { detectEnhanceItems } from '../enhance/detect.js'
import type { EnhanceReport } from '../enhance/types.js'

export interface EnhanceCliInput {
  root: string
  json: boolean
}

export interface EnhanceCliOutput {
  exitCode: number
  stdout: string
  stderr: string
}

function formatText(report: EnhanceReport): string {
  if (report.ok) return '✅ Spec 已完整，沒有可補齊項。'
  const lines = [`偵測到以下可補齊項（${report.items.length}）：`, '']
  for (const it of report.items) {
    const where = it.path ? `${it.section} › ${it.path}` : it.section
    lines.push(`  [${it.severity}] ${where}`)
    lines.push(`    ${it.problem}`)
    lines.push('    → 跑 /specbook enhance 互動補完。')
    lines.push('')
  }
  lines.push('說明：可補齊項不會擋住 specbook dev / build；JSON 模式請加 --json。')
  return lines.join('\n')
}

export async function runEnhanceCli(input: EnhanceCliInput): Promise<EnhanceCliOutput> {
  const root = resolve(input.root)
  if (!existsSync(root)) {
    return { exitCode: 2, stdout: '', stderr: `找不到 .specbook 目錄：${root}` }
  }
  try {
    const report = await detectEnhanceItems(root)
    if (input.json) {
      return { exitCode: 0, stdout: JSON.stringify(report, null, 2), stderr: '' }
    }
    return { exitCode: 0, stdout: formatText(report), stderr: '' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { exitCode: 2, stdout: '', stderr: `enhance crashed: ${msg}` }
  }
}
