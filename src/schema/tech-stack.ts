import { z } from 'zod'

export const TechItemSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
  role: z.string().min(1, 'role 不可為空'),
  icon: z.string().optional(),
})

export const TechLayerSchema = z.object({
  layer: z.string().min(1),
  items: z.array(TechItemSchema).min(1, '每層至少一個 item'),
})

export const TechStackSchema = z
  .array(TechLayerSchema)
  .min(1, '至少需要一個技術分層')

export type TechItem = z.infer<typeof TechItemSchema>
export type TechLayer = z.infer<typeof TechLayerSchema>
export type TechStack = z.infer<typeof TechStackSchema>
