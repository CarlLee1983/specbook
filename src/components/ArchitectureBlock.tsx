import type { Architecture } from '../schema/architecture.js'

interface Props {
  architecture: Architecture
  chapterLabel: string
  heading: string
}

export function ArchitectureBlock({ architecture, chapterLabel, heading }: Props) {
  return (
    <section id="architecture">
      <div className="chapter-num">— {chapterLabel} —</div>
      <h2 className="serif">{heading}</h2>

      {architecture.diagram === 'image' && architecture.image && (
        <div className="diagram">
          <img
            src={architecture.image}
            alt="Architecture diagram"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      )}

      {architecture.diagram === 'mermaid' && (
        <div
          className="diagram mermaid-host"
          dangerouslySetInnerHTML={{ __html: architecture.body }}
        />
      )}

      {architecture.diagram === 'none' && (
        <div className="prose">{architecture.body}</div>
      )}
    </section>
  )
}
