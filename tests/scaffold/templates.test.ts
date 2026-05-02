import { describe, it, expect } from 'vitest'
import {
  renderConfigTemplate,
  renderOverviewTemplate,
  renderArchitectureTemplate,
  renderUserStoriesTemplate,
  renderRoadmapTemplate,
} from '../../src/scaffold/templates.js'
import { parse as parseYaml } from 'yaml'
import matter from 'gray-matter'
import { OverviewSchema } from '../../src/schema/overview.js'
import { ArchitectureSchema } from '../../src/schema/architecture.js'
import { UserStoriesSchema } from '../../src/schema/user-stories.js'
import { RoadmapSchema } from '../../src/schema/roadmap.js'

describe('templates', () => {
  describe('renderConfigTemplate', () => {
    it('注入 name + description', () => {
      const out = renderConfigTemplate({ name: 'TaskFlow', description: 'desc' })
      expect(out).toContain("name: 'TaskFlow'")
      expect(out).toContain("description: 'desc'")
      expect(out).toContain('export default')
      expect(out).not.toContain('defineConfig')
    })

    it('description 缺省時不寫該欄位', () => {
      const out = renderConfigTemplate({ name: 'X' })
      expect(out).not.toContain('description:')
    })
  })

  describe('renderOverviewTemplate', () => {
    it('產生符合 OverviewSchema 的 md', () => {
      const md = renderOverviewTemplate({ name: 'TaskFlow' })
      const { data, content } = matter(md)
      const parsed = OverviewSchema.parse({
        tagline: data.tagline,
        title: 'TaskFlow',
        body: content.replace(/^#.+$/m, '').trim(),
      })
      expect(parsed.tagline.length).toBeGreaterThan(0)
      expect(parsed.title).toBe('TaskFlow')
      expect(parsed.body.length).toBeGreaterThan(0)
    })
  })

  describe('renderArchitectureTemplate', () => {
    it('產生符合 ArchitectureSchema 的 md', () => {
      const md = renderArchitectureTemplate()
      const { data, content } = matter(md)
      const parsed = ArchitectureSchema.parse({
        diagram: data.diagram,
        image: data.image,
        body: content.trim(),
      })
      expect(parsed.diagram).toBe('none')
      expect(parsed.body.length).toBeGreaterThan(0)
    })
  })

  describe('renderUserStoriesTemplate', () => {
    it('產生符合 UserStoriesSchema 的 yaml', () => {
      const yaml = renderUserStoriesTemplate()
      const obj = parseYaml(yaml)
      expect(() => UserStoriesSchema.parse(obj)).not.toThrow()
    })
  })

  describe('renderRoadmapTemplate', () => {
    it('產生符合 RoadmapSchema 的 yaml', () => {
      const yaml = renderRoadmapTemplate()
      const obj = parseYaml(yaml)
      expect(() => RoadmapSchema.parse(obj)).not.toThrow()
    })
  })
})
