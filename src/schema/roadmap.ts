import { z } from 'zod'

export const MilestoneStatusSchema = z.enum(['done', 'active', 'future'])

export const MilestoneSchema = z.object({
  title: z.string().min(1),
  quarter: z.string().optional(),
  status: MilestoneStatusSchema,
  items: z.array(z.string().min(1)).optional().default([]),
})

export const RoadmapSchema = z.array(MilestoneSchema).min(1)

export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>
export type Milestone = z.infer<typeof MilestoneSchema>
export type Roadmap = z.infer<typeof RoadmapSchema>
