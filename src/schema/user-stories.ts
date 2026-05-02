import { z } from 'zod'

export const PrioritySchema = z.enum(['p0', 'p1', 'p2'])

export const UserStorySchema = z.object({
  as: z.string().min(1),
  want: z.string().min(1),
  soThat: z.string().min(1),
  priority: PrioritySchema.default('p1'),
})

export const UserStoriesSchema = z.array(UserStorySchema).min(1)

export type Priority = z.infer<typeof PrioritySchema>
export type UserStory = z.infer<typeof UserStorySchema>
export type UserStories = z.infer<typeof UserStoriesSchema>
