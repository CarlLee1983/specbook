export type Section = 'overview' | 'architecture' | 'user-stories' | 'roadmap'
export type Severity = 'warn' | 'info'
export type Scope = 'section' | 'item'

export interface EnhanceItem {
  id: string
  section: Section
  severity: Severity
  scope: Scope
  file: string
  path?: string
  problem: string
  prompt: string
}

export interface EnhanceReport {
  ok: boolean
  items: EnhanceItem[]
  meta: {
    specbookRoot: string
    durationMs: number
    schemaVersion: 1
  }
}
