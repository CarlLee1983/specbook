import { z } from 'zod'

export const THEMES = ['anthropic-warm'] as const
export type Theme = (typeof THEMES)[number]

const LOCALE_RE = /^[a-z]{2}(-[A-Z]{2})?$/
const KEBAB_RE = /^[a-z0-9-]+$/

export const DocsUserSchema = z.object({
  enabled: z.boolean().default(false),
  locales: z
    .array(z.string().regex(LOCALE_RE, 'locale must be like "en" or "zh-TW"'))
    .min(1, 'at least one locale required'),
  theme: z.enum(THEMES).default('anthropic-warm'),
  coverage: z
    .union([z.literal('all'), z.array(z.string().regex(KEBAB_RE)).min(1)])
    .default('all'),
})

export type DocsUserConfig = z.infer<typeof DocsUserSchema>

export const DocsSchema = z.object({
  user: DocsUserSchema.optional(),
})

export type DocsConfig = z.infer<typeof DocsSchema>
