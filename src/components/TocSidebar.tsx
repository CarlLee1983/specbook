import type { Strings } from '../i18n/index.js'
import type { SpecBookConfig } from '../schema/config.js'

interface Props {
  strings: Strings
  sections: SpecBookConfig['sections']['order']
}

export function TocSidebar({ strings, sections }: Props) {
  return (
    <aside className="toc">
      <div className="toc-label">{strings.toc}</div>
      <ul className="toc-list" data-toc="">
        {sections.map((s, i) => (
          <li key={s} data-toc-target={s}>
            {String(i + 1).padStart(2, '0')} · {strings.chapters[s]}
          </li>
        ))}
      </ul>
    </aside>
  )
}
