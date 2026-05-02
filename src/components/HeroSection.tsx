import type { Overview } from '../schema/overview.js'

interface Props {
  overview: Overview
  chapterLabel: string
}

export function HeroSection({ overview, chapterLabel }: Props) {
  return (
    <section id="overview" className="hero">
      <div className="chapter-num">— {chapterLabel} —</div>
      <h1 className="serif">{overview.title}</h1>
      <p className="tagline">{overview.tagline}</p>
      <div className="problem">{overview.body}</div>
    </section>
  )
}
