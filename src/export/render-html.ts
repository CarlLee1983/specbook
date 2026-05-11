import type { SpecBookData } from '../content/load-all.js'
import type { Flow } from '../schema/architecture.js'
import { buildDocumentOutline } from './document-outline.js'

export function renderDocumentHtml(data: SpecBookData): string {
  const outline = buildDocumentOutline(data)

  const sections = outline.sections
    .map((section) => {
      const bodyHtml = renderSectionBody(stripMermaid(section.body))
      const flowsHtml =
        section.flows && section.flows.length > 0 ? renderFlows(section.flows) : ''
      return `
    <section class="section" id="${section.id}" data-section="${section.id}">
      <h2>${escapeHtml(section.heading)}</h2>
      ${bodyHtml}
      ${flowsHtml}
    </section>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="${escapeHtml(data.config.theme.locale)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(outline.cover.title)}</title>
  <style>
    :root {
      --bg: #f9f5f1;
      --surface: #ffffff;
      --text: #2d2621;
      --text-soft: #635c55;
      --border: #e5e0da;
      --accent: #d97757;
      --accent-soft: #f9ebe6;
      --radius: 6px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.6 Inter, system-ui, sans-serif;
    }
    main.document {
      max-width: 960px;
      margin: 0 auto;
      padding: 40px 24px 72px;
    }
    header.cover {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 32px;
      box-shadow: 0 1px 0 rgba(45, 38, 33, 0.02);
    }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--accent);
      font: 600 11px/1.2 ui-monospace, SFMono-Regular, monospace;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font: 600 40px/1.15 Georgia, "Times New Roman", serif;
    }
    .subtitle {
      margin: 12px 0 0;
      color: var(--text-soft);
      max-width: 72ch;
    }
    .meta {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
    }
    .meta dl { margin: 0; }
    .meta dt {
      color: var(--text-soft);
      font: 600 10px/1.2 ui-monospace, SFMono-Regular, monospace;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .meta dd {
      margin: 4px 0 0;
      font: 600 14px/1.4 Inter, system-ui, sans-serif;
    }
    .section {
      margin-top: 24px;
      padding: 24px 0 0;
      border-top: 1px solid var(--border);
    }
    .section h2 {
      margin: 0 0 12px;
      font: 600 28px/1.2 Georgia, "Times New Roman", serif;
    }
    .section p,
    .section li {
      color: var(--text);
    }
    .section ul {
      margin: 0;
      padding-left: 20px;
    }
    .section li + li {
      margin-top: 8px;
    }
    .block + .block {
      margin-top: 16px;
    }
    .block p {
      margin: 0;
    }
    .flow {
      margin-top: 16px;
      padding: 20px 24px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .flow + .flow {
      margin-top: 12px;
    }
    .flow h3 {
      margin: 0;
      font: 600 18px/1.3 Georgia, "Times New Roman", serif;
    }
    .flow .flow-desc {
      margin: 6px 0 0;
      color: var(--text-soft);
    }
    .flow-steps {
      list-style: none;
      counter-reset: flow-step;
      margin: 16px 0 0;
      padding: 0;
    }
    .flow-steps > li {
      counter-increment: flow-step;
      display: grid;
      grid-template-columns: 28px 1fr;
      column-gap: 12px;
      padding: 12px 0;
      border-top: 1px solid var(--border);
    }
    .flow-steps > li:first-child {
      border-top: 0;
      padding-top: 4px;
    }
    .flow-steps > li::before {
      content: counter(flow-step);
      align-self: start;
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font: 600 11px/24px ui-monospace, SFMono-Regular, monospace;
      text-align: center;
    }
    .flow-actor {
      display: inline-block;
      padding: 2px 8px;
      margin-bottom: 4px;
      background: var(--accent-soft);
      color: var(--accent);
      border-radius: 999px;
      font: 600 11px/1.4 ui-monospace, SFMono-Regular, monospace;
      letter-spacing: 0.04em;
    }
    .flow-action {
      margin: 0;
      font-weight: 500;
    }
    .flow-outcome {
      margin: 4px 0 0;
      color: var(--text-soft);
      font-size: 13px;
    }
  </style>
</head>
<body>
  <main class="document">
    <header class="cover">
      <p class="eyebrow">System Specification</p>
      <h1>${escapeHtml(outline.cover.title)}</h1>
      <p class="subtitle">${escapeHtml(outline.cover.subtitle)}</p>
      <div class="meta">
        <dl><dt>Version</dt><dd>${escapeHtml(outline.cover.version)}</dd></dl>
        <dl><dt>Audience</dt><dd>${escapeHtml(outline.cover.audience)}</dd></dl>
        <dl><dt>Confidentiality</dt><dd>${escapeHtml(outline.cover.confidentiality)}</dd></dl>
      </div>
    </header>
${sections}
  </main>
</body>
</html>`
}

function renderSectionBody(body: string): string {
  const blocks = body.trim().split(/\n\s*\n/g)
  const rendered = blocks.map((block) => {
    const lines = block.split('\n')
    const listItems = lines.filter((line) => line.startsWith('- '))
    if (listItems.length === lines.length) {
      const items = listItems.map((line) => `<li>${escapeHtml(line.slice(2).trim())}</li>`).join('')
      return `<ul>${items}</ul>`
    }

    const paragraphs = lines
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join('')
    return `<div class="block">${paragraphs}</div>`
  })

  return rendered.join('\n')
}

function stripMermaid(body: string): string {
  return body.replace(/```mermaid[\s\S]*?```\s*/g, '').trim()
}

function renderFlows(flows: Flow[]): string {
  return flows
    .map((flow) => {
      const desc = flow.description
        ? `<p class="flow-desc">${escapeHtml(flow.description)}</p>`
        : ''
      const steps = flow.steps
        .map((step) => {
          const outcome = step.outcome
            ? `<p class="flow-outcome">${escapeHtml(step.outcome)}</p>`
            : ''
          return `<li>
            <div>
              <span class="flow-actor">${escapeHtml(step.actor)}</span>
              <p class="flow-action">${escapeHtml(step.action)}</p>
              ${outcome}
            </div>
          </li>`
        })
        .join('\n')
      return `<article class="flow">
        <h3>${escapeHtml(flow.name)}</h3>
        ${desc}
        <ol class="flow-steps">${steps}</ol>
      </article>`
    })
    .join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
