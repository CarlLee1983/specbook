import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { runInitCli } from '../../src/cli/init.js'
import { runValidate } from '../../src/cli/validate.js'

const FIXTURE = resolve(__dirname, '../fixtures/fresh-project')

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-skill-init-'))
  cpSync(FIXTURE, dir, { recursive: true })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('skill init flow (mechanical sim)', () => {
  it('init → 模擬 LLM 寫 overview + architecture → validate 通過', async () => {
    // Step 1: mechanical
    const init = await runInitCli({ root: dir })
    expect(init.exitCode).toBe(0)

    // Step 2: simulate LLM filling overview + architecture
    const overview = [
      '---',
      'tagline: 用 React 起手的小型示範專案',
      '---',
      '',
      '# fresh-project',
      '',
      'fresh-project 是一個小型 React 應用，展示 SpecBook 在最小',
      '專案上的 init 流程：你只要有 package.json + README，',
      'specbook init 就能拉起一份可閱讀的 spec 草稿。',
      '',
    ].join('\n')
    writeFileSync(join(dir, '.specbook/content/overview.md'), overview)

    const arch = [
      '---',
      'diagram: none',
      '---',
      '',
      '本專案是一個單頁 React 應用，沒有後端；所有狀態存在記憶體',
      '與瀏覽器中。Build 由 Vite 處理；測試走 Vitest。',
      '',
    ].join('\n')
    writeFileSync(join(dir, '.specbook/content/architecture.md'), arch)

    // Step 3: validate
    const v = await runValidate(join(dir, '.specbook'))
    expect(v.errors).toEqual([])
    expect(v.ok).toBe(true)
  })
})
