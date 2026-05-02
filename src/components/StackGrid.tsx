import type { TechStack } from '../schema/tech-stack.js'

interface Props {
  data: TechStack
  chapterLabel: string
  heading: string
}

export function StackGrid({ data, chapterLabel, heading }: Props) {
  return (
    <section id="tech-stack">
      <div className="chapter-num">— {chapterLabel} —</div>
      <h2 className="serif">{heading}</h2>
      {data.map((layer) => (
        <div key={layer.layer}>
          <div className="layer-label">{layer.layer}</div>
          <div className="stack-grid">
            {layer.items.map((item) => (
              <div className="tech-card" key={item.name}>
                <div className="name">
                  <span className="tech-icon">{item.icon ? item.icon : item.name.charAt(0)}</span>
                  {item.name}
                  {item.version && <span className="version">{item.version}</span>}
                </div>
                <div className="role">{item.role}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
