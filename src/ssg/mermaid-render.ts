import { createMermaidRenderer } from 'mermaid-isomorphic'

const FENCE = /```mermaid\n([\s\S]*?)```/g

let renderer: ReturnType<typeof createMermaidRenderer> | null = null

function getRenderer() {
  if (!renderer) renderer = createMermaidRenderer()
  return renderer
}

export async function renderArchitectureBody(body: string): Promise<string> {
  const matches = [...body.matchAll(FENCE)]
  if (matches.length === 0) return body

  const r = getRenderer()
  const sources = matches.map((m) => m[1]!.trim())
  const results = await r(sources)

  let out = body
  results.forEach((res, i) => {
    const original = matches[i]![0]
    if (res.status === 'fulfilled') {
      out = out.replace(original, res.value.svg)
    } else {
      const reason = String(res.reason ?? 'unknown')
      out = out.replace(
        original,
        `<pre class="mermaid-error" style="color:#b91c1c;background:#fee2e2;padding:12px;border-radius:6px">mermaid render failed: ${escapeHtml(reason)}</pre>`
      )
    }
  })
  return out
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
