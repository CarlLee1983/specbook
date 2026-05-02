import { readFile } from 'node:fs/promises'
import { parse as parseYaml } from 'yaml'
import { RoadmapSchema, type Roadmap } from '../schema/roadmap.js'

export async function loadRoadmap(filePath: string): Promise<Roadmap> {
  const raw = await readFile(filePath, 'utf-8')
  const data = parseYaml(raw)
  return RoadmapSchema.parse(data)
}
