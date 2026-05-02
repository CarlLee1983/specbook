import type { SpecBookData } from '../content/load-all.js'
import { getStrings } from '../i18n/index.js'
import { HeroSection } from './HeroSection.js'
import { StackGrid } from './StackGrid.js'
import { ArchitectureBlock } from './ArchitectureBlock.js'
import { StoryCardGrid } from './StoryCardGrid.js'
import { Timeline } from './Timeline.js'
import { Layout } from './Layout.js'
import { TocSidebar } from './TocSidebar.js'

interface Props {
  data: SpecBookData
}

export function SpecBookPage({ data }: Props) {
  const { config, overview, techStack, architecture, userStories, roadmap } = data
  const strings = getStrings(config.theme.locale)
  const visibleOrder = config.sections.order.filter(
    (s) => !config.sections.hide.includes(s)
  )

  const labelOf = (s: typeof visibleOrder[number]) => {
    const idx = visibleOrder.indexOf(s)
    return `Chapter ${String(idx + 1).padStart(2, '0')} / ${strings.chapters[s]}`
  }

  const renderSection = (s: typeof visibleOrder[number]) => {
    switch (s) {
      case 'overview':
        return <HeroSection key={s} overview={overview} chapterLabel={labelOf(s)} />
      case 'tech-stack':
        return (
          <StackGrid
            key={s}
            data={techStack}
            chapterLabel={labelOf(s)}
            heading={strings.chapters['tech-stack']}
          />
        )
      case 'architecture':
        return (
          <ArchitectureBlock
            key={s}
            architecture={architecture}
            chapterLabel={labelOf(s)}
            heading={strings.chapters.architecture}
          />
        )
      case 'user-stories':
        return (
          <StoryCardGrid
            key={s}
            stories={userStories}
            chapterLabel={labelOf(s)}
            heading={strings.chapters['user-stories']}
            labels={{ as: strings.labels.as, soThat: strings.labels.soThat }}
          />
        )
      case 'roadmap':
        return (
          <Timeline
            key={s}
            roadmap={roadmap}
            chapterLabel={labelOf(s)}
            heading={strings.chapters.roadmap}
            statusLabels={strings.statuses}
          />
        )
    }
  }

  return (
    <Layout
      accent={config.theme.accent}
      toc={<TocSidebar strings={strings} sections={visibleOrder} />}
      footerText={`${strings.footer} · npx specbook build`}
    >
      {visibleOrder.map(renderSection)}
    </Layout>
  )
}
