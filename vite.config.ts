import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { specbookContentPlugin } from './src/plugins/content-hmr'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    specbookContentPlugin(resolve(__dirname, 'examples/taskflow')),
  ],
})
