import { createJiti } from 'jiti'
import { SpecBookConfigSchema, type SpecBookConfig } from '../schema/config.js'

export async function loadConfig(configPath: string): Promise<SpecBookConfig> {
  const jiti = createJiti(import.meta.url, { interopDefault: true })
  const mod: any = await jiti.import(configPath)
  const raw = mod?.default ?? mod
  return SpecBookConfigSchema.parse(raw)
}
