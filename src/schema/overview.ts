import { z } from 'zod'

export const OverviewSchema = z.object({
  tagline: z.string().min(1, 'tagline 不可為空'),
  title: z.string().min(1, 'title 不可為空'),
  body: z.string().min(1, 'overview body 不可為空'),
})

export type Overview = z.infer<typeof OverviewSchema>
