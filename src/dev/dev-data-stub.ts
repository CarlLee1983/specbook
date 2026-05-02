// 過渡用：Task 23 寫完 Vite plugin 後刪掉
import { loadAll } from '../content/load-all.js'
import { resolve } from 'node:path'

export const examplesData = await loadAll(
  resolve(process.cwd(), 'examples/taskflow')
)
