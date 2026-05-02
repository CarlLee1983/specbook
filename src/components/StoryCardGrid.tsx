import type { UserStories } from '../schema/user-stories.js'

interface Props {
  stories: UserStories
  chapterLabel: string
  heading: string
  labels: { as: string; soThat: string }
}

export function StoryCardGrid({ stories, chapterLabel, heading, labels }: Props) {
  return (
    <section id="user-stories">
      <div className="chapter-num">— {chapterLabel} —</div>
      <h2 className="serif">{heading}</h2>
      <div className="story-grid">
        {stories.map((s, i) => (
          <div className="story-card" key={i}>
            <span className={`priority ${s.priority}`}>{s.priority.toUpperCase()}</span>
            <div className="as-block">
              <div className="as">{labels.as}</div>
              <div className="role-name">{s.as}</div>
            </div>
            <div className="want">{s.want}</div>
            <div className="so-that">
              {s.soThat}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
