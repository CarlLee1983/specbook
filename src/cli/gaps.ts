import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { detectGaps } from '../gaps/detect-gaps.js'

export interface GapsCliInput {
  root: string
  json: boolean
}

export interface GapsCliOutput {
  exitCode: number
  stdout: string
  stderr: string
}

const DEPRECATION =
  "[deprecated] 'specbook gaps' will be removed in a future release. Use 'specbook enhance' instead."

function withDeprecation(stderr: string): string {
  return stderr.length === 0 ? DEPRECATION : `${DEPRECATION}\n${stderr}`
}

export async function runGapsCli(input: GapsCliInput): Promise<GapsCliOutput> {
  const root = resolve(input.root)
  if (!existsSync(root)) {
    return {
      exitCode: 2,
      stdout: '',
      stderr: withDeprecation(`找不到 .specbook 目錄：${root}`),
    }
  }
  const report = await detectGaps(root)
  if (input.json) {
    return {
      exitCode: 0,
      stdout: JSON.stringify(report, null, 2),
      stderr: withDeprecation(''),
    }
  }
  if (report.ok) {
    return {
      exitCode: 0,
      stdout: '✅ 沒有偵測到缺口；可直接 specbook dev / build。',
      stderr: withDeprecation(''),
    }
  }
  const lines = ['偵測到以下缺口：']
  for (const g of report.gaps) lines.push(`  - [${g.section}] ${g.reason}`)
  lines.push('', '建議：跑 /specbook enhance 互動補完。')
  return {
    exitCode: 0,
    stdout: lines.join('\n'),
    stderr: withDeprecation(''),
  }
}
