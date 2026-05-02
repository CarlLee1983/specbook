import { z } from 'zod'

export const SectionNameSchema = z.enum([
  'overview',
  'tech-stack',
  'architecture',
  'user-stories',
  'roadmap',
])

const DEFAULT_ORDER: z.infer<typeof SectionNameSchema>[] = [
  'overview',
  'tech-stack',
  'architecture',
  'user-stories',
  'roadmap',
]

export const SpecBookConfigSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    url: z.string().url().optional(),
    favicon: z.string().optional(),
    ogImage: z.string().optional(),
  }),
  theme: z
    .object({
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#4f46e5'),
      mode: z.enum(['light', 'auto']).default('light'),
      locale: z.enum(['zh-TW', 'en']).default('zh-TW'),
    })
    .prefault({}),
  sections: z
    .object({
      order: z.array(SectionNameSchema).default(DEFAULT_ORDER),
      hide: z.array(SectionNameSchema).default([]),
    })
    .prefault({}),
})

export type SpecBookConfig = z.infer<typeof SpecBookConfigSchema>

export function defineConfig(cfg: z.input<typeof SpecBookConfigSchema>): SpecBookConfig {
  return SpecBookConfigSchema.parse(cfg)
}
