const FENCE = /```mermaid\n([\s\S]*?)```/g

type MermaidRenderer = (sources: string[]) => Promise<
  Array<{ status: 'fulfilled'; value: { svg: string } } | { status: 'rejected'; reason: unknown }>
>

let renderer: MermaidRenderer | null = null

async function loadRenderer(): Promise<MermaidRenderer> {
  if (renderer) return renderer
  try {
    const mod = (await import('mermaid-isomorphic')) as {
      createMermaidRenderer: () => MermaidRenderer
    }
    renderer = mod.createMermaidRenderer()
    return renderer
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("Cannot find package 'playwright'")) {
      throw new Error(
        "Mermaid diagrams require the optional peer dependency 'playwright'. " +
          "Install it in your project (e.g. `pnpm add -D playwright`) or remove ```mermaid blocks from your architecture content."
      )
    }
    throw err
  }
}

export async function renderArchitectureBody(body: string): Promise<string> {
  const matches = [...body.matchAll(FENCE)]
  if (matches.length === 0) return body

  const r = await loadRenderer()
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
