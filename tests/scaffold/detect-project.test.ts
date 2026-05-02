import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectProject } from '../../src/scaffold/detect-project.js'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-detect-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('detectProject', () => {
  it('讀取 package.json 的 name 與 description', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'taskflow',
        description: '同步至雲端的極簡待辦工具',
        dependencies: { react: '^19.0.0' },
      }),
    )
    const r = detectProject(dir)
    expect(r.name).toBe('taskflow')
    expect(r.description).toBe('同步至雲端的極簡待辦工具')
    expect(r.packageJson?.dependencies?.react).toBe('^19.0.0')
  })

  it('讀取 README（取前 4KB）', () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}')
    writeFileSync(join(dir, 'README.md'), '# Hello\n\nThis is taskflow.')
    const r = detectProject(dir)
    expect(r.readme).toContain('# Hello')
    expect(r.readme).toContain('taskflow')
  })

  it('readme 大檔被截斷', () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}')
    writeFileSync(join(dir, 'README.md'), 'a'.repeat(20000))
    const r = detectProject(dir)
    expect(r.readme!.length).toBeLessThanOrEqual(4096)
  })

  it('找不到 README 時回傳 null', () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}')
    const r = detectProject(dir)
    expect(r.readme).toBeNull()
  })

  it('框架偵測：react / next / hono', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'x',
        dependencies: { react: '^19', next: '^15', hono: '^4' },
      }),
    )
    const r = detectProject(dir)
    expect(r.frameworks).toContain('react')
    expect(r.frameworks).toContain('next')
    expect(r.frameworks).toContain('hono')
  })

  it('沒 package.json 時 name fallback 到資料夾名', () => {
    const r = detectProject(dir)
    expect(r.name).toBe(dir.split('/').pop())
    expect(r.packageJson).toBeNull()
  })
})
