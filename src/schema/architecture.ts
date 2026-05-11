import { z } from 'zod'

export const FlowStepSchema = z.object({
  actor: z.string().min(1).optional(),
  action: z.string().min(1, 'step.action 不可為空'),
  outcome: z.string().min(1).optional(),
  branches: z
    .array(
      z.object({
        label: z.string().min(1, 'branch.label 不可為空'),
        action: z.string().min(1, 'branch.action 不可為空'),
        outcome: z.string().optional(),
      })
    )
    .optional(),
})

export const FlowSchema = z.object({
  name: z.string().min(1, 'flow.name 不可為空'),
  description: z.string().min(1).optional(),
  steps: z.array(FlowStepSchema).min(1, 'flow.steps 至少需要一個 step'),
})

export const ArchitectureSchema = z
  .object({
    diagram: z.enum(['mermaid', 'image', 'none']),
    image: z.string().optional(),
    body: z.string().min(1, 'architecture body 不可為空'),
    flows: z.array(FlowSchema).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.diagram === 'image' && !val.image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'diagram=image 時必須提供 image 路徑',
        path: ['image'],
      })
    }
  })

export type FlowStep = z.infer<typeof FlowStepSchema>
export type Flow = z.infer<typeof FlowSchema>
export type Architecture = z.infer<typeof ArchitectureSchema>
