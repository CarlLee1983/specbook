const DOC_KEY_RE = /<!--\s*doc-key:\s*([a-z0-9-]+)\s*-->/g
const FORMAT_RE = /^[a-z0-9-]+$/

export function parseDocKeys(content: string): string[] {
  const keys: string[] = []
  for (const m of content.matchAll(DOC_KEY_RE)) {
    keys.push(m[1]!)
  }
  return keys
}

export function findDuplicates(keys: readonly string[]): string[] {
  const seen = new Set<string>()
  const dups = new Set<string>()
  for (const k of keys) {
    if (seen.has(k)) dups.add(k)
    else seen.add(k)
  }
  return [...dups]
}

export function isValidDocKeyFormat(s: string): boolean {
  return s.length > 0 && FORMAT_RE.test(s)
}

export type OrderResult =
  | { ok: true }
  | {
      ok: false
      position: number
      left: string | undefined
      right: string | undefined
    }

export function ordersMatch(
  left: readonly string[],
  right: readonly string[],
): OrderResult {
  const max = Math.max(left.length, right.length)
  for (let i = 0; i < max; i++) {
    if (left[i] !== right[i]) {
      return { ok: false, position: i, left: left[i], right: right[i] }
    }
  }
  return { ok: true }
}
