export type Severity = 'error' | 'warn' | 'info'

export type Category =
  | 'environment'
  | 'project'
  | 'content'
  | 'optional-deps'
  | 'docs-user'

export interface DoctorFinding {
  id: string
  severity: Severity
  category: Category
  title: string
  detail?: string
  hint?: string
}

export interface DoctorReport {
  ok: boolean
  findings: DoctorFinding[]
  meta: {
    nodeVersion: string
    cwd: string
    specbookRoot: string
    durationMs: number
  }
}

export interface RunDoctorInput {
  root?: string
}

export interface ExecutionContext {
  specbookRoot: string
  projectRoot: string
  nodeVersion: string
  cwd: string
}
