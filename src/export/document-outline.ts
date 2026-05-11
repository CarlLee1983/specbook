import type { SpecBookData } from '../content/load-all.js'
import type { Flow } from '../schema/architecture.js'
import type { Milestone } from '../schema/roadmap.js'
import type { TechLayer } from '../schema/tech-stack.js'
import type { UserStory } from '../schema/user-stories.js'

export interface DocumentOutlineSection {
  id: string
  heading: string
  body: string
  flows?: Flow[]
}

export interface DocumentOutline {
  cover: {
    title: string
    subtitle: string
    version: string
    audience: string
    confidentiality: string
  }
  sections: DocumentOutlineSection[]
}

export function buildDocumentOutline(data: SpecBookData): DocumentOutline {
  const coverTitle = data.config.document.title ?? `${data.config.project.name} 系統規格書`
  const subtitle = data.config.project.description ?? data.overview.tagline

  return {
    cover: {
      title: coverTitle,
      subtitle,
      version: data.config.document.version,
      audience: data.config.document.audience,
      confidentiality: data.config.document.confidentiality,
    },
    sections: [
      {
        id: 'background',
        heading: '專案背景與目標',
        body: [
          data.overview.body,
          '',
          `- 產品定位：${data.overview.tagline}`,
          `- 文件目的：將結構化內容整理為可提交客戶審閱的系統規格書`,
        ].join('\n'),
      },
      {
        id: 'scope',
        heading: '範圍定義',
        body: [
          '- 本文件涵蓋目前 SpecBook 已結構化的五大面向：概述、技術選型、系統架構、使用者需求與里程碑。',
          '- 文件採用單一資料來源，便於版本控管、審閱與後續維護。',
          '- 若後續加入 API、資料表或驗收表單，可在不破壞現有模型的情況下擴充。',
        ].join('\n'),
      },
      {
        id: 'requirements',
        heading: '功能需求',
        body: formatUserStories(data.userStories),
      },
      {
        id: 'non-functional',
        heading: '非功能需求',
        body: [
          '- 即時性：新增與編輯流程應維持低摩擦，避免打斷使用者思路。',
          '- 離線可用：核心資料變更需支援暫存與稍後同步。',
          '- 一致性：結構化資料需通過 schema 驗證，避免內容與文件分歧。',
          '- 可交付性：文件輸出應保留正式版式，適合對外提交與留檔。',
        ].join('\n'),
      },
      architectureSection(data),
      {
        id: 'stack',
        heading: '技術選型',
        body: formatTechStack(data.techStack),
      },
      {
        id: 'roadmap',
        heading: '里程碑與交付',
        body: formatRoadmap(data.roadmap),
      },
      {
        id: 'acceptance',
        heading: '驗收標準',
        body: formatAcceptanceCriteria(data.userStories, data.roadmap),
      },
    ],
  }
}

function architectureSection(data: SpecBookData): DocumentOutlineSection {
  const hasFlows = (data.architecture.flows?.length ?? 0) > 0
  const bodyLines: string[] = [data.architecture.body.trim()]

  if (!hasFlows) {
    bodyLines.push(
      '',
      data.architecture.diagram === 'mermaid'
        ? '- 架構圖採 Mermaid 表達，便於在文件與網頁端共用同一份內容。'
        : '- 架構圖以靜態圖片或純文字呈現。'
    )
  }

  return {
    id: 'architecture',
    heading: '系統架構',
    body: bodyLines.join('\n'),
    flows: hasFlows ? data.architecture.flows : undefined,
  }
}

function formatUserStories(stories: UserStory[]): string {
  return stories
    .map((story) =>
      [
        `- 優先級：${priorityLabel(story.priority)}`,
        `  - 角色：${story.as}`,
        `  - 需求：${story.want}`,
        `  - 目的：${story.soThat}`,
      ].join('\n')
    )
    .join('\n\n')
}

function formatTechStack(layers: TechLayer[]): string {
  return layers
    .map((layer) => {
      const items = layer.items
        .map((item) => `  - ${item.name}${item.version ? ` ${item.version}` : ''} — ${item.role}`)
        .join('\n')
      return [`- ${layer.layer}`, items].join('\n')
    })
    .join('\n\n')
}

function formatRoadmap(roadmap: Milestone[]): string {
  return roadmap
    .map((milestone) => {
      const quarter = milestone.quarter ? `（${milestone.quarter}）` : ''
      const items = milestone.items.map((item) => `  - ${item}`).join('\n')
      return [
        `- ${milestone.title}${quarter} — ${statusLabel(milestone.status)}`,
        ...(items ? [items] : []),
      ].join('\n')
    })
    .join('\n\n')
}

function formatAcceptanceCriteria(stories: UserStory[], roadmap: Milestone[]): string {
  const p0Stories = stories.filter((story) => story.priority === 'p0')
  const activeMilestones = roadmap.filter((milestone) => milestone.status !== 'future')

  return [
    '- 主要高優先需求需可在文件中追溯到具體使用者故事。',
    ...p0Stories.map(
      (story) =>
        `- ${story.as} 的關鍵流程必須滿足「${story.want}」，並達成「${story.soThat}」。`
    ),
    ...activeMilestones.map((milestone) => `- ${milestone.title} 需有對應的交付項與狀態說明。`),
  ].join('\n')
}

function priorityLabel(priority: UserStory['priority']): string {
  return priority.toUpperCase()
}

function statusLabel(status: Milestone['status']): string {
  if (status === 'done') return '完成'
  if (status === 'active') return '進行中'
  return '規劃中'
}
