import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writeScaffold, ScaffoldFile } from '../../src/scaffold/write-scaffold.js'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-write-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const files: ScaffoldFile[] = [
  { kind: 'config', path: 'specbook.config.ts', content: 'CONFIG' },
  { kind: 'overview', path: 'content/overview.md', content: 'OV' },
  { kind: 'tech-stack', path: 'content/tech-stack.yaml', content: 'TS' },
]

describe('writeScaffold', () => {
  it('檔案不存在 → created', () => {
    const r = writeScaffold(dir, files)
    expect(r.find((x) => x.kind === 'config')!.action).toBe('created')
    expect(readFileSync(join(dir, 'specbook.config.ts'), 'utf-8')).toBe('CONFIG')
    expect(existsSync(join(dir, 'content/overview.md'))).toBe(true)
  })

  it('檔案已有非空內容 → kept', () => {
    writeFileSync(join(dir, 'specbook.config.ts'), 'EXISTING')
    const r = writeScaffold(dir, files)
    expect(r.find((x) => x.kind === 'config')!.action).toBe('kept')
    expect(readFileSync(join(dir, 'specbook.config.ts'), 'utf-8')).toBe('EXISTING')
  })

  it('檔案存在但為空 → 視為缺檔，會寫入', () => {
    const path = join(dir, 'content/overview.md')
    mkdirSync(join(dir, 'content'), { recursive: true })
    writeFileSync(path, '')
    writeScaffold(dir, files)
    expect(readFileSync(path, 'utf-8')).toBe('OV')
  })

  it('--force 覆寫既有非空檔案', () => {
    writeFileSync(join(dir, 'specbook.config.ts'), 'EXISTING')
    const r = writeScaffold(dir, files, { force: true })
    expect(r.find((x) => x.kind === 'config')!.action).toBe('overwritten')
    expect(readFileSync(join(dir, 'specbook.config.ts'), 'utf-8')).toBe('CONFIG')
  })

  it('--only 只處理指定 kind', () => {
    const r = writeScaffold(dir, files, { only: ['overview'] })
    expect(r.find((x) => x.kind === 'overview')!.action).toBe('created')
    expect(existsSync(join(dir, 'specbook.config.ts'))).toBe(false)
    expect(existsSync(join(dir, 'content/tech-stack.yaml'))).toBe(false)
  })

  it('自動建立中介資料夾', () => {
    writeScaffold(dir, files)
    expect(existsSync(join(dir, 'content'))).toBe(true)
  })
})
