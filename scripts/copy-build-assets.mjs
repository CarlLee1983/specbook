import { cp, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceStyles = resolve(repoRoot, 'src/styles')
const outputStyles = resolve(repoRoot, 'dist/styles')

await mkdir(outputStyles, { recursive: true })
await cp(sourceStyles, outputStyles, { recursive: true })
