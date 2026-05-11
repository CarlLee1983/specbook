import { ArchitectureSchema, type Architecture } from '../schema/architecture.js'
import { readMarkdownFile } from './frontmatter.js'

export async function loadArchitecture(filePath: string): Promise<Architecture> {
  const { data, content } = await readMarkdownFile(filePath)
  return ArchitectureSchema.parse({
    diagram: data.diagram ?? 'none',
    image: data.image,
    body: content,
    flows: data.flows,
  })
}
