import type { TechStack, TechLayer, TechItem } from '../schema/tech-stack.js'
import { TECH_STACK_MAP } from './tech-stack-map.js'

export interface PackageJsonLike {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export function deriveTechStack(pkg: PackageJsonLike): TechStack {
  const all: Record<string, string> = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  }
  const grouped = new Map<string, TechItem[]>()
  for (const [name, version] of Object.entries(all)) {
    const entry = TECH_STACK_MAP[name]
    if (!entry) continue
    const items = grouped.get(entry.layer) ?? []
    items.push({ name, version, role: entry.role })
    grouped.set(entry.layer, items)
  }
  const layers: TechLayer[] = []
  for (const [layer, items] of grouped) {
    layers.push({ layer, items })
  }
  return layers
}
