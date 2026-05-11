import type { Architecture, Flow } from '../schema/architecture.js'

interface Props {
  architecture: Architecture
  chapterLabel: string
  heading: string
}

export function ArchitectureBlock({ architecture, chapterLabel, heading }: Props) {
  const flows = architecture.flows ?? []
  const hasFlows = flows.length > 0

  return (
    <section id="architecture">
      <div className="chapter-num">— {chapterLabel} —</div>
      <h2 className="serif">{heading}</h2>

      {!hasFlows && architecture.diagram === 'image' && architecture.image && (
        <div className="diagram">
          <img
            src={architecture.image}
            alt="Architecture diagram"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      )}

      {!hasFlows && architecture.diagram === 'mermaid' && (
        <div
          className="diagram mermaid-host"
          dangerouslySetInnerHTML={{ __html: architecture.body }}
        />
      )}

      {!hasFlows && architecture.diagram === 'none' && (
        <div className="prose">{architecture.body}</div>
      )}

      {hasFlows && <FlowList flows={flows} />}
    </section>
  )
}

function FlowList({ flows }: { flows: Flow[] }) {
  return (
    <div className="flow-list">
      {flows.map((flow) => (
        <article className="flow" key={flow.name}>
          <h3 className="flow-name serif">{flow.name}</h3>
          {flow.description && <p className="flow-desc">{flow.description}</p>}
          <ol className="flow-steps">
            {flow.steps.map((step, idx) => (
              <li key={`${flow.name}-${idx}`} className={step.branches ? 'is-decision' : ''}>
                <div className="flow-step-num">{step.branches ? '?' : idx + 1}</div>
                <div className="flow-step-body">
                  {step.actor && <span className="flow-actor">{step.actor}</span>}
                  <p className="flow-action">{step.action}</p>
                  {step.outcome && <p className="flow-outcome">{step.outcome}</p>}

                  {step.branches && (
                    <div className="flow-branches">
                      {step.branches.map((branch, bIdx) => (
                        <div className="branch" key={bIdx}>
                          <span className="branch-label">{branch.label}</span>
                          <div className="branch-content">
                            <p className="flow-action">{branch.action}</p>
                            {branch.outcome && <p className="flow-outcome">{branch.outcome}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  )
}
