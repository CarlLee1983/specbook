import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { walkTree } from '../../src/scaffold/walk-tree.js'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sb-walk-'))
  mkdirSync(join(dir, 'src/components'), { recursive: true })
  writeFileSync(join(dir, 'src/components/A.tsx'), 'x')
  writeFileSync(join(dir, 'src/index.ts'), 'x')
  writeFileSync(join(dir, 'package.json'), '{}')
  mkdirSync(join(dir, 'node_modules/foo'), { recursive: true })
  writeFileSync(join(dir, 'node_modules/foo/index.js'), 'x')
  mkdirSync(join(dir, '.git'), { recursive: true })
  writeFileSync(join(dir, '.git/HEAD'), 'x')
  mkdirSync(join(dir, 'dist'), { recursive: true })
  writeFileSync(join(dir, 'dist/out.js'), 'x')
  mkdirSync(join(dir, 'a/b/c/d'), { recursive: true }) // depth 4 — d 不應出現
  writeFileSync(join(dir, 'a/b/c/d/deep.txt'), 'x')
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('walkTree', () => {
  it('回傳相對路徑、不含預設忽略目錄', () => {
    const list = walkTree(dir)
    expect(list).toContain('package.json')
    expect(list).toContain('src/index.ts')
    expect(list).toContain('src/components/A.tsx')
    expect(list.find((p) => p.startsWith('node_modules'))).toBeUndefined()
    expect(list.find((p) => p.startsWith('.git'))).toBeUndefined()
    expect(list.find((p) => p.startsWith('dist'))).toBeUndefined()
  })

  it('預設深度 3：a/b/c/d/deep.txt 不應入列', () => {
    const list = walkTree(dir)
    expect(list.find((p) => p.includes('deep.txt'))).toBeUndefined()
  })

  it('支援 maxDepth 覆寫', () => {
    const list = walkTree(dir, { maxDepth: 5 })
    expect(list.find((p) => p.endsWith('deep.txt'))).toBeDefined()
  })

  it('回傳依字典序排序', () => {
    const list = walkTree(dir)
    const sorted = [...list].sort()
    expect(list).toEqual(sorted)
  })
})
