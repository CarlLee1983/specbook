import { z } from 'zod'

export const ArchitectureSchema = z
  .object({
    diagram: z.enum(['mermaid', 'image', 'none']),
    image: z.string().optional(),
    body: z.string().min(1, 'architecture body 不可為空'),
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

export type Architecture = z.infer<typeof ArchitectureSchema>
