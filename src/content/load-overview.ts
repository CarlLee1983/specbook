import { OverviewSchema, type Overview } from '../schema/overview.js'
import { readMarkdownFile, extractFirstH1 } from './frontmatter.js'

export async function loadOverview(filePath: string): Promise<Overview> {
  const { data, content } = await readMarkdownFile(filePath)
  const { title, rest } = extractFirstH1(content)
  return OverviewSchema.parse({
    tagline: data.tagline,
    title,
    body: rest,
  })
}
