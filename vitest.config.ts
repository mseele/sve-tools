import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vitest/config'
import vueRouter from 'vue-router/vite'

export default defineConfig({
  plugins: [vue(), vueRouter(), components()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.ts'],
    setupFiles: ['vitest.setup.ts']
  }
})
