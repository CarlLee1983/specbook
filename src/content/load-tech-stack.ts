import { readFile } from 'node:fs/promises'
import { parse as parseYaml } from 'yaml'
import { TechStackSchema, type TechStack } from '../schema/tech-stack.js'

export async function loadTechStack(filePath: string): Promise<TechStack> {
  const raw = await readFile(filePath, 'utf-8')
  const data = parseYaml(raw)
  return TechStackSchema.parse(data)
}
