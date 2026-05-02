import type { Roadmap, MilestoneStatus } from '../schema/roadmap.js'

interface Props {
  roadmap: Roadmap
  chapterLabel: string
  heading: string
  statusLabels: Record<MilestoneStatus, string>
}

export function Timeline({ roadmap, chapterLabel, heading, statusLabels }: Props) {
  return (
    <section id="roadmap">
      <div className="chapter-num">— {chapterLabel} —</div>
      <h2 className="serif">{heading}</h2>
      <div className="timeline">
        {roadmap.map((m, i) => (
          <div className={`milestone ${m.status}`} key={i}>
            <div className="milestone-header">
              <div className="milestone-title">{m.title}</div>
              {m.quarter && <span className="milestone-quarter">{m.quarter}</span>}
              <span className="milestone-status">{statusLabels[m.status]}</span>
            </div>
            {m.items.length > 0 && (
              <ul>
                {m.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
