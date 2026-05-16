import { detectEnhanceItems } from '../enhance/detect.js'

export type GapSection = 'overview' | 'architecture' | 'user-stories' | 'roadmap'

export interface Gap {
  section: GapSection
  reason: string
}

export interface GapReport {
  gaps: Gap[]
  ok: boolean
}

export async function detectGaps(specbookRoot: string): Promise<GapReport> {
  let report
  try {
    report = await detectEnhanceItems(specbookRoot)
  } catch {
    return { gaps: [], ok: true }
  }
  const gaps: Gap[] = report.items
    .filter((i) => i.scope === 'section' && i.id.startsWith('placeholder.'))
    .map((i) => ({ section: i.section as GapSection, reason: i.problem }))
  return { gaps, ok: gaps.length === 0 }
}
