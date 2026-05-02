import { defineConfig } from '../../src/schema/config.js'

export default defineConfig({
  project: {
    name: 'TaskFlow',
    description: '同步至雲端的極簡待辦工具',
  },
  theme: { accent: '#4f46e5', locale: 'zh-TW' },
})
