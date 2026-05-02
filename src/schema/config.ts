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

export const SpecBookConfigSchema = z
  .object({
    project: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      url: z.string().url().optional(),
      favicon: z.string().optional(),
      ogImage: z.string().optional(),
    }),
    theme: z
      .object({
        accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        mode: z.enum(['light', 'auto']),
        locale: z.enum(['zh-TW', 'en']),
      })
      .partial()
      .default({}),
    sections: z
      .object({
        order: z.array(SectionNameSchema),
        hide: z.array(SectionNameSchema),
      })
      .partial()
      .default({}),
  })
  .transform((input) => ({
    ...input,
    theme: {
      accent: input.theme?.accent ?? '#4f46e5',
      mode: input.theme?.mode ?? 'light',
      locale: input.theme?.locale ?? 'zh-TW',
    },
    sections: {
      order: input.sections?.order ?? DEFAULT_ORDER,
      hide: input.sections?.hide ?? [],
    },
  }))

export type SpecBookConfig = z.infer<typeof SpecBookConfigSchema>

export function defineConfig(cfg: z.input<typeof SpecBookConfigSchema>): SpecBookConfig {
  return SpecBookConfigSchema.parse(cfg)
}
