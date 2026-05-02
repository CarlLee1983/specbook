import { readFile } from 'node:fs/promises'
import matter from 'gray-matter'

export async function readMarkdownFile(filePath: string): Promise<{
  data: Record<string, unknown>
  content: string
}> {
  const raw = await readFile(filePath, 'utf-8')
  const parsed = matter(raw)
  return { data: parsed.data ?? {}, content: parsed.content.trim() }
}

export function extractFirstH1(body: string): { title: string; rest: string } {
  const lines = body.split('\n')
  const idx = lines.findIndex((l) => /^#\s+/.test(l))
  if (idx === -1) return { title: '', rest: body }
  const title = lines[idx]!.replace(/^#\s+/, '').trim()
  const rest = [...lines.slice(0, idx), ...lines.slice(idx + 1)]
    .join('\n')
    .trim()
  return { title, rest }
}
