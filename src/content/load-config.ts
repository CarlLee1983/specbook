import { createJiti } from 'jiti'
import { resolve } from 'node:path'
import { SpecBookConfigSchema, type SpecBookConfig } from '../schema/config.js'

export async function loadConfig(configPath: string): Promise<SpecBookConfig> {
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    alias: {
      specbook: resolve(process.cwd(), 'src/index.ts'),
    },
  })
  const mod: unknown = await jiti.import(configPath)
  const raw = isModuleWithDefault(mod) ? mod.default : mod
  return SpecBookConfigSchema.parse(raw)
}

function isModuleWithDefault(mod: unknown): mod is { default: unknown } {
  return typeof mod === 'object' && mod !== null && 'default' in mod
}
