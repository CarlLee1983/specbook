export interface TechStackMapEntry {
  layer: string
  role: string
}

export const TECH_STACK_MAP: Record<string, TechStackMapEntry> = {
  // Frontend
  react: { layer: 'Frontend', role: 'UI 元件框架' },
  'react-dom': { layer: 'Frontend', role: 'React DOM 渲染器' },
  next: { layer: 'Frontend', role: 'React 全端框架' },
  vue: { layer: 'Frontend', role: 'UI 元件框架' },
  nuxt: { layer: 'Frontend', role: 'Vue 全端框架' },
  svelte: { layer: 'Frontend', role: 'UI 元件框架' },
  '@sveltejs/kit': { layer: 'Frontend', role: 'Svelte 全端框架' },
  solid: { layer: 'Frontend', role: 'UI 元件框架' },
  preact: { layer: 'Frontend', role: '輕量 React 替代' },

  // Styling
  tailwindcss: { layer: 'Frontend', role: '原子化樣式系統' },
  '@tailwindcss/vite': { layer: 'Frontend', role: 'Tailwind 的 Vite 整合' },
  sass: { layer: 'Frontend', role: 'CSS 預處理器' },
  'styled-components': { layer: 'Frontend', role: 'CSS-in-JS' },

  // Backend
  express: { layer: 'Backend', role: 'Node.js HTTP 框架' },
  hono: { layer: 'Backend', role: 'Edge-friendly HTTP 框架' },
  fastify: { layer: 'Backend', role: '高效能 HTTP 框架' },
  koa: { layer: 'Backend', role: 'Node.js 中介層框架' },
  '@nestjs/core': { layer: 'Backend', role: '企業級 Node 框架' },

  // Backend & Data
  prisma: { layer: 'Backend & Data', role: 'TypeScript ORM' },
  'drizzle-orm': { layer: 'Backend & Data', role: '輕量 SQL ORM' },
  '@supabase/supabase-js': { layer: 'Backend & Data', role: 'Supabase 用戶端' },
  mongoose: { layer: 'Backend & Data', role: 'MongoDB ODM' },
  redis: { layer: 'Backend & Data', role: 'Redis 用戶端' },
  ioredis: { layer: 'Backend & Data', role: 'Redis 用戶端' },
  pg: { layer: 'Backend & Data', role: 'PostgreSQL 驅動' },
  dexie: { layer: 'Backend & Data', role: 'IndexedDB wrapper' },

  // Tooling
  vite: { layer: 'Tooling', role: 'Build / dev server' },
  typescript: { layer: 'Tooling', role: '型別系統' },
  vitest: { layer: 'Tooling', role: '測試框架' },
  jest: { layer: 'Tooling', role: '測試框架' },
  playwright: { layer: 'Tooling', role: 'E2E 測試' },
  eslint: { layer: 'Tooling', role: 'Lint' },
  prettier: { layer: 'Tooling', role: 'Formatter' },
  webpack: { layer: 'Tooling', role: 'Bundler' },
  rollup: { layer: 'Tooling', role: 'Bundler' },
  esbuild: { layer: 'Tooling', role: 'Bundler / transpiler' },

  // Validation / utilities
  zod: { layer: 'Tooling', role: 'Runtime schema 驗證' },
  yaml: { layer: 'Tooling', role: 'YAML parser' },
  commander: { layer: 'Tooling', role: 'CLI 框架' },
}
