import { resolvePaths } from '../content/paths.js'
import { loadOverview } from '../content/load-overview.js'
import { loadArchitecture } from '../content/load-architecture.js'
import { loadUserStories } from '../content/load-user-stories.js'
import { loadRoadmap } from '../content/load-roadmap.js'

export type GapSection = 'overview' | 'architecture' | 'user-stories' | 'roadmap'

export interface Gap {
  section: GapSection
  reason: string
}

export interface GapReport {
  gaps: Gap[]
  ok: boolean
}

const PLACEHOLDER_PATTERNS: Record<GapSection, RegExp[]> = {
  overview: [
    /在這裡寫一段 1-3 段的散文/,
    /這段文字會以 hero 區呈現在 SpecBook 站首屏/,
  ],
  architecture: [/在這裡描述系統的整體架構/],
  'user-stories': [/主要使用者角色/, /次要使用者/, /第三類使用者/],
  roadmap: [/M1\s*—\s*起手/, /第一個工作項/],
}

export async function detectGaps(specbookRoot: string): Promise<GapReport> {
  const paths = resolvePaths(specbookRoot)
  const gaps: Gap[] = []

  await checkSection('overview', () => loadOverview(paths.files.overview), (d) => d.body, gaps)
  await checkSection(
    'architecture',
    () => loadArchitecture(paths.files.architecture),
    (d) => d.body,
    gaps,
  )
  await checkSection(
    'user-stories',
    () => loadUserStories(paths.files.userStories),
    (d) => JSON.stringify(d),
    gaps,
  )
  await checkSection(
    'roadmap',
    () => loadRoadmap(paths.files.roadmap),
    (d) => JSON.stringify(d),
    gaps,
  )

  return { gaps, ok: gaps.length === 0 }
}

async function checkSection<T>(
  section: GapSection,
  load: () => Promise<T>,
  pick: (d: T) => string,
  out: Gap[],
): Promise<void> {
  let data: T
  try {
    data = await load()
  } catch (e) {
    out.push({
      section,
      reason: `無法載入：${e instanceof Error ? e.message : String(e)}`,
    })
    return
  }
  const text = pick(data)
  const hit = PLACEHOLDER_PATTERNS[section].find((re) => re.test(text))
  if (hit) {
    out.push({ section, reason: `偵測到 placeholder（${hit.source}）` })
  }
}
