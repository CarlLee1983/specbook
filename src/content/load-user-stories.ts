import { readFile } from 'node:fs/promises'
import { parse as parseYaml } from 'yaml'
import { UserStoriesSchema, type UserStories } from '../schema/user-stories.js'

export async function loadUserStories(filePath: string): Promise<UserStories> {
  const raw = await readFile(filePath, 'utf-8')
  const data = parseYaml(raw)
  return UserStoriesSchema.parse(data)
}
