import { defineConfig } from '../../src/index.js'

export default defineConfig({
  project: {
    name: 'TaskFlow',
    description: '同步至雲端的極簡待辦工具',
    url: 'https://taskflow.dev',
  },
  document: {
    version: 'v1.2.0',
    audience: 'Internal Stakeholders',
    confidentiality: 'confidential',
  },
  theme: {
    accent: '#D97757', // PaperTech Terracotta orange
    locale: 'zh-TW',
  },
})
