import { createJiti } from 'jiti'
import { dirname, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SpecBookConfigSchema, type SpecBookConfig } from '../schema/config.js'

export async function loadConfig(configPath: string): Promise<SpecBookConfig> {
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    alias: {
      specbook: resolveSelfEntry(),
    },
  })
  const mod: unknown = await jiti.import(configPath)
  const raw = isModuleWithDefault(mod) ? mod.default : mod
  return SpecBookConfigSchema.parse(raw)
}

function isModuleWithDefault(mod: unknown): mod is { default: unknown } {
  return typeof mod === 'object' && mod !== null && 'default' in mod
}

function resolveSelfEntry(): string {
  const modulePath = import.meta.url.startsWith('file:')
    ? fileURLToPath(import.meta.url)
    : import.meta.url
  const baseDir = dirname(modulePath)
  const builtEntry = resolve(baseDir, '../index.js')
  if (existsSync(builtEntry)) return builtEntry
  return resolve(baseDir, '../index.ts')
}
